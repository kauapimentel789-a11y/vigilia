import { describe, expect, it } from 'vitest';
import { Tile, gateAt, isWalkable, parseMap, tileAt } from '../../../src/engine/world/map.ts';
import { hasLineOfSight } from '../../../src/engine/world/los.ts';
import { canStep, findPath } from '../../../src/engine/world/path.ts';

const MAPA = parseMap(
  'teste',
  ['#########', '#@..#...#', '#...#.c.#', '#.......#', '#~~~#..1#', '#########'],
  { monstros: { c: 'carnical' }, portoes: { '1': { destino: 'outro', rotulo: 'Outro' } } },
);

describe('parseMap', () => {
  it('lê tamanho, início, monstros e portões', () => {
    expect(MAPA.largura).toBe(9);
    expect(MAPA.altura).toBe(6);
    expect(MAPA.inicio).toEqual({ x: 1, y: 1 });
    expect(MAPA.spawns).toEqual([{ defId: 'carnical', x: 6, y: 2, chefe: false }]);
    expect(gateAt(MAPA, 7, 4)).toEqual({ destino: 'outro', rotulo: 'Outro' });
    expect(tileAt(MAPA, 1, 4)).toBe(Tile.Agua);
  });

  it('o tile do monstro e do início é chão; parede e água bloqueiam', () => {
    expect(isWalkable(MAPA, 6, 2)).toBe(true);
    expect(isWalkable(MAPA, 1, 1)).toBe(true);
    expect(isWalkable(MAPA, 4, 1)).toBe(false);
    expect(isWalkable(MAPA, 2, 4)).toBe(false);
    expect(isWalkable(MAPA, -1, 0)).toBe(false);
  });

  it('recusa linhas de tamanhos diferentes e caracteres desconhecidos', () => {
    expect(() => parseMap('x', ['###', '##'], {})).toThrow();
    expect(() => parseMap('x', ['#@#', '#?#'], {})).toThrow();
  });
});

describe('linha de visão', () => {
  it('parede bloqueia, água não', () => {
    expect(hasLineOfSight(MAPA, 3, 1, 5, 1)).toBe(false);
    expect(hasLineOfSight(MAPA, 1, 3, 3, 3)).toBe(true);
    expect(hasLineOfSight(MAPA, 1, 3, 3, 5 - 1)).toBe(true);
  });
});

describe('caminho', () => {
  it('não corta quina de parede na diagonal', () => {
    expect(canStep(MAPA, 5, 3, 1, -1, () => false)).toBe(true);
    // (3,2) → (4,3) roçaria a parede em (4,2).
    expect(canStep(MAPA, 3, 2, 1, 1, () => false)).toBe(false);
    expect(canStep(MAPA, 3, 3, 1, -1, () => false)).toBe(false);
  });

  it('contorna a parede e chega ao destino', () => {
    const p = findPath(MAPA, 1, 1, 6, 1, {});
    expect(p).not.toBeNull();
    const fim = p?.at(-1);
    expect(fim).toEqual([6, 1]);
    // Precisa descer até a linha 3 para passar pela parede.
    expect(p?.some(([, y]) => y === 3)).toBe(true);
  });

  it('para a N tiles do destino quando pedido', () => {
    const p = findPath(MAPA, 1, 1, 6, 2, { parar: 1 });
    const fim = p?.at(-1) as [number, number];
    expect(Math.max(Math.abs(fim[0] - 6), Math.abs(fim[1] - 2))).toBeLessThanOrEqual(1);
  });

  it('devolve null se o destino é inalcançável', () => {
    expect(findPath(MAPA, 1, 1, 2, 4, {})).toBeNull();
  });
});
