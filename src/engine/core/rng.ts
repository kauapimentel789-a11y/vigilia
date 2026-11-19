import type { Seed } from './types';

/**
 * Gerador de números aleatórios determinístico (algoritmo mulberry32).
 *
 * A mesma semente sempre produz a mesma sequência. Isso permite reproduzir
 * combates, testar balanceamento e, no futuro, validar resultados num servidor.
 * Nunca use Math.random() dentro do motor: use sempre um Rng.
 */
export interface Rng {
  /** Número decimal em [0, 1). */
  next(): number;
  /** Inteiro entre min e max, ambos inclusos. */
  int(min: number, max: number): number;
  /** Um item aleatório de uma lista não vazia. */
  pick<T>(items: readonly T[]): T;
  /** Uma cópia embaralhada da lista (a original não é alterada). */
  shuffle<T>(items: readonly T[]): T[];
  /** Estado interno atual, para salvar e restaurar a sequência exatamente deste ponto. */
  getState(): number;
}

export function createRng(seed: Seed): Rng {
  return restoreRng(seed >>> 0);
}

export function restoreRng(savedState: number): Rng {
  let state = savedState >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Intervalo inválido: [${min}, ${max}]`);
    }
    return min + Math.floor(next() * (max - min + 1));
  };

  return {
    next,
    int,
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) {
        throw new RangeError('Não é possível sortear de uma lista vazia.');
      }
      return items[int(0, items.length - 1)] as T;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = int(0, i);
        [result[i], result[j]] = [result[j] as T, result[i] as T];
      }
      return result;
    },
    getState: () => state,
  };
}
