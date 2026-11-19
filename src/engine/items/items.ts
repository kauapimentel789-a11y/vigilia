/**
 * Itens: sorteio de saque, nomes e o que cada item soma ao caçador.
 *
 * Um item guardado é só { base, raridade, afixos }: os números vêm do conteúdo,
 * então ajustar um item base muda também os itens que o jogador já tem.
 */
import type { Rng } from '../core/index.ts';
import type {
  AffixDef,
  GameContent,
  ItemBaseDef,
  ItemStatId,
  ItemStats,
  Raridade,
  SlotId,
} from '../definitions.ts';
import { RARIDADES } from '../definitions.ts';

export interface ItemInstance {
  uid: string;
  base: string;
  raridade: Raridade;
  afixos: Array<{ id: string; valor: number }>;
}

export type Equipamento = Partial<Record<SlotId, ItemInstance>>;

/** Stats que são frações (mostrados em %). */
export const STATS_FRACAO: ReadonlySet<ItemStatId> = new Set([
  'reducao',
  'critico',
  'danoCritico',
  'poder',
  'rouboVida',
]);

export function baseOf(content: GameContent, item: ItemInstance): ItemBaseDef | undefined {
  return content.itens.bases[item.base];
}

function roundStat(stat: ItemStatId, v: number): number {
  return STATS_FRACAO.has(stat) ? Math.round(v * 1000) / 1000 : Math.round(v);
}

/** Tudo que um item soma, já com a raridade aplicada. */
export function itemStats(content: GameContent, item: ItemInstance): ItemStats {
  const base = baseOf(content, item);
  if (!base) return {};
  const mult = content.itens.raridades[item.raridade].multBase;
  const out: ItemStats = {};
  for (const [k, v] of Object.entries(base.stats) as Array<[ItemStatId, number]>) {
    out[k] = roundStat(k, v * mult);
  }
  for (const a of item.afixos) {
    const def = content.itens.afixos[a.id];
    if (def) out[def.stat] = roundStat(def.stat, (out[def.stat] ?? 0) + a.valor);
  }
  return out;
}

export function sumStats(lista: readonly ItemStats[]): ItemStats {
  const out: ItemStats = {};
  for (const s of lista) {
    for (const [k, v] of Object.entries(s) as Array<[ItemStatId, number]>) {
      out[k] = roundStat(k, (out[k] ?? 0) + v);
    }
  }
  return out;
}

export function equipmentStats(content: GameContent, eq: Equipamento): ItemStats {
  return sumStats(
    Object.values(eq)
      .filter((i): i is ItemInstance => !!i)
      .map((i) => itemStats(content, i)),
  );
}

export function itemName(content: GameContent, item: ItemInstance): string {
  const base = baseOf(content, item);
  const nome = base?.nome ?? 'Item desconhecido';
  const sufixos = item.afixos.map((a) => content.itens.afixos[a.id]?.nome).filter(Boolean);
  return sufixos.length > 0 ? `${nome} ${sufixos.join(' e ')}` : nome;
}

export function sellValue(content: GameContent, item: ItemInstance): number {
  const base = baseOf(content, item);
  if (!base) return 0;
  return Math.round(base.valor * content.itens.raridades[item.raridade].multValor);
}

function pickWeighted<T>(rng: Rng, opcoes: ReadonlyArray<readonly [T, number]>): T | undefined {
  const total = opcoes.reduce((s, [, p]) => s + p, 0);
  let r = rng.next() * total;
  for (const [x, p] of opcoes) {
    r -= p;
    if (r < 0) return x;
  }
  return opcoes.at(-1)?.[0];
}

function rollAffix(def: AffixDef, nivel: number, rng: Rng): number {
  const bruto = def.min + rng.next() * (def.max - def.min) + def.porNivel * (nivel - 1);
  const v = roundStat(def.stat, bruto);
  return STATS_FRACAO.has(def.stat) ? Math.max(0.001, v) : Math.max(1, v);
}

/**
 * Sorteia um item da tabela de um portal. `minimo` força uma raridade mínima
 * (o chefe). Devolve undefined se o portal não tem itens.
 */
export function rollItem(
  content: GameContent,
  portalId: string,
  rng: Rng,
  uid: string,
  minimo: Raridade = 'comum',
): ItemInstance | undefined {
  const it = content.itens;
  const faixas = it.saquePorPortal[portalId] ?? [];
  const bases = Object.values(it.bases).filter((b) => faixas.includes(b.nivel));
  if (bases.length === 0) return undefined;
  const base = bases[Math.floor(rng.next() * bases.length)] as ItemBaseDef;
  const piso = RARIDADES.indexOf(minimo);
  const raridade =
    pickWeighted(
      rng,
      RARIDADES.filter((_, i) => i >= piso).map((r) => [r, it.raridades[r].peso] as const),
    ) ?? minimo;
  const possiveis = Object.values(it.afixos).filter((a) => !a.slots || a.slots.includes(base.slot));
  const afixos: ItemInstance['afixos'] = [];
  for (let i = 0; i < it.raridades[raridade].afixos && possiveis.length > 0; i++) {
    const def = possiveis.splice(Math.floor(rng.next() * possiveis.length), 1)[0] as AffixDef;
    afixos.push({ id: def.id, valor: rollAffix(def, base.nivel, rng) });
  }
  return { uid, base: base.id, raridade, afixos };
}
