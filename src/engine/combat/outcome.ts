/**
 * Fim de combate: vitória, derrota e a trava de segurança de turnos.
 */
import type { CombatResult, Ctx } from './state.ts';
import { aliveEnemies, emit } from './state.ts';

/** Limite de turnos. Passar dele indica um problema de balanceamento. */
export const MAX_TURNOS = 40;

export function finish(ctx: Ctx, resultado: CombatResult): void {
  if (ctx.state.resultado) return;
  ctx.state.resultado = resultado;
  emit(ctx, { tipo: 'combateEncerrado', resultado });
}

/** Verifica se o combate acabou. É chamada depois de cada perda de vida. */
export function checkOutcome(ctx: Ctx): void {
  if (ctx.state.resultado) return;
  if (ctx.state.jogador.vida <= 0) finish(ctx, 'derrota');
  else if (aliveEnemies(ctx.state).length === 0) finish(ctx, 'vitoria');
}
