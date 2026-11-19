/** Linha de visão entre dois tiles (algoritmo de Bresenham). */
import type { WorldMap } from './map.ts';
import { isOpaque } from './map.ts';

export function hasLineOfSight(
  m: WorldMap,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (!(x === x1 && y === y1)) {
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
    // O tile de destino pode ser opaco (ex.: monstro encostado numa parede não existe, mas por segurança).
    if (!(x === x1 && y === y1) && isOpaque(m, x, y)) return false;
  }
  return true;
}
