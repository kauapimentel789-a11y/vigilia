export * from './definitions.ts';
export type {
  AllyUnit,
  CardInstance,
  CombatEvent,
  CombatResult,
  CombatState,
  CombatStats,
  EnemyUnit,
  PlayerUnit,
  RitualState,
  Unit,
} from './state.ts';
export { aliveEnemies, findUnit } from './state.ts';
export { cannotPlay, endTurn, playCard, startCombat } from './commands.ts';
export type { CommandResult, PlayCardInput } from './commands.ts';
export { allyIntent, anyEnemyAttacking, enemyAction, previewIntent } from './ai.ts';
export type { IntentPreview } from './ai.ts';
export { computeDamage } from './damage.ts';
export { MAX_TURNOS } from './outcome.ts';
export type { Effect, TargetSpec } from '../effects/effects.ts';
export { STATUS_DEFS, activeStatuses } from '../statuses/statuses.ts';
export type { StatusDef, StatusId, StatusMap } from '../statuses/statuses.ts';
