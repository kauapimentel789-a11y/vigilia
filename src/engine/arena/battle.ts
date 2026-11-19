/**
 * Combate da Arena: dois tabuleiros de 2 fileiras × 4 colunas lutam sozinhos.
 *
 * Usa o mesmo sistema de efeitos e a mesma fórmula de dano da Caçada. Cada
 * unidade enche uma barra de ação com a velocidade (como no combate automático)
 * e ganha mana ao atacar e ao apanhar; com a mana cheia, usa a habilidade.
 *
 * Determinístico: mesma semente e mesmos tabuleiros, mesmo resultado. É isso que
 * vai permitir validar as lutas no servidor na Arena assíncrona.
 */
import { createRng } from '../core/index.ts';
import type { Rng } from '../core/index.ts';
import type { ArenaBonus, ArenaDef, GameContent, MarcaId } from '../definitions.ts';
import { MARCAS } from '../definitions.ts';
import type { EffectHost, EffectSource, TargetSpec } from '../effects/effects.ts';
import { runEffects } from '../effects/effects.ts';
import { computeHit } from '../autobattle/damage.ts';
import type { BattleUnit } from '../autobattle/state.ts';
import type { StatusId } from '../statuses/statuses.ts';
import { addStatus, tickSecond } from '../statuses/statuses.ts';

export interface ArenaUnitInst {
  uid: string;
  def: string;
  estrelas: number;
}

/** Um lado da luta: o tabuleiro (0 a 3 frente, 4 a 7 trás) e o Herói da Arena. */
export interface ArenaSide {
  tabuleiro: ReadonlyArray<ArenaUnitInst | null>;
  heroi: string;
}

export interface Fighter extends BattleUnit {
  lado: 'cacador' | 'inimigo';
  time: 0 | 1;
  pos: number;
  mana: number;
  alcance: number;
  rouboVida: number;
  queimadura: number;
  estrelas: number;
}

type Body =
  | { tipo: 'ataque'; origem: string; alvo: string }
  | { tipo: 'habilidade'; origem: string; nome: string }
  | { tipo: 'dano'; alvo: string; valor: number; bloqueado: number; critico: boolean }
  | { tipo: 'cura'; alvo: string; valor: number }
  | { tipo: 'bloqueio'; alvo: string; valor: number }
  | { tipo: 'status'; alvo: string; status: StatusId; valor: number }
  | { tipo: 'perdaDeVida'; alvo: string; valor: number; motivo: StatusId }
  | { tipo: 'caiu'; alvo: string };

export type ArenaEvent = Body & { t: number };

export interface ArenaFrame {
  t: number;
  /** Para cada unidade (na ordem de `unidades`): vida, bloqueio e mana. */
  u: Array<[number, number, number]>;
}

export interface ArenaBattleResult {
  /** 0 = primeiro lado, 1 = segundo, null = empate (tempo esgotado). */
  vencedor: 0 | 1 | null;
  /** Unidades vivas de cada lado no fim. */
  vivas: [number, number];
  duracaoMs: number;
  unidades: Array<{
    uid: string;
    def: string;
    nome: string;
    time: 0 | 1;
    pos: number;
    vidaMax: number;
    estrelas: number;
  }>;
  eventos: ArenaEvent[];
  quadros: ArenaFrame[];
}

/** Quantas unidades diferentes de cada marca há no tabuleiro. */
export function countMarcas(
  arena: ArenaDef,
  tabuleiro: ReadonlyArray<ArenaUnitInst | null>,
): Record<MarcaId, number> {
  const out = Object.fromEntries(MARCAS.map((m) => [m, 0])) as Record<MarcaId, number>;
  const vistos = new Set<string>();
  for (const u of tabuleiro) {
    if (!u || vistos.has(u.def)) continue;
    vistos.add(u.def);
    const def = arena.unidades[u.def];
    if (def) for (const m of def.marcas) out[m]++;
  }
  return out;
}

/** O nível ativo de cada marca (−1 = nenhum). */
export function activeMarcas(
  arena: ArenaDef,
  tabuleiro: ReadonlyArray<ArenaUnitInst | null>,
): Record<MarcaId, number> {
  const qtd = countMarcas(arena, tabuleiro);
  const out = {} as Record<MarcaId, number>;
  for (const m of MARCAS) {
    const niveis = arena.marcas[m].niveis;
    let ativo = -1;
    niveis.forEach((n, i) => {
      if (qtd[m] >= n.qtd) ativo = i;
    });
    out[m] = ativo;
  }
  return out;
}

function addBonus(a: ArenaBonus, b: ArenaBonus | undefined): ArenaBonus {
  if (!b) return a;
  const out: ArenaBonus = { ...a };
  for (const [k, v] of Object.entries(b) as Array<[keyof ArenaBonus, number]>) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

/** Monta as unidades de um lado com estrelas, marcas e herói aplicados. */
export function buildFighters(content: GameContent, lado: ArenaSide, time: 0 | 1): Fighter[] {
  const arena = content.arena;
  const ativos = activeMarcas(arena, lado.tabuleiro);
  let doTime: ArenaBonus = {};
  for (const m of MARCAS) {
    const nivel = arena.marcas[m].niveis[ativos[m]];
    if (nivel) doTime = addBonus(doTime, nivel.bonus);
  }
  const heroi = arena.herois[lado.heroi]?.efeito;
  doTime = addBonus(doTime, heroi?.bonus);
  const stats = content.progressao.stats;
  const out: Fighter[] = [];
  lado.tabuleiro.forEach((inst, pos) => {
    if (!inst) return;
    const def = arena.unidades[inst.def];
    if (!def) return;
    const b = pos < arena.regras.colunas ? addBonus(doTime, heroi?.bonusFrente) : doTime;
    const mult = arena.regras.multEstrela[inst.estrelas - 1] ?? 1;
    const vidaMax = Math.round(def.vida * mult * (1 + (b.vidaPct ?? 0)));
    out.push({
      uid: `${time}:${inst.uid}`,
      defId: def.id,
      nome: def.nome,
      lado: time === 0 ? 'cacador' : 'inimigo',
      time,
      pos,
      vida: vidaMax,
      vidaMax,
      bloqueio: Math.round(vidaMax * (b.bloqueioPct ?? 0)),
      status: {},
      ataque: def.ataque * mult * (1 + (b.ataquePct ?? 0)),
      velocidade: def.velocidade + (b.velocidade ?? 0),
      reducao: 0,
      critico: Math.min(0.75, stats.criticoBase + (b.critico ?? 0)),
      danoCritico: stats.danoCriticoBase + (b.danoCritico ?? 0),
      carga: 0,
      intencao: null,
      cicloIndice: 0,
      especialUsado: false,
      mana: Math.min(arena.regras.manaMax, b.manaInicial ?? 0),
      alcance: def.alcance,
      rouboVida: b.rouboVida ?? 0,
      queimadura: b.queimaduraAoAcertar ?? 0,
      estrelas: inst.estrelas,
    });
  });
  return out;
}

interface Ctx {
  content: GameContent;
  rng: Rng;
  t: number;
  todos: Fighter[];
  eventos: ArenaEvent[];
  registrar: boolean;
}

function emit(ctx: Ctx, e: Body): void {
  if (ctx.registrar) ctx.eventos.push({ ...e, t: ctx.t } as ArenaEvent);
}

const vivo = (f: Fighter) => f.vida > 0;
const coluna = (ctx: Ctx, pos: number) => pos % ctx.content.arena.regras.colunas;

/** Alvo: a fileira da frente inimiga primeiro, na coluna mais próxima. */
function chooseTarget(ctx: Ctx, f: Fighter): Fighter | undefined {
  const cols = ctx.content.arena.regras.colunas;
  const inimigos = ctx.todos.filter((o) => o.time !== f.time && vivo(o));
  const frente = inimigos.filter((o) => o.pos < cols);
  const lista = frente.length > 0 ? frente : inimigos;
  const minha = coluna(ctx, f.pos);
  let melhor: Fighter | undefined;
  let melhorD = Infinity;
  for (const o of lista) {
    const d = Math.abs(coluna(ctx, o.pos) - minha) * 10 + coluna(ctx, o.pos);
    if (d < melhorD) {
      melhor = o;
      melhorD = d;
    }
  }
  return melhor;
}

/** Corpo a corpo na fileira de trás só ataca quando a frente da mesma coluna cai. */
function blocked(ctx: Ctx, f: Fighter): boolean {
  const cols = ctx.content.arena.regras.colunas;
  if (f.alcance > 1 || f.pos < cols) return false;
  return ctx.todos.some((o) => o.time === f.time && vivo(o) && o.pos === f.pos - cols);
}

function onDamage(ctx: Ctx, alvo: Fighter, perda: number): void {
  if (perda > 0 && vivo(alvo)) {
    alvo.mana = Math.min(
      ctx.content.arena.regras.manaMax,
      alvo.mana + ctx.content.arena.regras.manaPorDano,
    );
  }
  if (alvo.vida === 0) emit(ctx, { tipo: 'caiu', alvo: alvo.uid });
}

function createHost(ctx: Ctx): EffectHost<Fighter> {
  const lado = (f: Fighter, meu: boolean) =>
    ctx.todos.filter((o) => vivo(o) && (o.time === f.time) === meu);
  return {
    isOver: () => false,
    resolveTargets(alvo: TargetSpec, origem: EffectSource<Fighter>): Fighter[] {
      const u = origem.unidade;
      switch (alvo) {
        case 'alvo':
          return origem.alvo && vivo(origem.alvo) ? [origem.alvo] : [];
        case 'proprio':
          return vivo(u) ? [u] : [];
        case 'inimigos':
          return lado(u, false);
        case 'aliados':
          return lado(u, true);
        case 'aliadoMaisFerido': {
          let melhor: Fighter | undefined;
          for (const a of lado(u, true))
            if (!melhor || a.vida / a.vidaMax < melhor.vida / melhor.vidaMax) melhor = a;
          return melhor ? [melhor] : [];
        }
      }
    },
    dealDamage(origem, alvo, mult) {
      const atk = origem.unidade;
      const critico = ctx.rng.next() < atk.critico;
      const valor = computeHit(atk, alvo, mult, critico);
      const bloqueado = Math.min(alvo.bloqueio, valor);
      alvo.bloqueio -= bloqueado;
      const perda = Math.min(alvo.vida, valor - bloqueado);
      alvo.vida -= perda;
      emit(ctx, { tipo: 'dano', alvo: alvo.uid, valor: perda, bloqueado, critico });
      if (atk.rouboVida > 0 && vivo(atk) && perda > 0) {
        const ganho = Math.min(Math.round(perda * atk.rouboVida), atk.vidaMax - atk.vida);
        if (ganho > 0) {
          atk.vida += ganho;
          emit(ctx, { tipo: 'cura', alvo: atk.uid, valor: ganho });
        }
      }
      onDamage(ctx, alvo, perda);
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
      delete alvo.status[status];
    },
  };
}

function act(ctx: Ctx, host: EffectHost<Fighter>, f: Fighter): void {
  if (blocked(ctx, f)) return;
  const alvo = chooseTarget(ctx, f);
  if (!alvo) return;
  const regras = ctx.content.arena.regras;
  const def = ctx.content.arena.unidades[f.defId];
  if (def && f.mana >= regras.manaMax) {
    f.mana = 0;
    emit(ctx, { tipo: 'habilidade', origem: f.uid, nome: def.habilidade.nome });
    runEffects(host, def.habilidade.efeitos, { unidade: f, fonte: def.id, alvo });
    return;
  }
  emit(ctx, { tipo: 'ataque', origem: f.uid, alvo: alvo.uid });
  host.dealDamage({ unidade: f, fonte: 'basico', alvo }, alvo, 1);
  if (f.queimadura > 0 && vivo(alvo)) host.applyStatus(alvo, 'queimadura', f.queimadura);
  f.mana = Math.min(regras.manaMax, f.mana + regras.manaPorAtaque);
}

function frame(ctx: Ctx): ArenaFrame {
  return { t: ctx.t, u: ctx.todos.map((f) => [f.vida, f.bloqueio, f.mana]) };
}

/** Simula uma luta completa entre dois lados. */
export function simulateArenaBattle(
  content: GameContent,
  a: ArenaSide,
  b: ArenaSide,
  semente: number,
  registrar = false,
): ArenaBattleResult {
  const todos = [...buildFighters(content, a, 0), ...buildFighters(content, b, 1)];
  const ctx: Ctx = { content, rng: createRng(semente), t: 0, todos, eventos: [], registrar };
  const host = createHost(ctx);
  const c = content.progressao.combate;
  const limite = content.arena.regras.limiteS * 1000;
  const quadros: ArenaFrame[] = registrar ? [frame(ctx)] : [];
  const vivos = (time: 0 | 1) => todos.some((f) => f.time === time && vivo(f));
  while (ctx.t < limite && vivos(0) && vivos(1)) {
    const segundoAntes = Math.floor(ctx.t / 1000);
    ctx.t += c.tickMs;
    for (const f of todos) {
      if (!vivo(f)) continue;
      f.carga += f.velocidade;
      if (f.carga >= c.cargaParaAgir) {
        f.carga -= c.cargaParaAgir;
        act(ctx, host, f);
        if (!vivos(0) || !vivos(1)) break;
      }
    }
    if (Math.floor(ctx.t / 1000) !== segundoAntes) {
      for (const f of todos) {
        if (!vivo(f)) continue;
        for (const { status, perda } of tickSecond(f.status)) {
          const valor = Math.min(f.vida, perda);
          if (valor <= 0) continue;
          f.vida -= valor;
          emit(ctx, { tipo: 'perdaDeVida', alvo: f.uid, valor, motivo: status });
          if (f.vida === 0) emit(ctx, { tipo: 'caiu', alvo: f.uid });
        }
        if (f.bloqueio > 0) f.bloqueio = Math.floor(f.bloqueio * (1 - c.decaimentoBloqueio));
      }
    }
    if (registrar) quadros.push(frame(ctx));
  }
  const restantes = (time: 0 | 1) => todos.filter((f) => f.time === time && vivo(f)).length;
  const v0 = vivos(0);
  const v1 = vivos(1);
  return {
    vencedor: v0 && !v1 ? 0 : v1 && !v0 ? 1 : null,
    vivas: [restantes(0), restantes(1)],
    duracaoMs: ctx.t,
    unidades: todos.map((f) => ({
      uid: f.uid,
      def: f.defId,
      nome: f.nome,
      time: f.time,
      pos: f.pos,
      vidaMax: f.vidaMax,
      estrelas: f.estrelas,
    })),
    eventos: ctx.eventos,
    quadros,
  };
}
