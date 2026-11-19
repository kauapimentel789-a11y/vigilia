/**
 * Simulação de um portal inteiro, de uma vez.
 *
 * O tempo avança em tiques fixos. A cada tique, cada unidade viva soma a
 * velocidade à sua carga; ao chegar em `cargaParaAgir`, ela age. A cada segundo
 * os status contam (veneno, durações) e o bloqueio decai.
 *
 * Mesma entrada e mesma semente produzem exatamente a mesma luta. A interface
 * só reproduz os eventos e quadros devolvidos aqui.
 */
import { createRng } from '../core/index.ts';
import type { GameContent, PortalDef } from '../definitions.ts';
import type { EffectHost } from '../effects/effects.ts';
import { runEffects } from '../effects/effects.ts';
import type { HunterProfile } from '../hunter/stats.ts';
import { tickSecond } from '../statuses/statuses.ts';
import { checkSpecial, chooseIntent, enemyAct } from './ai.ts';
import { chooseAbility, chooseTarget } from './behavior.ts';
import { createHost, loseLife } from './damage.ts';
import type {
  BattleCtx,
  BattleEvent,
  BattleFrame,
  BattleResult,
  BattleState,
  BattleStats,
  BattleUnit,
} from './state.ts';
import { alive, emit } from './state.ts';

export interface PortalBattleInput {
  perfil: HunterProfile;
  portal: PortalDef;
  content: GameContent;
  semente: number;
  /** Registrar eventos e quadros para a interface. Desligado na Expedição, por velocidade. */
  registrar?: boolean;
}

export interface PortalBattleOutput {
  resultado: BattleResult;
  motivo: NonNullable<BattleState['motivo']>;
  duracaoMs: number;
  ondaAlcancada: number;
  totalOndas: number;
  vidaRestante: number;
  stats: BattleStats;
  eventos: BattleEvent[];
  quadros: BattleFrame[];
}

function createHunterUnit(perfil: HunterProfile): BattleUnit {
  const s = perfil.stats;
  return {
    uid: 'cacador',
    defId: 'cacador',
    nome: perfil.nome,
    lado: 'cacador',
    vida: s.vidaMax,
    vidaMax: s.vidaMax,
    bloqueio: 0,
    status: {},
    ataque: s.ataque,
    velocidade: s.velocidade,
    reducao: s.reducao,
    critico: s.critico,
    danoCritico: s.danoCritico,
    carga: 0,
    intencao: null,
    cicloIndice: 0,
    especialUsado: false,
  };
}

function spawnWave(ctx: BattleCtx, portal: PortalDef, indice: number): void {
  const s = ctx.state;
  const ids = portal.ondas[indice] ?? [];
  s.onda = indice + 1;
  s.inimigos = ids.map((id) => {
    const def = ctx.content.inimigos[id];
    if (!def) throw new Error(`Inimigo desconhecido no portal ${portal.id}: ${id}`);
    const vidaMax = Math.round(def.vidaMax * portal.escala.vida);
    return {
      uid: `i${s.proximoUid++}`,
      defId: def.id,
      nome: def.nome,
      lado: 'inimigo',
      vida: vidaMax,
      vidaMax,
      bloqueio: 0,
      status: {},
      ataque: def.ataque * portal.escala.ataque,
      velocidade: def.velocidade,
      reducao: 0,
      critico: 0,
      danoCritico: 1,
      // Carga inicial sorteada, para os inimigos não agirem todos juntos.
      carga: ctx.rng.int(0, Math.floor(ctx.content.progressao.combate.cargaParaAgir * 0.4)),
      intencao: null,
      cicloIndice: 0,
      especialUsado: false,
    } satisfies BattleUnit;
  });
  emit(ctx, {
    tipo: 'onda',
    onda: s.onda,
    total: s.totalOndas,
    inimigos: s.inimigos.map((i) => ({ uid: i.uid, defId: i.defId, nome: i.nome })),
  });
  for (const i of s.inimigos) chooseIntent(ctx, i);
}

function finish(ctx: BattleCtx, resultado: BattleResult, motivo: NonNullable<BattleState['motivo']>): void {
  ctx.state.resultado = resultado;
  ctx.state.motivo = motivo;
  emit(ctx, { tipo: 'fim', resultado, motivo });
}

function checkEnd(ctx: BattleCtx, portal: PortalDef): void {
  const s = ctx.state;
  if (s.resultado) return;
  if (s.cacador.vida <= 0) return finish(ctx, 'derrota', 'cacadorCaiu');
  if (alive(s.inimigos).length === 0) {
    if (s.onda < s.totalOndas) spawnWave(ctx, portal, s.onda);
    else finish(ctx, 'vitoria', 'inimigosDerrotados');
  }
}

function hunterAct(ctx: BattleCtx, host: EffectHost<BattleUnit>, perfil: HunterProfile): void {
  const s = ctx.state;
  const alvo = chooseTarget(ctx, perfil.comportamento);
  const hab = chooseAbility(ctx, perfil.habilidades, perfil.comportamento);
  if (hab) {
    s.recargas[hab.def.id] = hab.recargaMs;
    s.stats.usos[hab.def.id] = (s.stats.usos[hab.def.id] ?? 0) + 1;
    emit(ctx, { tipo: 'acao', ator: s.cacador.uid, acao: hab.def.id, nome: hab.def.nome, ...(alvo ? { alvo: alvo.uid } : {}) });
    runEffects(host, hab.def.efeitos, { unidade: s.cacador, fonte: hab.def.id, alvo }, hab.escala);
    return;
  }
  const basico = ctx.content.progressao.ataqueBasico;
  s.stats.usos.basico = (s.stats.usos.basico ?? 0) + 1;
  emit(ctx, { tipo: 'acao', ator: s.cacador.uid, acao: 'basico', nome: basico.nome, ...(alvo ? { alvo: alvo.uid } : {}) });
  runEffects(host, [{ tipo: 'dano', mult: basico.mult, alvo: 'alvo' }], { unidade: s.cacador, fonte: 'basico', alvo });
}

function secondTick(ctx: BattleCtx): void {
  const decai = ctx.content.progressao.combate.decaimentoBloqueio;
  for (const u of [ctx.state.cacador, ...ctx.state.inimigos]) {
    if (u.vida <= 0) continue;
    for (const { status, perda } of tickSecond(u.status)) loseLife(ctx, u, perda, status);
    if (u.bloqueio > 0) u.bloqueio = Math.floor(u.bloqueio * (1 - decai));
  }
}

function snapshot(ctx: BattleCtx): BattleFrame {
  const s = ctx.state;
  const carga = ctx.content.progressao.combate.cargaParaAgir;
  return {
    t: s.t,
    onda: s.onda,
    recargas: { ...s.recargas },
    unidades: [s.cacador, ...s.inimigos].map((u) => ({
      uid: u.uid,
      defId: u.defId,
      nome: u.nome,
      lado: u.lado,
      vida: u.vida,
      vidaMax: u.vidaMax,
      bloqueio: u.bloqueio,
      status: { ...u.status },
      carga: Math.min(1, u.carga / carga),
      intencao: u.intencao,
    })),
  };
}

export function simulatePortal(input: PortalBattleInput): PortalBattleOutput {
  const { perfil, portal, content } = input;
  const cfg = content.progressao.combate;
  const state: BattleState = {
    t: 0,
    onda: 0,
    totalOndas: portal.ondas.length,
    resultado: null,
    motivo: null,
    cacador: createHunterUnit(perfil),
    inimigos: [],
    recargas: Object.fromEntries(perfil.habilidades.map((h) => [h.def.id, 0])),
    proximoUid: 1,
    stats: { danoCausado: 0, danoRecebido: 0, curaTotal: 0, danoPorFonte: {}, usos: {} },
  };
  const ctx: BattleCtx = {
    state,
    content,
    rng: createRng(input.semente),
    eventos: [],
    registrar: input.registrar ?? false,
  };
  const quadros: BattleFrame[] = [];
  const host = createHost(ctx);
  const limiteMs = cfg.limiteS * 1000;

  spawnWave(ctx, portal, 0);
  if (ctx.registrar) quadros.push(snapshot(ctx));

  while (state.resultado === null) {
    state.t += cfg.tickMs;
    for (const id of Object.keys(state.recargas)) {
      state.recargas[id] = Math.max(0, (state.recargas[id] ?? 0) - cfg.tickMs);
    }
    if (state.t % 1000 === 0) {
      secondTick(ctx);
      for (const i of state.inimigos) checkSpecial(ctx, host, i);
      checkEnd(ctx, portal);
    }
    for (const u of [state.cacador, ...state.inimigos]) {
      if (state.resultado !== null) break;
      if (u.vida <= 0) continue;
      u.carga += u.velocidade;
      if (u.carga < cfg.cargaParaAgir) continue;
      u.carga -= cfg.cargaParaAgir;
      if (u.lado === 'cacador') hunterAct(ctx, host, perfil);
      else enemyAct(ctx, host, u);
      for (const i of state.inimigos) checkSpecial(ctx, host, i);
      checkEnd(ctx, portal);
    }
    if (state.resultado === null && state.t >= limiteMs) finish(ctx, 'derrota', 'tempoEsgotado');
    if (ctx.registrar) quadros.push(snapshot(ctx));
  }

  return {
    resultado: state.resultado,
    motivo: state.motivo ?? 'tempoEsgotado',
    duracaoMs: state.t,
    ondaAlcancada: state.onda,
    totalOndas: state.totalOndas,
    vidaRestante: state.cacador.vida,
    stats: state.stats,
    eventos: ctx.eventos,
    quadros,
  };
}
