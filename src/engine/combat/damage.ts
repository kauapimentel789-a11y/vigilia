/**
 * Fórmula de dano, bloqueio e perda de vida.
 *
 * Ordem da fórmula, aplicada a cada golpe:
 *   base + somas de quem ataca (Força) + somas do alvo (Marca)
 *   × multiplicadores de quem ataca (Fraco) × multiplicadores do alvo (Vulnerável)
 *   arredonda para baixo, mínimo 0. O bloqueio absorve primeiro.
 */
import type { StatusMap } from '../statuses/statuses.ts';
import { STATUS_DEFS, activeStatuses } from '../statuses/statuses.ts';
import type { Ctx, Unit } from './state.ts';
import { emit } from './state.ts';
import { checkSpecials } from './ai.ts';
import { checkOutcome } from './outcome.ts';

/** Calcula o dano de um golpe, sem aplicá-lo. Usado também para exibir intenções. */
export function computeDamage(base: number, atacante: StatusMap | null, alvo: StatusMap): number {
  let valor = base;
  if (atacante) {
    for (const [id, q] of activeStatuses(atacante))
      valor += STATUS_DEFS[id].somaDanoCausado?.(q) ?? 0;
  }
  for (const [id, q] of activeStatuses(alvo)) valor += STATUS_DEFS[id].somaDanoRecebido?.(q) ?? 0;
  if (atacante) {
    for (const [id] of activeStatuses(atacante)) valor *= STATUS_DEFS[id].multDanoCausado ?? 1;
  }
  for (const [id] of activeStatuses(alvo)) valor *= STATUS_DEFS[id].multDanoRecebido ?? 1;
  return Math.max(0, Math.floor(valor));
}

/** Causa um golpe de dano de `origem` em `alvo`. */
export function dealDamage(ctx: Ctx, origem: Unit, alvo: Unit, base: number, fonte: string): void {
  const valor = computeDamage(base, origem.status, alvo.status);
  const bloqueado = Math.min(alvo.bloqueio, valor);
  alvo.bloqueio -= bloqueado;
  const perda = Math.min(alvo.vida, valor - bloqueado);
  alvo.vida -= perda;
  emit(ctx, { tipo: 'dano', fonte, origem: origem.uid, alvo: alvo.uid, valor, bloqueado });
  recordDamage(ctx, alvo, perda, fonte);
  afterHealthLoss(ctx, alvo);
}

/** Perda de vida que ignora bloqueio (ex.: Veneno). */
export function loseLife(ctx: Ctx, alvo: Unit, valor: number, motivo: 'veneno'): void {
  const perda = Math.min(alvo.vida, valor);
  alvo.vida -= perda;
  emit(ctx, { tipo: 'perdaDeVida', alvo: alvo.uid, valor: perda, motivo });
  recordDamage(ctx, alvo, perda, motivo);
  afterHealthLoss(ctx, alvo);
}

export function gainBlock(ctx: Ctx, alvo: Unit, valor: number): void {
  if (alvo.vida <= 0 || valor <= 0) return;
  alvo.bloqueio += valor;
  emit(ctx, { tipo: 'bloqueio', alvo: alvo.uid, valor });
}

function recordDamage(ctx: Ctx, alvo: Unit, perda: number, fonte: string): void {
  const stats = ctx.state.stats;
  if (alvo.tipo === 'inimigo') {
    stats.danoCausado += perda;
    stats.danoPorFonte[fonte] = (stats.danoPorFonte[fonte] ?? 0) + perda;
  } else if (alvo.tipo === 'jogador') {
    stats.danoRecebido += perda;
  }
}

function afterHealthLoss(ctx: Ctx, alvo: Unit): void {
  if (alvo.vida <= 0) {
    alvo.bloqueio = 0;
    emit(ctx, { tipo: 'derrotado', alvo: alvo.uid });
    if (alvo.tipo === 'aliado') ctx.state.aliado = null;
  } else if (alvo.tipo === 'inimigo') {
    checkSpecials(ctx, alvo);
  }
  checkOutcome(ctx);
}
