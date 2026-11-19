/**
 * Comportamento do caçador: qual habilidade usar e em quem.
 *
 * A cada ação, o caçador percorre as habilidades equipadas na ordem de
 * prioridade e usa a primeira que está pronta e que as regras permitem. Se
 * nenhuma servir, usa o ataque básico.
 */
import type { Comportamento } from '../hunter/hunter.ts';
import type { EquippedAbility } from '../hunter/stats.ts';
import { intentAction } from './ai.ts';
import type { BattleCtx, BattleUnit } from './state.ts';
import { alive } from './state.ts';

export function chooseTarget(ctx: BattleCtx, comportamento: Comportamento): BattleUnit | undefined {
  const vivos = alive(ctx.state.inimigos);
  let melhor: BattleUnit | undefined;
  for (const u of vivos) {
    if (!melhor) {
      melhor = u;
      continue;
    }
    if (comportamento.alvo === 'menorVida' && u.vida < melhor.vida) melhor = u;
    if (comportamento.alvo === 'maiorAtaque' && u.ataque > melhor.ataque) melhor = u;
  }
  return melhor;
}

function strongBlowIncoming(ctx: BattleCtx): boolean {
  return alive(ctx.state.inimigos).some((u) => intentAction(ctx, u)?.forte === true);
}

/** A habilidade pode ser usada agora, segundo as regras de comportamento? */
export function allowedByBehavior(
  ctx: BattleCtx,
  hab: EquippedAbility,
  comportamento: Comportamento,
): boolean {
  const c = ctx.state.cacador;
  switch (hab.def.categoria) {
    case 'ataque':
      return true;
    case 'cura':
      return (c.vida / c.vidaMax) * 100 < comportamento.curaAbaixoPct;
    case 'defesa':
      return comportamento.defesa === 'pronta' || strongBlowIncoming(ctx);
  }
}

export function chooseAbility(
  ctx: BattleCtx,
  habilidades: readonly EquippedAbility[],
  comportamento: Comportamento,
): EquippedAbility | undefined {
  return habilidades.find(
    (h) => (ctx.state.recargas[h.def.id] ?? 0) <= 0 && allowedByBehavior(ctx, h, comportamento),
  );
}
