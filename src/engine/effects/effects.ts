/**
 * Sistema de efeitos.
 *
 * Toda carta, ação de inimigo e ação de aliado é apenas uma lista de efeitos.
 * Cada tipo de efeito tem um "handler" no registro abaixo. Para criar um efeito
 * novo: adicione o tipo à união `Effect` e um handler em `HANDLERS`.
 */
import type { StatusId } from '../statuses/statuses.ts';
import { addStatus } from '../statuses/statuses.ts';
import type { Ctx, Unit } from '../combat/state.ts';
import { aliveEnemies, drawCards, emit, gainBrasa, isOver } from '../combat/state.ts';
import { dealDamage, gainBlock } from '../combat/damage.ts';
import { allyAct, summonAlly } from '../combat/ai.ts';

/** Para quem o efeito vai. "escolhido" é o alvo selecionado pelo jogador ao jogar a carta. */
export type TargetSpec =
  | 'escolhido'
  | 'proprio'
  | 'jogador'
  | 'aliado'
  | 'jogadorEAliado'
  | 'todosInimigos'
  | 'inimigoEsquerda';

export type Effect =
  | { tipo: 'dano'; valor: number; golpes?: number; alvo: TargetSpec }
  | { tipo: 'bloqueio'; valor: number; alvo: TargetSpec }
  | { tipo: 'status'; status: StatusId; valor: number; alvo: TargetSpec }
  | { tipo: 'comprar'; valor: number }
  | { tipo: 'ganharBrasa'; valor: number }
  | { tipo: 'danoPorBrasa'; base: number; porBrasa: number; alvo: TargetSpec }
  | { tipo: 'invocar'; aliado: string }
  | { tipo: 'comandarAliado' }
  | { tipo: 'ritual'; descricao: string; efeitos: Effect[] };

/** Quem está usando o efeito e qual alvo foi escolhido. */
export interface EffectSource {
  unidade: Unit;
  /** Rótulo para o registro e as estatísticas (ex.: id da carta ou nome da ação). */
  fonte: string;
  escolhido?: Unit;
}

type Handler<T extends Effect['tipo']> = (
  ctx: Ctx,
  efeito: Extract<Effect, { tipo: T }>,
  origem: EffectSource,
) => void;

export function resolveTargets(ctx: Ctx, alvo: TargetSpec, origem: EffectSource): Unit[] {
  const s = ctx.state;
  switch (alvo) {
    case 'escolhido':
      return origem.escolhido && origem.escolhido.vida > 0 ? [origem.escolhido] : [];
    case 'proprio':
      return [origem.unidade];
    case 'jogador':
      return [s.jogador];
    case 'aliado':
      return s.aliado ? [s.aliado] : [];
    case 'jogadorEAliado':
      return s.aliado ? [s.jogador, s.aliado] : [s.jogador];
    case 'todosInimigos':
      return aliveEnemies(s);
    case 'inimigoEsquerda':
      return aliveEnemies(s).slice(0, 1);
  }
}

const HANDLERS: { [T in Effect['tipo']]: Handler<T> } = {
  dano(ctx, e, origem) {
    const golpes = e.golpes ?? 1;
    for (let i = 0; i < golpes; i++) {
      for (const alvo of resolveTargets(ctx, e.alvo, origem)) {
        if (isOver(ctx)) return;
        if (alvo.vida > 0) dealDamage(ctx, origem.unidade, alvo, e.valor, origem.fonte);
      }
    }
  },
  bloqueio(ctx, e, origem) {
    for (const alvo of resolveTargets(ctx, e.alvo, origem)) gainBlock(ctx, alvo, e.valor);
  },
  status(ctx, e, origem) {
    for (const alvo of resolveTargets(ctx, e.alvo, origem)) {
      if (alvo.vida <= 0) continue;
      addStatus(alvo.status, e.status, e.valor);
      emit(ctx, { tipo: 'status', alvo: alvo.uid, status: e.status, valor: e.valor });
    }
  },
  comprar(ctx, e) {
    drawCards(ctx, e.valor);
  },
  ganharBrasa(ctx, e) {
    gainBrasa(ctx, e.valor);
  },
  danoPorBrasa(ctx, e, origem) {
    const consumida = ctx.state.brasa;
    if (consumida > 0) {
      ctx.state.brasa = 0;
      ctx.state.stats.brasaGasta += consumida;
      emit(ctx, { tipo: 'brasa', delta: -consumida, total: 0 });
    }
    const valor = e.base + e.porBrasa * consumida;
    for (const alvo of resolveTargets(ctx, e.alvo, origem)) {
      if (isOver(ctx)) return;
      dealDamage(ctx, origem.unidade, alvo, valor, origem.fonte);
    }
  },
  invocar(ctx, e) {
    summonAlly(ctx, e.aliado);
  },
  comandarAliado(ctx) {
    allyAct(ctx);
  },
  ritual(ctx, e, origem) {
    ctx.state.rituais.push({ fonte: origem.fonte, descricao: e.descricao, efeitos: e.efeitos });
    emit(ctx, { tipo: 'ritualAtivado', fonte: origem.fonte, descricao: e.descricao });
  },
};

/** Executa uma lista de efeitos em ordem, parando se o combate terminar. */
export function runEffects(ctx: Ctx, efeitos: readonly Effect[], origem: EffectSource): void {
  for (const efeito of efeitos) {
    if (isOver(ctx)) return;
    (HANDLERS[efeito.tipo] as Handler<typeof efeito.tipo>)(ctx, efeito as never, origem);
  }
}
