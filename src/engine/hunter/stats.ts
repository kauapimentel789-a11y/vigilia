/**
 * Transforma level, atributos e habilidades em números de combate.
 *
 * É o único lugar que conhece as fórmulas dos atributos. Os coeficientes vêm do
 * conteúdo (`progressao.stats`).
 */
import type { AbilityDef, GameContent } from '../definitions.ts';
import type { Comportamento, HunterState } from './hunter.ts';
import { abilityLevel } from './abilities.ts';
import { equipmentStats } from '../items/items.ts';

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
  /** Fração do dano causado que volta como vida (itens). */
  rouboVida: number;
  /** Veneno aplicado a cada ataque básico (itens). */
  venenoAoAcertar: number;
}

export function deriveStats(cacador: HunterState, content: GameContent): HunterStats {
  const s = content.progressao.stats;
  const it = equipmentStats(content, cacador.equipamento ?? {});
  const at = cacador.atributos;
  // Atributos dos itens somam aos distribuídos.
  const a = {
    forca: at.forca + (it.forca ?? 0),
    agilidade: at.agilidade + (it.agilidade ?? 0),
    vigor: at.vigor + (it.vigor ?? 0),
    percepcao: at.percepcao + (it.percepcao ?? 0),
    vontade: at.vontade + (it.vontade ?? 0),
  };
  const lv = cacador.level - 1;
  const ataqueBase =
    s.ataqueBase + s.ataquePorLevel * lv + s.ataquePorForca * a.forca + (it.ataque ?? 0);
  return {
    vidaMax: Math.round(
      s.vidaBase + s.vidaPorLevel * lv + s.vidaPorVigor * a.vigor + (it.vida ?? 0),
    ),
    ataque: ataqueBase * (1 + s.danoPctPorForca * a.forca),
    velocidade:
      s.velocidadeBase *
        (1 + Math.min(s.velocidadePctPorAgilidade * a.agilidade, s.velocidadeBonusMax)) +
      (it.velocidade ?? 0),
    reducao: Math.min(s.reducaoPorVigor * a.vigor + (it.reducao ?? 0), s.reducaoMax),
    critico: Math.min(
      s.criticoBase + s.criticoPorPercepcao * a.percepcao + (it.critico ?? 0),
      s.criticoMax,
    ),
    danoCritico: s.danoCriticoBase + s.danoCriticoPorPercepcao * a.percepcao + (it.danoCritico ?? 0),
    poder: 1 + s.poderPorVontade * a.vontade + (it.poder ?? 0),
    recargaMult: 1 - Math.min(s.recargaPorVontade * a.vontade, s.recargaReducaoMax),
    rouboVida: it.rouboVida ?? 0,
    venenoAoAcertar: it.venenoAoAcertar ?? 0,
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
