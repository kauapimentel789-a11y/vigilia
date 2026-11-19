/** Textos e cores dos itens na interface. */
import { CONTEUDO } from '../content/index.ts';
import type { ItemStatId, ItemStats, Raridade, SlotId } from '../engine/definitions.ts';
import type { ItemInstance } from '../engine/items/items.ts';
import { STATS_FRACAO, itemName, itemStats } from '../engine/items/items.ts';

export const NOME_SLOT: Record<SlotId, string> = {
  arma: 'Arma',
  cabeca: 'Cabeça',
  peito: 'Peito',
  maos: 'Mãos',
  pes: 'Pés',
  amuleto: 'Amuleto',
};

export const NOME_RARIDADE: Record<Raridade, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  rara: 'Rara',
};

export const COR_RARIDADE: Record<Raridade, string> = {
  comum: '#b9bed0',
  incomum: '#4fa3c7',
  rara: '#b07cf6',
};

const NOME_STAT: Record<ItemStatId, string> = {
  forca: 'Força',
  agilidade: 'Agilidade',
  vigor: 'Vigor',
  percepcao: 'Percepção',
  vontade: 'Vontade',
  vida: 'Vida',
  ataque: 'Ataque',
  reducao: 'Redução de dano',
  critico: 'Crítico',
  danoCritico: 'Dano crítico',
  velocidade: 'Velocidade',
  poder: 'Poder das habilidades',
  rouboVida: 'Roubo de vida',
  venenoAoAcertar: 'Veneno ao acertar',
};

export function statValue(k: ItemStatId, v: number): string {
  const sinal = v >= 0 ? '+' : '−';
  const abs = Math.abs(v);
  return STATS_FRACAO.has(k)
    ? `${sinal}${(abs * 100).toFixed(abs * 100 < 10 ? 1 : 0).replace('.0', '')}%`
    : `${sinal}${abs}`;
}

export function statLines(
  stats: ItemStats,
): Array<{ id: ItemStatId; nome: string; valor: number }> {
  return (Object.entries(stats) as Array<[ItemStatId, number]>)
    .filter(([, v]) => v !== 0)
    .map(([id, valor]) => ({ id, nome: NOME_STAT[id], valor }));
}

/** Diferença de um item para o que está vestido no mesmo espaço. */
export function compareStats(novo: ItemStats, atual: ItemStats): ItemStats {
  const out: ItemStats = {};
  for (const k of new Set([...Object.keys(novo), ...Object.keys(atual)]) as Set<ItemStatId>) {
    const d = (novo[k] ?? 0) - (atual[k] ?? 0);
    if (Math.abs(d) > 1e-9) out[k] = Math.round(d * 1000) / 1000;
  }
  return out;
}

export const nomeItem = (i: ItemInstance) => itemName(CONTEUDO, i);
export const statsItem = (i: ItemInstance) => itemStats(CONTEUDO, i);
export const slotItem = (i: ItemInstance): SlotId | undefined => CONTEUDO.itens.bases[i.base]?.slot;
