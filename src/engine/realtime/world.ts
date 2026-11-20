/**
 * Simulação do mundo em tempo real: movimento em grade, perseguição, ataques,
 * habilidades, status por segundo, renascimento e névoa.
 *
 * `stepWorld` altera o `WorldState` recebido (por desempenho, ~20 passos por
 * segundo). Quem quiser preservar um estado deve copiá-lo antes (structuredClone).
 * Nada aqui usa Math.random nem o relógio: tudo vem da semente e dos comandos.
 */
import { createRng, restoreRng } from '../core/index.ts';
import type { Rng } from '../core/index.ts';
import type { EnemyActionDef, EnemyDef, GameContent, MapDef } from '../definitions.ts';
import type { Effect, EffectHost, EffectSource, TargetSpec } from '../effects/effects.ts';
import { runEffects } from '../effects/effects.ts';
import type { HunterProfile } from '../hunter/stats.ts';
import { addStatus, tickSecond } from '../statuses/statuses.ts';
import { rollItem } from '../items/items.ts';
import { computeHit } from '../autobattle/damage.ts';
import { phaseActions } from '../autobattle/ai.ts';
import type { WorldMap } from '../world/map.ts';
import { chebyshev, gateAt, isWalkable, objectAt, parseMap } from '../world/map.ts';
import { hasLineOfSight } from '../world/los.ts';
import { DIRECOES, canStep, findPath } from '../world/path.ts';
import type { RtActor, RtEvent, RtInput, WorldState } from './state.ts';
import { HEROI } from './state.ts';

/** Multiplicadores do chefe de um mapa. */
const CHEFE = { vida: 7, ataque: 1.6, recompensa: 8 };
/** Chefes sofrem só 40% da lentidão de ritmo dos monstros comuns. */
const RITMO_CHEFE = 0.4;
/** Fúria final do chefe: abaixo desta fração de vida, ataca e anda mais rápido. */
const FURIA_FINAL = 0.25;
const RAIO_ALIADOS = 4;

const cacheMapas = new WeakMap<MapDef, WorldMap>();
export function loadMap(def: MapDef): WorldMap {
  let m = cacheMapas.get(def);
  if (!m) {
    m = parseMap(def.id, def.linhas, def.legenda);
    cacheMapas.set(def, m);
  }
  return m;
}

function mapDef(content: GameContent, id: string): MapDef {
  const d = content.mapas[id];
  if (!d) throw new Error(`Mapa desconhecido: ${id}`);
  return d;
}

function heroPasso(content: GameContent, velocidade: number): number {
  const w = content.mundo;
  return Math.max(w.passoMsMinimo, Math.round((w.passoMsCacador * 100) / velocidade));
}

function attackInterval(content: GameContent, velocidade: number): number {
  const c = content.progressao.combate;
  return Math.round((c.cargaParaAgir * c.tickMs) / velocidade);
}

function baseActor(
  uid: string,
  x: number,
  y: number,
): Omit<
  RtActor,
  | 'defId'
  | 'nome'
  | 'lado'
  | 'vida'
  | 'vidaMax'
  | 'ataque'
  | 'velocidade'
  | 'reducao'
  | 'critico'
  | 'danoCritico'
  | 'passoMs'
  | 'atkIntervalo'
  | 'alcance'
  | 'xp'
  | 'ouro'
  | 'chefe'
  | 'invocado'
> {
  return {
    uid,
    bloqueio: 0,
    status: {},
    carga: 0,
    intencao: null,
    cicloIndice: 0,
    especialUsado: false,
    x,
    y,
    deX: x,
    deY: y,
    moverRestante: 0,
    moverTotal: 0,
    atkCd: 0,
    alvo: null,
    caminho: [],
    recalcular: 0,
    origemX: x,
    origemY: y,
    agressivo: false,
    renascer: -1,
    preparo: null,
    interagir: null,
  };
}

/** Cria o mundo de um mapa, com o caçador no início (ou no ponto indicado). */
export function createWorld(
  content: GameContent,
  mapaId: string,
  perfil: HunterProfile,
  semente: number,
  vidaAtual?: number,
): WorldState {
  const def = mapDef(content, mapaId);
  const m = loadMap(def);
  const portal = def.portal ? content.portais[def.portal] : undefined;
  const escala = portal?.escala ?? { vida: 1, ataque: 1 };
  const s = perfil.stats;
  const heroi: RtActor = {
    ...baseActor(HEROI, m.inicio.x, m.inicio.y),
    defId: 'cacador',
    nome: perfil.nome,
    lado: 'cacador',
    vida: Math.min(s.vidaMax, vidaAtual ?? s.vidaMax),
    vidaMax: s.vidaMax,
    ataque: s.ataque,
    velocidade: s.velocidade,
    reducao: s.reducao,
    critico: s.critico,
    danoCritico: s.danoCritico,
    passoMs: heroPasso(content, s.velocidade),
    atkIntervalo: attackInterval(content, s.velocidade),
    alcance: s.alcance,
    xp: 0,
    ouro: 0,
    chefe: false,
    invocado: false,
  };
  const w: WorldState = {
    mapa: mapaId,
    t: 0,
    rngState: createRng(semente).getState(),
    atores: [heroi],
    proximoId: 1,
    revelado: new Array<number>(m.largura * m.altura).fill(0),
    recargas: Object.fromEntries(perfil.habilidades.map((h) => [h.def.id, 0])),
    heroiCaido: false,
    chefeDerrotado: false,
    chao: [],
    abertos: [],
    recargaPocao: 0,
  };
  for (const sp of m.spawns) {
    const e = content.inimigos[sp.defId];
    if (!e) throw new Error(`Mapa ${mapaId}: inimigo desconhecido ${sp.defId}`);
    const mult = sp.chefe ? { ...CHEFE, ...def.chefe } : { vida: 1, ataque: 1, recompensa: 1 };
    w.atores.push(
      monsterActor(content, `m${w.proximoId++}`, e, sp.x, sp.y, escala, mult, sp.chefe),
    );
  }
  reveal(w, m, heroi, content.mundo.raioRevelado);
  return w;
}

function monsterActor(
  content: GameContent,
  uid: string,
  e: EnemyDef,
  x: number,
  y: number,
  escala: { vida: number; ataque: number },
  mult: { vida: number; ataque: number; recompensa: number },
  chefe: boolean,
): RtActor {
  const vidaMax = Math.round(e.vidaMax * escala.vida * mult.vida);
  return {
    ...baseActor(uid, x, y),
    defId: e.id,
    nome: chefe ? `${e.nome} (chefe)` : e.nome,
    lado: 'inimigo',
    vida: vidaMax,
    vidaMax,
    ataque: e.ataque * escala.ataque * mult.ataque,
    velocidade: e.velocidade,
    reducao: 0,
    critico: 0,
    danoCritico: 1,
    passoMs: e.passoMs ?? 450,
    atkIntervalo: Math.round(
      attackInterval(content, e.velocidade) *
        (chefe ? 1 + (content.mundo.ritmoMonstros - 1) * RITMO_CHEFE : content.mundo.ritmoMonstros),
    ),
    alcance: e.alcance ?? 1,
    xp: Math.round(e.xp * escala.vida * mult.recompensa),
    ouro: Math.round(e.ouro * escala.vida * mult.recompensa),
    chefe,
    invocado: false,
  };
}

/**
 * Atualiza o caçador quando o perfil muda no meio do mapa (subiu de level,
 * trocou habilidades). A vida perdida continua perdida.
 */
export function applyProfile(w: WorldState, content: GameContent, perfil: HunterProfile): void {
  const h = w.atores.find((a) => a.uid === HEROI);
  if (!h) return;
  const s = perfil.stats;
  const perdida = h.vidaMax - h.vida;
  h.nome = perfil.nome;
  h.vidaMax = s.vidaMax;
  h.vida = h.vida > 0 ? Math.max(1, s.vidaMax - perdida) : 0;
  h.ataque = s.ataque;
  h.velocidade = s.velocidade;
  h.reducao = s.reducao;
  h.critico = s.critico;
  h.danoCritico = s.danoCritico;
  h.passoMs = heroPasso(content, s.velocidade);
  h.atkIntervalo = attackInterval(content, s.velocidade);
  h.alcance = s.alcance;
  for (const hab of perfil.habilidades) w.recargas[hab.def.id] ??= 0;
}

function reveal(w: WorldState, m: WorldMap, h: RtActor, raio: number): void {
  for (let y = h.y - raio; y <= h.y + raio; y++) {
    for (let x = h.x - raio; x <= h.x + raio; x++) {
      if (x < 0 || y < 0 || x >= m.largura || y >= m.altura) continue;
      if ((x - h.x) ** 2 + (y - h.y) ** 2 <= raio * raio + 1) w.revelado[y * m.largura + x] = 1;
    }
  }
}

/* ------------------------------------------------------------------ */

interface StepCtx {
  w: WorldState;
  m: WorldMap;
  content: GameContent;
  perfil: HunterProfile;
  rng: Rng;
  eventos: RtEvent[];
  heroi: RtActor;
}

function emit(
  ctx: StepCtx,
  e: RtEvent extends infer E ? (E extends RtEvent ? Omit<E, 't'> : never) : never,
): void {
  ctx.eventos.push({ ...e, t: ctx.w.t } as RtEvent);
}

const vivo = (a: RtActor) => a.vida > 0;

function occupiedBy(ctx: StepCtx, self: RtActor) {
  return (x: number, y: number) =>
    ctx.w.atores.some((a) => a !== self && vivo(a) && a.x === x && a.y === y);
}

function monstersNear(ctx: StepCtx, x: number, y: number, raio: number): RtActor[] {
  return ctx.w.atores.filter(
    (a) => a.lado === 'inimigo' && vivo(a) && chebyshev(a.x, a.y, x, y) <= raio,
  );
}

function onDeath(ctx: StepCtx, a: RtActor): void {
  if (a.uid === HEROI) {
    if (!ctx.w.heroiCaido) {
      ctx.w.heroiCaido = true;
      emit(ctx, { tipo: 'heroiCaiu' });
    }
    return;
  }
  a.agressivo = false;
  a.preparo = null;
  a.caminho = [];
  a.status = {};
  a.bloqueio = 0;
  a.renascer = a.chefe || a.invocado ? -1 : ctx.content.mundo.renascerS * 1000;
  if (a.chefe) ctx.w.chefeDerrotado = true;
  dropLoot(ctx, a);
  if (ctx.heroi.alvo === a.uid) ctx.heroi.alvo = null;
  emit(ctx, { tipo: 'abate', alvo: a.uid, defId: a.defId, xp: a.xp, ouro: a.ouro, chefe: a.chefe });
  // O chefe caiu: o que ele invocou se desfaz (sem recompensa).
  if (a.chefe) {
    for (const o of ctx.w.atores) {
      if (!o.invocado || !vivo(o)) continue;
      o.vida = 0;
      o.agressivo = false;
      o.preparo = null;
      o.renascer = -1;
      if (ctx.heroi.alvo === o.uid) ctx.heroi.alvo = null;
      emit(ctx, { tipo: 'desfeito', alvo: o.uid });
    }
  }
}

/** Fases de chefe: dispara as que a vida já ultrapassou. */
function checkPhases(ctx: StepCtx, host: EffectHost<RtActor>, a: RtActor): void {
  const def = enemyDef(ctx, a);
  const fases = def.fases ?? [];
  while (vivo(a) && (a.fase ?? 0) < fases.length) {
    const f = fases[a.fase ?? 0];
    if (!f || a.vida / a.vidaMax >= f.abaixoDe) break;
    a.fase = (a.fase ?? 0) + 1;
    emit(ctx, { tipo: 'especial', origem: a.uid, anuncio: f.anuncio });
    if (f.efeitos) runEffects(host, f.efeitos, { unidade: a, fonte: 'especial' });
    for (const id of f.invocar ?? []) summon(ctx, a, id);
    if (f.escudoAjudantes && (f.invocar ?? []).length > 0) a.blindado = true;
    if (f.acoes) {
      a.acoesFase = f.acoes;
      a.cicloIndice = 0;
      if (!a.preparo) chooseIntent(ctx, a);
    }
  }
  if (a.blindado && !ctx.w.atores.some((o) => o.invocado && vivo(o))) {
    a.blindado = false;
    emit(ctx, { tipo: 'especial', origem: a.uid, anuncio: `O escudo de ${def.nome} se parte!` });
  }
  if (vivo(a) && a.chefe && !a.furiaFinal && a.vida / a.vidaMax < FURIA_FINAL) {
    a.furiaFinal = true;
    a.atkIntervalo = Math.round(a.atkIntervalo * 0.75);
    a.passoMs = Math.round(a.passoMs * 0.85);
    emit(ctx, { tipo: 'especial', origem: a.uid, anuncio: `${def.nome} entra em fúria final!` });
  }
}

/** Põe um ajudante do chefe num tile livre perto dele, já na luta. */
function summon(ctx: StepCtx, chefe: RtActor, defId: string): void {
  const e = ctx.content.inimigos[defId];
  if (!e) return;
  const livre = occupiedBy(ctx, chefe);
  let lugar: [number, number] | undefined;
  for (let r = 1; r <= 3 && !lugar; r++) {
    for (let dy = -r; dy <= r && !lugar; dy++) {
      for (let dx = -r; dx <= r && !lugar; dx++) {
        const x = chefe.x + dx;
        const y = chefe.y + dy;
        if (chebyshev(x, y, chefe.x, chefe.y) !== r) continue;
        if (!isWalkable(ctx.m, x, y) || livre(x, y) || (x === chefe.x && y === chefe.y)) continue;
        if (!hasLineOfSight(ctx.m, chefe.x, chefe.y, x, y)) continue;
        lugar = [x, y];
      }
    }
  }
  if (!lugar) return;
  const portal = ctx.content.mapas[ctx.w.mapa]?.portal;
  const escala = (portal && ctx.content.portais[portal]?.escala) || { vida: 1, ataque: 1 };
  const novo = monsterActor(
    ctx.content,
    `m${ctx.w.proximoId++}`,
    e,
    lugar[0],
    lugar[1],
    escala,
    { vida: 1, ataque: 1, recompensa: 0.5 },
    false,
  );
  novo.invocado = true;
  novo.agressivo = true;
  novo.renascer = -1;
  ctx.w.atores.push(novo);
  emit(ctx, { tipo: 'invocado', alvo: novo.uid, defId, x: novo.x, y: novo.y });
}

function dropLoot(ctx: StepCtx, a: RtActor): void {
  const portal = ctx.content.mapas[ctx.w.mapa]?.portal;
  if (!portal) return;
  if (!a.chefe && ctx.rng.next() >= ctx.content.itens.chanceDeSaque) return;
  const id = `c${ctx.w.proximoId++}`;
  const item = rollItem(ctx.content, portal, ctx.rng, id, a.chefe ? 'incomum' : 'comum');
  if (!item) return;
  ctx.w.chao.push({ id, item, x: a.x, y: a.y });
  emit(ctx, { tipo: 'saque', id, x: a.x, y: a.y });
}

/** Tira um item do chão (a interface chama depois de guardar na mochila). */
export function takeGroundItem(w: WorldState, id: string): void {
  w.chao = w.chao.filter((g) => g.id !== id);
}

/** Um monstro entra na luta e chama o grupo dele (origens próximas). */
function provoke(ctx: StepCtx, a: RtActor): void {
  const raio = ctx.content.mundo.raioGrupo;
  for (const o of ctx.w.atores) {
    if (o.lado !== 'inimigo' || !vivo(o) || o.agressivo) continue;
    if (o === a || chebyshev(o.origemX, o.origemY, a.origemX, a.origemY) <= raio)
      o.agressivo = true;
  }
}

function createHost(ctx: StepCtx): EffectHost<RtActor> {
  return {
    isOver: () => ctx.w.heroiCaido,
    resolveTargets(alvo: TargetSpec, origem: EffectSource<RtActor>): RtActor[] {
      const u = origem.unidade;
      switch (alvo) {
        case 'alvo':
          return origem.alvo && vivo(origem.alvo) ? [origem.alvo] : [];
        case 'proprio':
          return vivo(u) ? [u] : [];
        case 'inimigos':
          // O caçador acerta os monstros em volta; um monstro acerta o caçador.
          return u.lado === 'cacador'
            ? monstersNear(ctx, u.x, u.y, ctx.content.habilidades[origem.fonte]?.raio ?? 1)
            : vivo(ctx.heroi)
              ? [ctx.heroi]
              : [];
        case 'aliados':
          return u.lado === 'cacador' ? [u] : monstersNear(ctx, u.x, u.y, RAIO_ALIADOS);
        case 'aliadoMaisFerido': {
          const lista = u.lado === 'cacador' ? [u] : monstersNear(ctx, u.x, u.y, RAIO_ALIADOS);
          let melhor: RtActor | undefined;
          for (const a of lista)
            if (!melhor || a.vida / a.vidaMax < melhor.vida / melhor.vidaMax) melhor = a;
          return melhor ? [melhor] : [];
        }
      }
    },
    dealDamage(origem, alvo, mult) {
      const atk = origem.unidade;
      const critico = atk.critico > 0 && ctx.rng.next() < atk.critico;
      const valor = computeHit(atk, alvo, mult, critico);
      // Chefe blindado pelos ajudantes: o golpe para no escudo.
      const bloqueado = alvo.blindado ? valor : Math.min(alvo.bloqueio, valor);
      if (!alvo.blindado) alvo.bloqueio -= bloqueado;
      const perda = Math.min(alvo.vida, valor - bloqueado);
      alvo.vida -= perda;
      emit(ctx, {
        tipo: 'dano',
        origem: atk.uid,
        alvo: alvo.uid,
        valor: perda,
        bloqueado,
        critico,
      });
      // Roubo de vida dos itens.
      const roubo = atk.uid === HEROI ? Math.round(perda * ctx.perfil.stats.rouboVida) : 0;
      if (roubo > 0 && vivo(atk) && atk.vida < atk.vidaMax) {
        const ganho = Math.min(roubo, atk.vidaMax - atk.vida);
        atk.vida += ganho;
        emit(ctx, { tipo: 'cura', alvo: atk.uid, valor: ganho });
      }
      if (alvo.lado === 'inimigo' && !alvo.agressivo) provoke(ctx, alvo);
      // Quem apanha sem alvo revida contra quem bateu.
      if (alvo.uid === HEROI && !alvo.alvo && atk.lado === 'inimigo') alvo.alvo = atk.uid;
      if (alvo.vida === 0) onDeath(ctx, alvo);
    },
    gainBlock(alvo, valor) {
      if (valor <= 0) return;
      alvo.bloqueio += valor;
      emit(ctx, { tipo: 'bloqueio', alvo: alvo.uid, valor });
    },
    heal(alvo, valor) {
      const ganho = Math.min(valor, alvo.vidaMax - alvo.vida);
      if (ganho <= 0) return;
      alvo.vida += ganho;
      emit(ctx, { tipo: 'cura', alvo: alvo.uid, valor: ganho });
    },
    applyStatus(alvo, status, valor) {
      addStatus(alvo.status, status, valor);
      emit(ctx, { tipo: 'status', alvo: alvo.uid, status, valor });
    },
    clearStatus(alvo, status) {
      if (!alvo.status[status]) return;
      delete alvo.status[status];
      emit(ctx, { tipo: 'limpar', alvo: alvo.uid, status });
    },
  };
}

/* ---------- Movimento ---------- */

function stepTo(ctx: StepCtx, a: RtActor, dx: number, dy: number): boolean {
  if (!canStep(ctx.m, a.x, a.y, dx, dy, occupiedBy(ctx, a))) return false;
  a.deX = a.x;
  a.deY = a.y;
  a.x += dx;
  a.y += dy;
  a.moverTotal = Math.round(a.passoMs * (dx !== 0 && dy !== 0 ? 1.41 : 1));
  a.moverRestante = a.moverTotal;
  return true;
}

function followPath(ctx: StepCtx, a: RtActor): boolean {
  const prox = a.caminho[0];
  if (!prox) return false;
  if (stepTo(ctx, a, prox[0] - a.x, prox[1] - a.y)) {
    a.caminho.shift();
    return true;
  }
  a.caminho = [];
  return false;
}

function pathTowards(ctx: StepCtx, a: RtActor, tx: number, ty: number, parar: number): void {
  // O caçador pode atravessar o mapa inteiro; monstros procuram perto.
  const limite = a.uid === HEROI ? ctx.m.largura * ctx.m.altura * 2 : 1500;
  let p = findPath(ctx.m, a.x, a.y, tx, ty, { ocupado: occupiedBy(ctx, a), parar, limite });
  // Caminho bloqueado por alguém num corredor: o caçador vai até lá mesmo assim.
  if (!p && a.uid === HEROI) p = findPath(ctx.m, a.x, a.y, tx, ty, { parar, limite });
  a.caminho = p ?? [];
}

/* ---------- Caçador ---------- */

function inRange(ctx: StepCtx, a: RtActor, b: RtActor, alcance: number): boolean {
  return chebyshev(a.x, a.y, b.x, b.y) <= alcance && hasLineOfSight(ctx.m, a.x, a.y, b.x, b.y);
}

function useAbility(ctx: StepCtx, host: EffectHost<RtActor>, slot: number): void {
  const h = ctx.heroi;
  const hab = ctx.perfil.habilidades[slot];
  if (!hab) return;
  if ((ctx.w.recargas[hab.def.id] ?? 0) > 0) return;
  const alvo = ctx.w.atores.find((a) => a.uid === h.alvo && vivo(a));
  const precisaAlvo = hab.def.efeitos.some((e) => e.alvo === 'alvo');
  if (precisaAlvo && (!alvo || !inRange(ctx, h, alvo, h.alcance))) {
    emit(ctx, {
      tipo: 'aviso',
      texto: alvo ? 'Alvo fora de alcance.' : 'Escolha um alvo primeiro.',
    });
    return;
  }
  if (
    hab.def.efeitos.some((e) => e.alvo === 'inimigos') &&
    monstersNear(ctx, h.x, h.y, hab.def.raio ?? 1).length === 0
  ) {
    emit(ctx, { tipo: 'aviso', texto: 'Nenhum inimigo por perto.' });
    return;
  }
  ctx.w.recargas[hab.def.id] = hab.recargaMs;
  emit(ctx, { tipo: 'habilidade', origem: h.uid, id: hab.def.id, nome: hab.def.nome });
  runEffects(host, hab.def.efeitos, { unidade: h, fonte: hab.def.id, alvo }, hab.escala);
}

function drinkPotion(ctx: StepCtx): void {
  const h = ctx.heroi;
  const p = ctx.content.itens.pocao;
  if (ctx.w.recargaPocao > 0) {
    emit(ctx, { tipo: 'aviso', texto: 'A poção ainda está em recarga.' });
    return;
  }
  const cura = Math.min(Math.round(h.vidaMax * p.curaPct), h.vidaMax - h.vida);
  if (cura <= 0) {
    emit(ctx, { tipo: 'aviso', texto: 'Sua vida já está cheia.' });
    return;
  }
  h.vida += cura;
  ctx.w.recargaPocao = p.recargaS * 1000;
  emit(ctx, { tipo: 'pocao', cura });
  emit(ctx, { tipo: 'cura', alvo: h.uid, valor: cura });
}

function interact(ctx: StepCtx, idx: number, x: number, y: number): void {
  const objeto = ctx.m.objetos[idx];
  if (!objeto) return;
  if (objeto !== 'tesouro') {
    emit(ctx, { tipo: 'interagir', objeto, x, y });
    return;
  }
  if (ctx.w.abertos.includes(idx)) {
    emit(ctx, { tipo: 'aviso', texto: 'Este baú já está vazio.' });
    return;
  }
  ctx.w.abertos.push(idx);
  const portal = ctx.content.mapas[ctx.w.mapa]?.portal;
  const h = ctx.heroi;
  const id = `c${ctx.w.proximoId++}`;
  const item = portal ? rollItem(ctx.content, portal, ctx.rng, id, 'incomum') : undefined;
  emit(ctx, { tipo: 'interagir', objeto, x, y });
  if (!item) return;
  ctx.w.chao.push({ id, item, x: h.x, y: h.y });
  emit(ctx, { tipo: 'saque', id, x: h.x, y: h.y });
  emit(ctx, { tipo: 'itemNoChao', ids: [id] });
}

function heroStep(ctx: StepCtx, host: EffectHost<RtActor>, input: RtInput, dt: number): void {
  const h = ctx.heroi;
  const w = ctx.w;
  if (input.alvo !== undefined) {
    const alvo =
      input.alvo === null
        ? undefined
        : w.atores.find((a) => a.uid === input.alvo && a.lado === 'inimigo' && vivo(a));
    h.alvo = alvo ? alvo.uid : null;
    if (alvo) {
      provoke(ctx, alvo);
      h.caminho = [];
      h.recalcular = 0;
    }
  }
  if (input.irPara) {
    const [tx, ty] = input.irPara;
    pathTowards(ctx, h, tx, ty, 0);
    h.alvo = input.alvo === undefined ? null : h.alvo;
    h.interagir = null;
  }
  if (input.interagir) {
    const [ox, oy] = input.interagir;
    if (objectAt(ctx.m, ox, oy)) {
      h.interagir = oy * ctx.m.largura + ox;
      h.alvo = null;
      pathTowards(ctx, h, ox, oy, 1);
    }
  }
  if (input.dir && (input.dir[0] !== 0 || input.dir[1] !== 0)) h.interagir = null;
  if (input.habilidade !== undefined) useAbility(ctx, host, input.habilidade);
  if (input.pocao) drinkPotion(ctx);

  h.moverRestante = Math.max(0, h.moverRestante - dt);
  h.recalcular -= dt;
  const alvo = w.atores.find((a) => a.uid === h.alvo && vivo(a));

  if (h.moverRestante <= 0) {
    let andou = false;
    if (input.dir && (input.dir[0] !== 0 || input.dir[1] !== 0)) {
      const [dx, dy] = input.dir;
      h.caminho = [];
      andou =
        stepTo(ctx, h, dx, dy) ||
        (dx !== 0 && dy !== 0 && (stepTo(ctx, h, dx, 0) || stepTo(ctx, h, 0, dy)));
    } else if (h.caminho.length > 0) {
      andou = followPath(ctx, h);
    } else if (alvo && !inRange(ctx, h, alvo, h.alcance) && h.recalcular <= 0) {
      h.recalcular = 300;
      // Perto o bastante mas sem linha de visão (parede no meio): chega mais perto.
      const semVisao = chebyshev(h.x, h.y, alvo.x, alvo.y) <= h.alcance;
      pathTowards(ctx, h, alvo.x, alvo.y, semVisao ? 1 : h.alcance);
      andou = followPath(ctx, h);
    }
    if (andou) {
      reveal(w, ctx.m, h, ctx.content.mundo.raioRevelado);
      const g = gateAt(ctx.m, h.x, h.y);
      if (g) emit(ctx, { tipo: 'portao', destino: g.destino, rotulo: g.rotulo });
      const aqui = w.chao.filter((c) => c.x === h.x && c.y === h.y).map((c) => c.id);
      if (aqui.length > 0) emit(ctx, { tipo: 'itemNoChao', ids: aqui });
    }
  }

  if (h.interagir !== null && h.moverRestante <= 0 && h.caminho.length === 0) {
    const idx = h.interagir;
    const ox = idx % ctx.m.largura;
    const oy = (idx - ox) / ctx.m.largura;
    h.interagir = null;
    if (chebyshev(h.x, h.y, ox, oy) <= 1) interact(ctx, idx, ox, oy);
  }

  h.atkCd = Math.max(0, h.atkCd - dt);
  if (alvo && h.atkCd <= 0 && inRange(ctx, h, alvo, h.alcance)) {
    h.atkCd = h.atkIntervalo;
    emit(ctx, {
      tipo: 'ataque',
      origem: h.uid,
      alvo: alvo.uid,
      distancia: chebyshev(h.x, h.y, alvo.x, alvo.y),
    });
    const basico = ctx.content.progressao.ataqueBasico;
    const veneno = ctx.perfil.stats.venenoAoAcertar;
    const efeitos: Effect[] = [{ tipo: 'dano', mult: basico.mult, alvo: 'alvo' }];
    if (veneno > 0) efeitos.push({ tipo: 'status', status: 'veneno', valor: veneno, alvo: 'alvo' });
    runEffects(host, efeitos, { unidade: h, fonte: 'basico', alvo });
  }
}

/* ---------- Monstros ---------- */

const COMO_CHEFE = new WeakMap<EnemyDef, EnemyDef>();

/** Definição que vale para este ator: a de chefe soma as ações e fases de `comoChefe`. */
export function actorEnemyDef(
  content: GameContent,
  a: { defId: string; chefe: boolean },
): EnemyDef {
  const def = content.inimigos[a.defId] as EnemyDef;
  if (!a.chefe || !def.comoChefe) return def;
  let d = COMO_CHEFE.get(def);
  if (!d) {
    const c = def.comoChefe;
    d = {
      ...def,
      acoes: [...def.acoes, ...(c.acoes ?? [])],
      padrao: c.padrao ?? def.padrao,
      fases: c.fases ?? def.fases ?? [],
    };
    COMO_CHEFE.set(def, d);
  }
  return d;
}

function enemyDef(ctx: StepCtx, a: RtActor): EnemyDef {
  return actorEnemyDef(ctx.content, a);
}

function chooseIntent(ctx: StepCtx, a: RtActor): EnemyActionDef {
  const def = enemyDef(ctx, a);
  const temAliados = monstersNear(ctx, a.x, a.y, RAIO_ALIADOS).some((o) => o !== a);
  const ok = (x: EnemyActionDef) => !x.soEncadeada && (!x.requerAliados || temAliados);
  const acoes = phaseActions(def, a.acoesFase);
  let acao: EnemyActionDef | undefined;
  if (def.padrao === 'ciclo') {
    for (let i = 0; i < acoes.length && !acao; i++) {
      const c = acoes[(a.cicloIndice + i) % acoes.length] as EnemyActionDef;
      if (ok(c)) {
        acao = c;
        a.cicloIndice = (a.cicloIndice + i + 1) % acoes.length;
      }
    }
  } else {
    const opcoes = acoes.filter(ok);
    const total = opcoes.reduce((s, x) => s + (x.peso ?? 1), 0);
    let r = ctx.rng.next() * total;
    for (const x of opcoes) {
      r -= x.peso ?? 1;
      if (r < 0) {
        acao = x;
        break;
      }
    }
  }
  const escolhida = acao ?? (acoes[0] as EnemyActionDef);
  a.intencao = escolhida.id;
  return escolhida;
}

/** Tiles atingidos por um golpe forte, conforme a forma da área. */
export function strikeTiles(
  m: WorldMap,
  a: { x: number; y: number },
  h: { x: number; y: number },
  acao: EnemyActionDef,
  rng?: { next(): number },
): Array<[number, number]> {
  const r = acao.area ?? 0;
  const tiles: Array<[number, number]> = [];
  const visto = new Set<number>();
  const add = (x: number, y: number) => {
    const i = y * m.largura + x;
    if (visto.has(i) || !isWalkable(m, x, y)) return;
    visto.add(i);
    tiles.push([x, y]);
  };
  const forma = acao.forma ?? 'alvo';
  const raios = (dirs: ReadonlyArray<readonly [number, number]>) => {
    for (const [dx, dy] of dirs) {
      for (let k = 1; k <= r; k++) {
        const x = a.x + dx * k;
        const y = a.y + dy * k;
        if (!isWalkable(m, x, y)) break;
        add(x, y);
      }
    }
  };
  if (forma === 'cruz') {
    raios([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]);
    return tiles;
  }
  if (forma === 'xis') {
    raios([
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]);
    return tiles;
  }
  if (forma === 'linha') {
    const dx = Math.sign(h.x - a.x);
    const dy = Math.sign(h.y - a.y);
    if (dx === 0 && dy === 0) return tiles;
    for (let k = 1; k <= r; k++) {
      const x = a.x + dx * k;
      const y = a.y + dy * k;
      if (!isWalkable(m, x, y)) break;
      add(x, y);
      add(x - dy, y + dx);
      add(x + dy, y - dx);
    }
    return tiles;
  }
  if (forma === 'chuva') {
    const cruzinha = (cx: number, cy: number) => {
      add(cx, cy);
      add(cx + 1, cy);
      add(cx - 1, cy);
      add(cx, cy + 1);
      add(cx, cy - 1);
    };
    cruzinha(h.x, h.y);
    const n = acao.quantidade ?? 6;
    const sorte = rng ?? { next: () => 0.5 };
    for (let i = 0; i < n; i++) {
      const cx = h.x + Math.round((sorte.next() * 2 - 1) * r);
      const cy = h.y + Math.round((sorte.next() * 2 - 1) * r);
      cruzinha(cx, cy);
    }
    return tiles;
  }
  const c = forma === 'alvo' ? h : a;
  const minimo = acao.raioMin ?? (forma === 'anel' ? 2 : 0);
  for (let y = c.y - r; y <= c.y + r; y++) {
    for (let x = c.x - r; x <= c.x + r; x++) {
      if (!isWalkable(m, x, y)) continue;
      if (forma !== 'alvo' && x === a.x && y === a.y) continue;
      if (chebyshev(x, y, c.x, c.y) < minimo) continue;
      if (forma !== 'alvo' && !hasLineOfSight(m, a.x, a.y, x, y)) continue;
      add(x, y);
    }
  }
  return tiles;
}

function startPrepare(ctx: StepCtx, a: RtActor, acao: EnemyActionDef): void {
  const tiles = strikeTiles(ctx.m, a, ctx.heroi, acao, ctx.rng);
  const total = acao.preparoMs ?? ctx.content.mundo.preparoForteMs;
  a.preparo = { acao: acao.id, restante: total, total, tiles };
  emit(ctx, { tipo: 'preparo', origem: a.uid, nome: acao.nome, tiles });
}

function strikePrepared(ctx: StepCtx, host: EffectHost<RtActor>, a: RtActor): void {
  const p = a.preparo;
  a.preparo = null;
  if (!p) return;
  const h = ctx.heroi;
  const acao = enemyDef(ctx, a).acoes.find((x) => x.id === p.acao);
  a.atkCd = a.atkIntervalo;
  if (!acao) return;
  const dentro = p.tiles.some(([x, y]) => x === h.x && y === h.y);
  emit(ctx, {
    tipo: 'ataque',
    origem: a.uid,
    alvo: h.uid,
    distancia: chebyshev(a.x, a.y, h.x, h.y),
  });
  // Fora da área: os efeitos que acertariam o caçador não acontecem.
  const efeitos = dentro
    ? acao.efeitos
    : acao.efeitos.filter((e) => e.alvo !== 'alvo' && e.alvo !== 'inimigos');
  emit(ctx, { tipo: 'impacto', origem: a.uid, tiles: p.tiles });
  if (!dentro) emit(ctx, { tipo: 'esquiva', origem: a.uid, alvo: h.uid });
  runEffects(host, efeitos, { unidade: a, fonte: acao.id, alvo: h });
  if (!vivo(a)) return;
  // Golpes em sequência: a próxima área já aparece (ondas, X depois de cruz...).
  const seguinte = acao.seguinte
    ? enemyDef(ctx, a).acoes.find((x) => x.id === acao.seguinte)
    : undefined;
  if (seguinte && a.agressivo && vivo(h) && !ctx.w.heroiCaido) {
    a.intencao = seguinte.id;
    startPrepare(ctx, a, seguinte);
    return;
  }
  chooseIntent(ctx, a);
}

function monsterStep(ctx: StepCtx, host: EffectHost<RtActor>, a: RtActor, dt: number): void {
  const h = ctx.heroi;
  const mundo = ctx.content.mundo;
  if (!vivo(a)) {
    if (a.renascer < 0) return;
    a.renascer -= dt;
    if (
      a.renascer <= 0 &&
      chebyshev(h.x, h.y, a.origemX, a.origemY) > mundo.visaoMonstro &&
      !occupiedBy(ctx, a)(a.origemX, a.origemY)
    ) {
      a.vida = a.vidaMax;
      a.x = a.deX = a.origemX;
      a.y = a.deY = a.origemY;
      a.moverRestante = 0;
      a.renascer = -1;
      a.intencao = null;
      a.cicloIndice = 0;
      a.especialUsado = false;
      a.fase = 0;
      a.acoesFase = null;
      a.preparo = null;
      a.blindado = false;
      emit(ctx, { tipo: 'renasceu', alvo: a.uid });
    }
    return;
  }
  a.moverRestante = Math.max(0, a.moverRestante - dt);
  a.atkCd = Math.max(0, a.atkCd - dt);
  a.recalcular -= dt;

  const dist = chebyshev(a.x, a.y, h.x, h.y);
  const heroiVivo = vivo(h) && !ctx.w.heroiCaido;
  if (
    !a.agressivo &&
    heroiVivo &&
    dist <= mundo.visaoMonstro &&
    hasLineOfSight(ctx.m, a.x, a.y, h.x, h.y)
  ) {
    provoke(ctx, a);
  }
  if (a.agressivo && (!heroiVivo || chebyshev(a.x, a.y, a.origemX, a.origemY) > mundo.coleira)) {
    a.agressivo = false;
    a.preparo = null;
    a.intencao = null;
    pathTowards(ctx, a, a.origemX, a.origemY, 0);
  }

  if (a.agressivo) {
    if (!a.intencao) chooseIntent(ctx, a);
    // Especial (ex.: fúria) ao cair abaixo do limite de vida.
    const esp = enemyDef(ctx, a).especial;
    if (esp && !a.especialUsado && a.vida / a.vidaMax < esp.abaixoDe) {
      a.especialUsado = true;
      emit(ctx, { tipo: 'especial', origem: a.uid, anuncio: esp.anuncio });
      runEffects(host, esp.efeitos, { unidade: a, fonte: 'especial' });
    }
    checkPhases(ctx, host, a);
    // Golpe forte em preparo: fica parado e acerta a área avisada no fim.
    if (a.preparo) {
      a.preparo.restante -= dt;
      if (a.preparo.restante <= 0) strikePrepared(ctx, host, a);
      return;
    }
    const alcance = inRange(ctx, a, h, a.alcance);
    if (alcance && a.moverRestante <= 0) {
      // Atiradores recuam quando o caçador encosta.
      if (a.alcance > 1 && dist <= 1 && ctx.rng.next() < 0.4) {
        const fuga = DIRECOES.filter(([dx, dy]) => chebyshev(a.x + dx, a.y + dy, h.x, h.y) > 1);
        const d = fuga[Math.floor(ctx.rng.next() * fuga.length)];
        if (d && stepTo(ctx, a, d[0], d[1])) return;
      }
      if (a.atkCd <= 0) {
        const acao =
          enemyDef(ctx, a).acoes.find((x) => x.id === a.intencao) ?? chooseIntent(ctx, a);
        if (acao.forte) {
          startPrepare(ctx, a, acao);
          return;
        }
        a.atkCd = a.atkIntervalo;
        emit(ctx, { tipo: 'ataque', origem: a.uid, alvo: h.uid, distancia: dist });
        runEffects(host, acao.efeitos, { unidade: a, fonte: acao.id, alvo: h });
        if (vivo(a)) chooseIntent(ctx, a);
      }
      return;
    }
    if (!alcance && a.moverRestante <= 0) {
      if (a.recalcular <= 0 || a.caminho.length === 0) {
        a.recalcular = 400;
        pathTowards(ctx, a, h.x, h.y, a.alcance);
      }
      followPath(ctx, a);
    }
    return;
  }

  // Sem alvo: volta para casa ou passeia por perto.
  if (a.moverRestante > 0) return;
  if (a.caminho.length > 0) {
    followPath(ctx, a);
  } else if (ctx.rng.next() < 0.01) {
    const [dx, dy] = DIRECOES[Math.floor(ctx.rng.next() * DIRECOES.length)] as [number, number];
    if (chebyshev(a.x + dx, a.y + dy, a.origemX, a.origemY) <= 3) stepTo(ctx, a, dx, dy);
  }
}

/* ---------- Passo ---------- */

/** Avança o mundo um passo fixo. Altera `w` e devolve os eventos do passo. */
export function stepWorld(
  w: WorldState,
  content: GameContent,
  perfil: HunterProfile,
  input: RtInput = {},
): RtEvent[] {
  const dt = content.mundo.tickMs;
  const ctx: StepCtx = {
    w,
    m: loadMap(mapDef(content, w.mapa)),
    content,
    perfil,
    rng: restoreRng(w.rngState),
    eventos: [],
    heroi: w.atores.find((a) => a.uid === HEROI) as RtActor,
  };
  if (w.heroiCaido) return [];
  const host = createHost(ctx);
  const segundoAntes = Math.floor(w.t / 1000);
  w.t += dt;

  w.recargaPocao = Math.max(0, w.recargaPocao - dt);
  for (const id of Object.keys(w.recargas))
    w.recargas[id] = Math.max(0, (w.recargas[id] ?? 0) - dt);

  if (Math.floor(w.t / 1000) !== segundoAntes) {
    const decai = content.progressao.combate.decaimentoBloqueio;
    for (const a of w.atores) {
      if (!vivo(a)) continue;
      for (const { status, perda } of tickSecond(a.status)) {
        const valor = Math.min(a.vida, perda);
        if (valor <= 0) continue;
        a.vida -= valor;
        emit(ctx, { tipo: 'perdaDeVida', alvo: a.uid, valor, motivo: status });
        if (a.vida === 0) onDeath(ctx, a);
      }
      if (a.bloqueio > 0) a.bloqueio = Math.floor(a.bloqueio * (1 - decai));
    }
  }

  heroStep(ctx, host, input, dt);
  for (const a of w.atores) {
    if (w.heroiCaido) break;
    if (a.lado === 'inimigo') monsterStep(ctx, host, a, dt);
  }
  w.rngState = ctx.rng.getState();
  return ctx.eventos;
}
