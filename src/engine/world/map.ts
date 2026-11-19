/**
 * Mapa em grade de tiles.
 *
 * Um mapa é descrito no conteúdo como linhas de texto (um caractere por tile),
 * o que deixa fácil desenhar e editar mapas novos. Aqui ele vira uma grade
 * numérica que o resto do motor consulta.
 */

export const Tile = {
  Chao: 0,
  Parede: 1,
  Agua: 2,
  Portao: 3,
  ChaoDetalhe: 4,
} as const;
export type Tile = (typeof Tile)[keyof typeof Tile];

/** Caracteres fixos de tile. Outros caracteres vêm da legenda do mapa (monstros, portões). */
const TILES_FIXOS: Record<string, Tile> = {
  '.': Tile.Chao,
  ',': Tile.ChaoDetalhe,
  '#': Tile.Parede,
  '~': Tile.Agua,
  '@': Tile.Chao,
};

export interface MapGate {
  /** Para onde o portão leva: id de um mapa. */
  destino: string;
  rotulo: string;
}

export interface MapSpawn {
  defId: string;
  x: number;
  y: number;
  chefe: boolean;
}

export interface WorldMap {
  id: string;
  largura: number;
  altura: number;
  tiles: Tile[];
  inicio: { x: number; y: number };
  portoes: Record<number, MapGate>;
  spawns: MapSpawn[];
}

/** Legenda que o conteúdo usa para descrever um mapa. */
export interface MapLegend {
  /** Caractere → id do inimigo. */
  monstros?: Record<string, string>;
  /** Caractere → id do inimigo chefe. */
  chefes?: Record<string, string>;
  /** Caractere → portão. */
  portoes?: Record<string, MapGate>;
}

export function parseMap(id: string, linhas: readonly string[], legenda: MapLegend = {}): WorldMap {
  const altura = linhas.length;
  const largura = Math.max(...linhas.map((l) => l.length));
  const tiles: Tile[] = new Array<Tile>(largura * altura).fill(Tile.Parede);
  const portoes: Record<number, MapGate> = {};
  const spawns: MapSpawn[] = [];
  let inicio: { x: number; y: number } | null = null;

  for (let y = 0; y < altura; y++) {
    const linha = linhas[y] as string;
    for (let x = 0; x < largura; x++) {
      const c = linha[x] ?? '#';
      const i = y * largura + x;
      if (c in TILES_FIXOS) {
        tiles[i] = TILES_FIXOS[c] as Tile;
        if (c === '@') inicio = { x, y };
      } else if (legenda.monstros?.[c]) {
        tiles[i] = Tile.Chao;
        spawns.push({ defId: legenda.monstros[c], x, y, chefe: false });
      } else if (legenda.chefes?.[c]) {
        tiles[i] = Tile.Chao;
        spawns.push({ defId: legenda.chefes[c], x, y, chefe: true });
      } else if (legenda.portoes?.[c]) {
        tiles[i] = Tile.Portao;
        portoes[i] = legenda.portoes[c];
      } else {
        throw new Error(`Mapa ${id}: caractere desconhecido "${c}" em (${x}, ${y})`);
      }
    }
  }
  if (!inicio) throw new Error(`Mapa ${id}: falta o ponto de início "@"`);
  return { id, largura, altura, tiles, inicio, portoes, spawns };
}

export function inBounds(m: WorldMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < m.largura && y < m.altura;
}

export function tileAt(m: WorldMap, x: number, y: number): Tile {
  return inBounds(m, x, y) ? (m.tiles[y * m.largura + x] as Tile) : Tile.Parede;
}

/** Dá para pisar no tile? (ignora quem está em cima) */
export function isWalkable(m: WorldMap, x: number, y: number): boolean {
  const t = tileAt(m, x, y);
  return t === Tile.Chao || t === Tile.ChaoDetalhe || t === Tile.Portao;
}

/** O tile bloqueia a visão? Água não bloqueia; parede sim. */
export function isOpaque(m: WorldMap, x: number, y: number): boolean {
  return tileAt(m, x, y) === Tile.Parede;
}

export function gateAt(m: WorldMap, x: number, y: number): MapGate | undefined {
  return inBounds(m, x, y) ? m.portoes[y * m.largura + x] : undefined;
}

/** Distância em tiles contando diagonais como 1 (vizinhança de 8). */
export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}
