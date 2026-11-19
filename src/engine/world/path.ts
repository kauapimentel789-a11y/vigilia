/**
 * Caminho mais curto entre dois tiles (A*), com 8 direções.
 * Diagonais não "cortam quina": só dá para ir na diagonal se os dois lados estão livres.
 */
import type { WorldMap } from './map.ts';
import { chebyshev, isWalkable } from './map.ts';

export const DIRECOES: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/** Pode dar um passo de (x, y) na direção (dx, dy)? `ocupado` diz se há alguém no tile. */
export function canStep(
  m: WorldMap,
  x: number,
  y: number,
  dx: number,
  dy: number,
  ocupado: (x: number, y: number) => boolean,
): boolean {
  const nx = x + dx;
  const ny = y + dy;
  if (!isWalkable(m, nx, ny) || ocupado(nx, ny)) return false;
  if (dx !== 0 && dy !== 0) {
    if (!isWalkable(m, x + dx, y) || !isWalkable(m, x, y + dy)) return false;
  }
  return true;
}

export interface PathOptions {
  /** Tiles ocupados por outras unidades (o destino é sempre permitido). */
  ocupado?: (x: number, y: number) => boolean;
  /** Para quando chegar a esta distância do destino (1 = ficar ao lado). */
  parar?: number;
  /** Limite de tiles explorados, para não travar em mapas grandes. */
  limite?: number;
}

/** Retorna os tiles do caminho (sem o de partida), ou null se não houver caminho. */
export function findPath(
  m: WorldMap,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  opts: PathOptions = {},
): Array<[number, number]> | null {
  const parar = opts.parar ?? 0;
  const limite = opts.limite ?? 4000;
  const ocupado = opts.ocupado ?? (() => false);
  if (chebyshev(sx, sy, tx, ty) <= parar) return [];
  const W = m.largura;
  const inicio = sy * W + sx;
  const g = new Map<number, number>([[inicio, 0]]);
  const veio = new Map<number, number>();
  // Fila de prioridade simples (heap binário) por f = g + h.
  const heap: Array<[number, number]> = [[chebyshev(sx, sy, tx, ty), inicio]];
  const push = (item: [number, number]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if ((heap[p] as [number, number])[0] <= item[0]) break;
      heap[i] = heap[p] as [number, number];
      i = p;
    }
    heap[i] = item;
  };
  const pop = (): [number, number] => {
    const topo = heap[0] as [number, number];
    const ultimo = heap.pop() as [number, number];
    const n = heap.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let menor = -1;
        let valor = ultimo[0];
        if (l < n && (heap[l] as [number, number])[0] < valor) {
          menor = l;
          valor = (heap[l] as [number, number])[0];
        }
        if (r < n && (heap[r] as [number, number])[0] < valor) menor = r;
        if (menor < 0) break;
        heap[i] = heap[menor] as [number, number];
        i = menor;
      }
      heap[i] = ultimo;
    }
    return topo;
  };

  let explorados = 0;
  while (heap.length > 0 && explorados < limite) {
    const [, atual] = pop();
    explorados++;
    const cx = atual % W;
    const cy = (atual - cx) / W;
    if (chebyshev(cx, cy, tx, ty) <= parar) {
      const caminho: Array<[number, number]> = [];
      let n = atual;
      while (n !== inicio) {
        caminho.push([n % W, Math.floor(n / W)]);
        n = veio.get(n) as number;
      }
      return caminho.reverse();
    }
    const gAtual = g.get(atual) as number;
    for (const [dx, dy] of DIRECOES) {
      const nx = cx + dx;
      const ny = cy + dy;
      const destino = nx === tx && ny === ty;
      if (!canStep(m, cx, cy, dx, dy, (x, y) => !destino && ocupado(x, y))) continue;
      const n = ny * W + nx;
      const custo = gAtual + (dx !== 0 && dy !== 0 ? 1.41 : 1);
      if (custo < (g.get(n) ?? Infinity)) {
        g.set(n, custo);
        veio.set(n, atual);
        push([custo + chebyshev(nx, ny, tx, ty), n]);
      }
    }
  }
  return null;
}
