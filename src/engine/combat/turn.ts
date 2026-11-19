/**
 * Fluxo de turnos. A ordem exata está documentada em docs/etapa-1 (seção 16) e no README.
 */
import { runEffects } from '../effects/effects.ts';
import { tickEndOfTurn, tickStartOfTurn } from '../statuses/statuses.ts';
import type { Ctx, Unit } from './state.ts';
import { drawCards, emit, gainBrasa, isOver } from './state.ts';
import { allyAct, chooseIntent, enemyAct } from './ai.ts';
import { loseLife } from './damage.ts';
import { MAX_TURNOS, finish } from './outcome.ts';

/** Aplica o Veneno (e outras perdas de início de turno) numa unidade. */
function startOfTurnLosses(ctx: Ctx, unidade: Unit): void {
  for (const { perda } of tickStartOfTurn(unidade.status)) {
    if (isOver(ctx) || unidade.vida <= 0) return;
    loseLife(ctx, unidade, perda, 'veneno');
  }
}

export function startPlayerTurn(ctx: Ctx): void {
  const s = ctx.state;
  s.turno++;
  if (s.turno > MAX_TURNOS) {
    finish(ctx, 'empate');
    return;
  }
  emit(ctx, { tipo: 'turnoIniciado', turno: s.turno });

  // 1. Bloqueio zera.  2. Veneno.  3. Rituais.  4. Energia.  5. Compra.
  s.jogador.bloqueio = 0;
  startOfTurnLosses(ctx, s.jogador);
  if (isOver(ctx)) return;

  for (const ritual of s.rituais) {
    if (isOver(ctx)) return;
    emit(ctx, { tipo: 'ritualDisparado', fonte: ritual.fonte });
    runEffects(ctx, ritual.efeitos, { unidade: s.jogador, fonte: ritual.fonte });
  }

  s.energia = ctx.content.jogador.energiaPorTurno;
  drawCards(ctx, ctx.content.jogador.cartasPorTurno);
}

export function endPlayerTurn(ctx: Ctx): void {
  const s = ctx.state;

  // 1. Energia que sobrou vira Brasa.  2. Aliado age.  3. Descarta a mão.  4. Status reduzem.
  const sobra = s.energia;
  s.energia = 0;
  gainBrasa(ctx, sobra);

  allyAct(ctx);
  if (isOver(ctx)) return;

  s.descarte.push(...s.mao);
  s.mao = [];
  tickEndOfTurn(s.jogador.status);
  if (s.aliado) tickEndOfTurn(s.aliado.status);

  enemiesTurn(ctx);
  if (!isOver(ctx)) startPlayerTurn(ctx);
}

function enemiesTurn(ctx: Ctx): void {
  for (const inimigo of [...ctx.state.inimigos]) {
    if (isOver(ctx)) return;
    if (inimigo.vida <= 0) continue;

    inimigo.bloqueio = 0;
    startOfTurnLosses(ctx, inimigo);
    if (isOver(ctx)) return;
    if (inimigo.vida <= 0) continue;

    enemyAct(ctx, inimigo);
    if (isOver(ctx)) return;
    if (inimigo.vida <= 0) continue;

    tickEndOfTurn(inimigo.status);
    chooseIntent(ctx, inimigo);
  }
}
