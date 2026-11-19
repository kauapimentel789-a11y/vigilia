import { describe, expect, it } from 'vitest';
import { createRng, restoreRng } from '../../../src/engine/core';

const sequence = (seed: number, length = 10) => {
  const rng = createRng(seed);
  return Array.from({ length }, () => rng.next());
};

describe('Rng', () => {
  it('gera a mesma sequência para a mesma semente', () => {
    expect(sequence(42)).toEqual(sequence(42));
  });

  it('gera sequências diferentes para sementes diferentes', () => {
    expect(sequence(42)).not.toEqual(sequence(43));
  });

  it('gera decimais no intervalo [0, 1)', () => {
    for (const value of sequence(7, 1000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('int respeita os limites e alcança os dois extremos', () => {
    const rng = createRng(1);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      const value = rng.int(1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('int rejeita intervalos inválidos', () => {
    const rng = createRng(1);
    expect(() => rng.int(5, 1)).toThrow(RangeError);
    expect(() => rng.int(0.5, 2)).toThrow(RangeError);
  });

  it('pick rejeita lista vazia e escolhe um item da lista', () => {
    const rng = createRng(3);
    expect(() => rng.pick([])).toThrow(RangeError);
    expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']));
  });

  it('shuffle é determinístico, mantém os itens e não altera a lista original', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = createRng(99).shuffle(original);
    const b = createRng(99).shuffle(original);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual(original);
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('restaurar o estado continua a sequência exatamente do mesmo ponto', () => {
    const rng = createRng(2024);
    rng.next();
    rng.next();
    const saved = rng.getState();
    const expected = [rng.next(), rng.next(), rng.next()];

    const restored = restoreRng(saved);
    expect([restored.next(), restored.next(), restored.next()]).toEqual(expected);
  });
});
