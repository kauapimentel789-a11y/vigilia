/**
 * Habilidades do caçador: desbloqueio, equipar, ordem de prioridade e melhoria.
 */
import type { AbilityDef, GameContent } from '../definitions.ts';
import type { Comportamento, HunterResult, HunterState } from './hunter.ts';
import { classOf } from './hunter.ts';

/** Liberada pelo level e, se for exclusiva, pela classe do caçador. */
export function isUnlocked(cacador: HunterState, def: AbilityDef): boolean {
  return cacador.level >= def.desbloqueio && (!def.classe || def.classe === classOf(cacador));
}

/** A habilidade é de outra classe (não só bloqueada pelo level). */
export function isOtherClass(cacador: HunterState, def: AbilityDef): boolean {
  return !!def.classe && def.classe !== classOf(cacador);
}

export function abilityLevel(cacador: HunterState, id: string): number {
  return cacador.niveisHabilidade[id] ?? 1;
}

/** Custo em ouro para melhorar a habilidade do nível atual ao próximo. */
export function upgradeCost(content: GameContent, nivelAtual: number): number {
  return Math.round(content.progressao.custoMelhoriaBase * nivelAtual * nivelAtual);
}

/**
 * Define as habilidades equipadas e a ordem de prioridade (a primeira tem prioridade).
 * Recusa habilidades bloqueadas, desconhecidas, repetidas ou além dos espaços.
 */
export function setEquipped(
  cacador: HunterState,
  content: GameContent,
  equipadas: readonly string[],
): HunterResult {
  if (equipadas.length > content.progressao.espacosDeHabilidade) {
    return { erro: 'Espaços de habilidade insuficientes.' };
  }
  if (new Set(equipadas).size !== equipadas.length) return { erro: 'Habilidade repetida.' };
  for (const id of equipadas) {
    const def = content.habilidades[id];
    if (!def) return { erro: `Habilidade desconhecida: ${id}` };
    if (!isUnlocked(cacador, def))
      return {
        erro: isOtherClass(cacador, def)
          ? `${def.nome} é de outra classe.`
          : `${def.nome} ainda está bloqueada.`,
      };
  }
  return { cacador: { ...structuredClone(cacador), equipadas: [...equipadas] } };
}

export interface UpgradeResult {
  cacador: HunterState;
  custo: number;
}

/** Melhora uma habilidade. Quem chama desconta o ouro (o caçador não guarda ouro). */
export function upgradeAbility(
  cacador: HunterState,
  content: GameContent,
  id: string,
  ouro: number,
): UpgradeResult | { erro: string } {
  const def = content.habilidades[id];
  if (!def) return { erro: `Habilidade desconhecida: ${id}` };
  if (!isUnlocked(cacador, def)) return { erro: `${def.nome} ainda está bloqueada.` };
  const nivel = abilityLevel(cacador, id);
  if (nivel >= content.progressao.habilidadeNivelMax) return { erro: 'Nível máximo.' };
  const custo = upgradeCost(content, nivel);
  if (ouro < custo) return { erro: 'Ouro insuficiente.' };
  const c = structuredClone(cacador);
  c.niveisHabilidade[id] = nivel + 1;
  return { cacador: c, custo };
}

export function setBehavior(cacador: HunterState, comportamento: Comportamento): HunterResult {
  const pct = comportamento.curaAbaixoPct;
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { erro: 'Percentual inválido.' };
  return { cacador: { ...structuredClone(cacador), comportamento: { ...comportamento } } };
}
