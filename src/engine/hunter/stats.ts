/**
 * Transforma level, atributos e habilidades em números de combate.
 *
 * É o único lugar que conhece as fórmulas dos atributos. Os coeficientes vêm do
 * conteúdo (`progressao.stats`).
 */
import type { AbilityDef, GameContent } from '../definitions.ts';
import type { Comportamento, HunterState } from './hunter.ts';
import { abilityLevel } from './abilities.ts';

export interface HunterStats {
  vidaMax: number;
  ataque: number;
  /** Carga de ação por tique (100 = 1 ação por segundo, com os valores padrão). */
  velocidade: number;
  /** Fração do dano recebido que é ignorada. */
  reducao: number;
  critico: number;
  danoCritico: number;
  /** Multiplicador da força das habilidades. */
  poder: number;
  /** Multiplicador das recargas (0,8 = 20% mais rápidas). */
  recargaMult: number;
}

export function deriveStats(cacador: HunterState, content: GameContent): HunterStats {
  const s = content.progressao.stats;
  const a = cacador.atributos;
  const lv = cacador.level - 1;
  const ataqueBase = s.ataqueBase + s.ataquePorLevel * lv + s.ataquePorForca * a.forca;
  return {
    vidaMax: Math.round(s.vidaBase + s.vidaPorLevel * lv + s.vidaPorVigor * a.vigor),
    ataque: ataqueBase * (1 + s.danoPctPorForca * a.forca),
    velocidade:
      s.velocidadeBase *
      (1 + Math.min(s.velocidadePctPorAgilidade * a.agilidade, s.velocidadeBonusMax)),
    reducao: Math.min(s.reducaoPorVigor * a.vigor, s.reducaoMax),
    critico: Math.min(s.criticoBase + s.criticoPorPercepcao * a.percepcao, s.criticoMax),
    danoCritico: s.danoCriticoBase + s.danoCriticoPorPercepcao * a.percepcao,
    poder: 1 + s.poderPorVontade * a.vontade,
    recargaMult: 1 - Math.min(s.recargaPorVontade * a.vontade, s.recargaReducaoMax),
  };
}

export interface EquippedAbility {
  def: AbilityDef;
  nivel: number;
  /** Força final dos efeitos (poder × nível). */
  escala: number;
  /** Recarga final, em ms. */
  recargaMs: number;
}

/** Tudo que o combate automático precisa saber sobre o caçador. */
export interface HunterProfile {
  nome: string;
  stats: HunterStats;
  habilidades: EquippedAbility[];
  comportamento: Comportamento;
}

export function buildProfile(cacador: HunterState, content: GameContent): HunterProfile {
  const stats = deriveStats(cacador, content);
  const porNivel = content.progressao.escalaPorNivelDeHabilidade;
  const habilidades = cacador.equipadas.flatMap((id) => {
    const def = content.habilidades[id];
    if (!def || cacador.level < def.desbloqueio) return [];
    const nivel = abilityLevel(cacador, id);
    return [
      {
        def,
        nivel,
        escala: stats.poder * (1 + porNivel * (nivel - 1)),
        recargaMs: Math.round(def.recarga * 1000 * stats.recargaMult),
      },
    ];
  });
  return { nome: 'Portador', stats, habilidades, comportamento: cacador.comportamento };
}
