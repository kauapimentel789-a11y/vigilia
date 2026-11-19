/**
 * O caçador: level, XP e atributos.
 *
 * Todas as funções são puras: recebem o estado e devolvem um estado novo.
 */
import type { AtributoId, ClasseId, GameContent, ProgressionDef } from '../definitions.ts';
import { ATRIBUTOS } from '../definitions.ts';
import type { Equipamento } from '../items/items.ts';

export type AlvoPreferido = 'menorVida' | 'maiorAtaque' | 'primeiro';
export type RegraDefesa = 'pronta' | 'contraGolpeForte';

export interface Comportamento {
  alvo: AlvoPreferido;
  /** Habilidades de cura só são usadas com a vida abaixo deste percentual. */
  curaAbaixoPct: number;
  defesa: RegraDefesa;
}

export interface HunterState {
  /** Classe escolhida (saves antigos não têm: vale 'vigia'). */
  classe?: ClasseId;
  level: number;
  /** XP acumulado dentro do level atual. */
  xp: number;
  pontosLivres: number;
  atributos: Record<AtributoId, number>;
  /** Nível de cada habilidade melhorada. Ausente significa nível 1. */
  niveisHabilidade: Record<string, number>;
  /** Habilidades equipadas, na ordem de prioridade. */
  equipadas: string[];
  comportamento: Comportamento;
  /** Itens vestidos, um por espaço. */
  equipamento: Equipamento;
}

export const COMPORTAMENTO_PADRAO: Comportamento = {
  alvo: 'menorVida',
  curaAbaixoPct: 50,
  defesa: 'contraGolpeForte',
};

/** XP necessário para ir do level `level` ao seguinte. */
export function xpParaProximo(prog: ProgressionDef, level: number): number {
  return Math.round(prog.xpBase * Math.pow(level, prog.xpExpoente));
}

export function createHunter(content: GameContent): HunterState {
  const prog = content.progressao;
  const atributos = Object.fromEntries(ATRIBUTOS.map((a) => [a, prog.atributoInicial])) as Record<
    AtributoId,
    number
  >;
  const iniciais = Object.values(content.habilidades)
    .filter((h) => h.desbloqueio <= 1 && !h.classe)
    .slice(0, prog.espacosDeHabilidade)
    .map((h) => h.id);
  return {
    classe: 'vigia',
    level: 1,
    xp: 0,
    pontosLivres: 0,
    atributos,
    niveisHabilidade: {},
    equipadas: iniciais,
    comportamento: { ...COMPORTAMENTO_PADRAO },
    equipamento: {},
  };
}

export interface XpResult {
  cacador: HunterState;
  levelsGanhos: number;
}

/**
 * Soma XP e sobe quantos levels couberem. No level máximo o XP para de acumular.
 * Habilidades desbloqueadas entram sozinhas num espaço vazio.
 */
export function gainXp(cacador: HunterState, content: GameContent, xp: number): XpResult {
  const prog = content.progressao;
  const c: HunterState = structuredClone(cacador);
  let levelsGanhos = 0;
  if (xp > 0 && c.level < prog.levelMax) c.xp += Math.floor(xp);
  while (c.level < prog.levelMax && c.xp >= xpParaProximo(prog, c.level)) {
    c.xp -= xpParaProximo(prog, c.level);
    c.level++;
    c.pontosLivres += prog.pontosPorLevel;
    levelsGanhos++;
  }
  if (c.level >= prog.levelMax) c.xp = 0;
  if (levelsGanhos > 0) autoEquipNew(c, content, cacador.level);
  return { cacador: c, levelsGanhos };
}

function autoEquipNew(c: HunterState, content: GameContent, levelAnterior: number): void {
  for (const h of Object.values(content.habilidades)) {
    const nova =
      h.desbloqueio > levelAnterior &&
      h.desbloqueio <= c.level &&
      (!h.classe || h.classe === classOf(c));
    if (nova && c.equipadas.length < content.progressao.espacosDeHabilidade) {
      c.equipadas.push(h.id);
    }
  }
}

export function classOf(c: { classe?: ClasseId | undefined }): ClasseId {
  return c.classe ?? 'vigia';
}

/**
 * Troca de classe (grátis). Saem as exclusivas da classe antiga; as exclusivas
 * da nova já liberadas pelo level entram primeiro, e as comuns completam.
 */
export function chooseClass(
  cacador: HunterState,
  content: GameContent,
  classe: ClasseId,
): HunterResult {
  if (!content.classes[classe]) return { erro: 'Classe desconhecida.' };
  const c = structuredClone(cacador);
  c.classe = classe;
  // As exclusivas da classe nova vêm primeiro; as comuns que já estavam completam.
  const daClasse = Object.values(content.habilidades)
    .filter((h) => h.classe === classe && h.desbloqueio <= c.level)
    .map((h) => h.id);
  const comuns = c.equipadas.filter((id) => {
    const h = content.habilidades[id];
    return h && !h.classe;
  });
  c.equipadas = [...daClasse.slice(0, 2), ...comuns, ...daClasse.slice(2)];
  c.equipadas = c.equipadas.slice(0, content.progressao.espacosDeHabilidade);
  return { cacador: c };
}

export type HunterResult =
  { cacador: HunterState; erro?: undefined } | { cacador?: undefined; erro: string };

/** Gasta (delta > 0) ou devolve (delta < 0) pontos de um atributo. */
export function changeAttribute(
  cacador: HunterState,
  content: GameContent,
  atributo: AtributoId,
  delta: number,
): HunterResult {
  if (!Number.isInteger(delta) || delta === 0) return { erro: 'Quantidade inválida.' };
  if (delta > 0 && cacador.pontosLivres < delta) return { erro: 'Pontos insuficientes.' };
  const novo = cacador.atributos[atributo] + delta;
  if (novo < content.progressao.atributoInicial) {
    return { erro: 'O atributo não pode ficar abaixo do valor inicial.' };
  }
  const c = structuredClone(cacador);
  c.atributos[atributo] = novo;
  c.pontosLivres -= delta;
  return { cacador: c };
}

/** Devolve todos os pontos gastos (grátis neste protótipo). */
export function resetAttributes(cacador: HunterState, content: GameContent): HunterState {
  const c = structuredClone(cacador);
  const inicial = content.progressao.atributoInicial;
  for (const a of ATRIBUTOS) {
    c.pontosLivres += c.atributos[a] - inicial;
    c.atributos[a] = inicial;
  }
  return c;
}
