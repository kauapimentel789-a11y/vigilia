/**
 * Desenho do mapa em Canvas 2D. Visual provisório, todo feito em código.
 *
 * Só lê a sessão: não muda nada no mundo. A câmera segue o caçador com o
 * movimento interpolado entre tiles.
 */
import { CONTEUDO } from '../../../content/index.ts';
import type { RtActor } from '../../../engine/realtime/state.ts';
import { ECO, HEROI, heroOf } from '../../../engine/realtime/state.ts';
import { ENIGMA_MOSTRA_MS, actorEnemyDef, loadMap } from '../../../engine/realtime/world.ts';
import type { WorldMap } from '../../../engine/world/map.ts';
import { Tile } from '../../../engine/world/map.ts';
import type { Magia, Sessao } from './session.ts';
import { AMBIENTES, drawAmbiente, drawRaios } from './ambiente.ts';
import { isPortalOpen } from '../../../engine/game/game.ts';
import { useGame } from '../../store/game.ts';
import { APARENCIA, aparenciaDaClasse, drawSprite, tom } from '../../art/sprites.ts';
import { COR_AFINIDADE } from '../../art/afinidade.ts';

export const TILE = 36;

export interface Camera {
  /** Canto superior esquerdo da tela, em pixels do mundo. */
  x: number;
  y: number;
  largura: number;
  altura: number;
}

const COR_BASE = {
  vazio: '#05060a',
  chao: '#1a1e2b',
  chaoB: '#181c28',
  detalhe: '#232838',
  paredeTopo: '#2e3449',
  paredeFace: '#131622',
  paredeSombra: 'rgba(0,0,0,0.4)',
  agua: '#10283f',
  aguaBrilho: 'rgba(120,180,230,0.22)',
  portao: '#8b7cf6',
  heroi: '#8b7cf6',
  heroiCore: '#d9d3ff',
  vida: '#d4475e',
  vidaFundo: 'rgba(0,0,0,0.6)',
  alvo: '#e5536b',
  chefe: '#f2b56b',
  sombra: '5,6,12',
  luz: '255,214,160',
};

/** Paletas por tema de mapa. Na Brasa, a água vira lava. */
const TEMAS: Record<string, Partial<typeof COR_BASE>> = {
  cinza: {},
  brasa: {
    chao: '#221b1b',
    chaoB: '#1f1818',
    detalhe: '#3a2620',
    paredeTopo: '#3b2d2a',
    paredeFace: '#170f0e',
    agua: '#5c1d0c',
    aguaBrilho: 'rgba(255,160,70,0.5)',
    sombra: '10,4,4',
    luz: '255,170,110',
  },
  veu: {
    chao: '#16222a',
    chaoB: '#142027',
    detalhe: '#1f3440',
    paredeTopo: '#24404a',
    paredeFace: '#0c171d',
    agua: '#0d3a44',
    aguaBrilho: 'rgba(120,230,220,0.3)',
    portao: '#4fd1c5',
    sombra: '3,8,12',
    luz: '170,235,230',
  },
};

let COR = COR_BASE;

/** Canvas de apoio para a escuridão com várias luzes. */
let escuro: HTMLCanvasElement | null = null;
/** O mapa desenhado agora é o Posto (sem ossos no chão). */
let ehPosto = false;

const COR_RARIDADE_ITEM = { comum: '#c9cedd', incomum: '#4fa3c7', rara: '#b07cf6' } as const;

/** Hash estável por tile, para os detalhes do chão não piscarem. */
function hash(x: number, y: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Posição em tiles (fracionária) de um ator, interpolando o passo atual. */
export function actorPos(a: RtActor, alpha: number, tickMs: number): [number, number] {
  if (a.moverTotal <= 0) return [a.x, a.y];
  const resta = Math.max(0, a.moverRestante - alpha * tickMs);
  const p = 1 - resta / a.moverTotal;
  return [a.deX + (a.x - a.deX) * p, a.deY + (a.y - a.deY) * p];
}

export function cameraFor(s: Sessao, largura: number, altura: number, alpha: number): Camera {
  const [hx, hy] = actorPos(heroOf(s.w), alpha, CONTEUDO.mundo.tickMs);
  // Sempre centrada no caçador; fora do mapa é escuro.
  return {
    x: (hx + 0.5) * TILE - largura / 2,
    y: (hy + 0.5) * TILE - altura / 2,
    largura,
    altura,
  };
}

function drawTile(
  ctx: CanvasRenderingContext2D,
  m: WorldMap,
  x: number,
  y: number,
  px: number,
  py: number,
  t: number,
) {
  const tile = m.tiles[y * m.largura + x];
  const r = hash(x, y);
  if (tile === Tile.Parede) {
    const topo = TILE * 0.62;
    const abaixo = y + 1 < m.altura ? m.tiles[(y + 1) * m.largura + x] : Tile.Parede;
    const faceVisivel = abaixo !== Tile.Parede;
    // Topo da parede: pedra mais clara com textura.
    ctx.fillStyle = COR.paredeTopo;
    ctx.fillRect(px, py, TILE, faceVisivel ? topo : TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.fillRect(px + 3 + r * 12, py + 4 + r * 9, 9, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(px + 18 - r * 10, py + 12 + r * 6, 7, 3);
    if (faceVisivel) {
      // Face: tijolos em fileiras desencontradas, mais escuros embaixo.
      const fh = TILE - topo;
      ctx.fillStyle = COR.paredeFace;
      ctx.fillRect(px, py + topo, TILE, fh);
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      const fileira = fh / 2;
      ctx.fillRect(px, py + topo + fileira, TILE, 1);
      for (let f = 0; f < 2; f++) {
        const des = (x + f) % 2 === 0 ? 0 : TILE / 3;
        for (let k = 0; k < 3; k++) {
          const bx = px + ((des + (k * TILE) / 1.5) % TILE);
          ctx.fillRect(bx, py + topo + f * fileira, 1, fileira);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(px, py + topo, TILE, 1);
      const g = ctx.createLinearGradient(0, py + topo, 0, py + TILE);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = g;
      ctx.fillRect(px, py + topo, TILE, fh);
      // Tocha presa na parede (algumas paredes).
      if (temTocha(m, x, y)) drawTocha(ctx, px + TILE / 2, py + topo + 2, t, r);
    }
    // Borda iluminada no topo, só onde não há outra parede acima.
    if (y === 0 || m.tiles[(y - 1) * m.largura + x] !== Tile.Parede) {
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(px, py, TILE, 2);
    }
    return;
  }
  // Lajes de pedra com tom variado, chanfro claro em cima e escuro embaixo.
  ctx.fillStyle = (x + y) % 2 === 0 ? COR.chao : COR.chaoB;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = r < 0.5 ? `rgba(255,255,255,${r * 0.05})` : `rgba(0,0,0,${(r - 0.5) * 0.14})`;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  ctx.fillRect(px, py + TILE - 1, TILE, 1);
  ctx.fillRect(px + TILE - 1, py, 1, TILE);
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  ctx.fillRect(px, py, TILE, 1);
  ctx.fillRect(px, py, 1, TILE);
  // Rachadura em algumas lajes.
  if (r > 0.62 && r < 0.72) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 6 + r * 10, py + 5);
    ctx.lineTo(px + 14, py + 15 + r * 4);
    ctx.lineTo(px + 11 + r * 8, py + 27);
    ctx.stroke();
  }
  // Água e objetos são desenhados depois, por cima do chão.
  if (tile === Tile.Agua || tile === Tile.Objeto) return;
  // Sombra da parede logo acima.
  if (y > 0 && m.tiles[(y - 1) * m.largura + x] === Tile.Parede) {
    ctx.fillStyle = COR.paredeSombra;
    ctx.fillRect(px, py, TILE, 7);
  }
  // Sombra das paredes vizinhas (canto mais escuro).
  if (x > 0 && m.tiles[y * m.largura + x - 1] === Tile.Parede) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(px, py, 5, TILE);
  }
  const enfeite = hash(x * 29 + 3, y * 31 + 7);
  if ((tile === Tile.ChaoDetalhe && enfeite < 0.45) || enfeite > 0.93)
    drawDecoracao(ctx, m, x, y, px, py, t, r);
}

function ehAgua(m: WorldMap, x: number, y: number): boolean {
  return (
    x >= 0 && y >= 0 && x < m.largura && y < m.altura && m.tiles[y * m.largura + x] === Tile.Agua
  );
}

/**
 * Lagos (ou lava) de uma vez só: a forma é a união de círculos nos tiles e pontes
 * entre vizinhos, então a margem sai arredondada, sem degraus. Os reflexos usam
 * coordenadas do mundo e correm contínuos pela superfície.
 */
function drawLagos(
  ctx: CanvasRenderingContext2D,
  m: WorldMap,
  tiles: ReadonlyArray<[number, number]>,
  t: number,
): void {
  if (tiles.length === 0) return;
  const lava = COR.aguaBrilho.startsWith('rgba(255');
  const r = TILE * 0.62;
  const forma = new Path2D();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of tiles) {
    const cx = (x + 0.5) * TILE;
    const cy = (y + 0.5) * TILE;
    forma.moveTo(cx + r, cy);
    forma.arc(cx, cy, r, 0, Math.PI * 2);
    if (ehAgua(m, x + 1, y)) forma.rect(cx, cy - r, TILE, r * 2);
    if (ehAgua(m, x, y + 1)) forma.rect(cx - r, cy, r * 2, TILE);
    if (ehAgua(m, x + 1, y) && ehAgua(m, x, y + 1) && ehAgua(m, x + 1, y + 1))
      forma.rect(cx, cy, TILE, TILE);
    minX = Math.min(minX, cx - r);
    minY = Math.min(minY, cy - r);
    maxX = Math.max(maxX, cx + r);
    maxY = Math.max(maxY, cy + r);
  }
  ctx.save();
  // Margem: traços largos por baixo; a água cobre a parte de dentro.
  ctx.strokeStyle = lava ? '#2a120c' : '#263246';
  ctx.lineWidth = 8;
  ctx.stroke(forma);
  ctx.strokeStyle = lava
    ? `rgba(255,190,110,${0.45 + 0.15 * Math.sin(t / 400)})`
    : `rgba(190,225,250,${0.3 + 0.1 * Math.sin(t / 700)})`;
  ctx.lineWidth = 3;
  ctx.stroke(forma);
  ctx.fillStyle = COR.agua;
  ctx.fill(forma);
  ctx.clip(forma);
  // Profundidade: mais escuro no meio, sem emendas entre tiles.
  const meioX = (minX + maxX) / 2;
  const meioY = (minY + maxY) / 2;
  const raio = Math.max(maxX - minX, maxY - minY) / 2;
  const fundo = ctx.createRadialGradient(meioX, meioY, 4, meioX, meioY, raio);
  fundo.addColorStop(0, lava ? 'rgba(255,170,70,0.35)' : 'rgba(0,0,0,0.3)');
  fundo.addColorStop(1, lava ? 'rgba(120,20,0,0)' : 'rgba(80,140,190,0.12)');
  ctx.fillStyle = fundo;
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  if (lava) {
    ctx.fillStyle = `rgba(255,150,60,${0.12 + 0.08 * Math.sin(t / 900)})`;
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  }
  // Reflexos: linhas onduladas que acendem e apagam devagar.
  const passo = 6;
  const esp = 9;
  ctx.lineWidth = lava ? 2 : 1.5;
  const onda = (wx: number, j: number) =>
    j * esp + 3 * Math.sin(wx / 23 + t / 900 + j * 1.7) + 1.5 * Math.sin(wx / 9 - t / 600 + j);
  for (let j = Math.floor(minY / esp); j <= Math.ceil(maxY / esp); j++) {
    for (let wx = Math.floor(minX / passo) * passo; wx < maxX; wx += passo) {
      const brilho = Math.sin(wx / 37 + j * 2.3 + t / 1300);
      if (brilho < 0.35) continue;
      const alfa = (brilho - 0.35) * (lava ? 0.7 : 0.4);
      ctx.strokeStyle = lava ? `rgba(255,190,90,${alfa})` : `rgba(150,205,240,${alfa})`;
      ctx.beginPath();
      ctx.moveTo(wx, onda(wx, j));
      ctx.lineTo(wx + passo, onda(wx + passo, j));
      ctx.stroke();
    }
  }
  // Cintilas.
  for (const [x, y] of tiles) {
    const h = hash(x * 7 + 1, y * 11 + 5);
    if (Math.sin(t / 500 + h * 40) <= 0.75) continue;
    ctx.fillStyle = lava ? 'rgba(255,230,160,0.9)' : 'rgba(230,245,255,0.85)';
    ctx.fillRect(x * TILE + 6 + h * 22, y * TILE + 8 + ((h * 97) % 1) * 18, 2, 2);
  }
  ctx.restore();
}

/** Portal: arco de pedra com um vórtice girando e fagulhas sendo puxadas para dentro. */
const COR_RANK: Record<string, string> = { cinza: '#8b7cf6', brasa: '#ff8a3c', veu: '#4fd1c5' };

function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function drawPortal(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  t: number,
  cor: string,
  fechado: boolean,
): void {
  const c = fechado
    ? rgb(cor)
        .split(',')
        .map((v) => Math.round(Number(v) * 0.35 + 120 * 0.65))
        .join(',')
    : rgb(cor);
  const cx = px + TILE / 2;
  const cy = py + TILE * 0.42;
  const rx = TILE * 0.36;
  const ry = TILE * 0.52;
  const vel = fechado ? 0.25 : 1;
  // Brilho no chão.
  const chao = ctx.createRadialGradient(cx, py + TILE * 0.85, 2, cx, py + TILE * 0.85, TILE * 0.8);
  chao.addColorStop(0, `rgba(${c},${fechado ? 0.12 : 0.35 + 0.1 * Math.sin(t / 400)})`);
  chao.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = chao;
  ctx.fillRect(px - TILE * 0.4, py + TILE * 0.3, TILE * 1.8, TILE * 0.9);
  // Pedras do arco.
  ctx.fillStyle = '#3a3f55';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx + 6, ry + 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4c5270';
  for (let i = 0; i < 9; i++) {
    const ang = Math.PI * (0.95 + (i / 8) * 1.1) - Math.PI * 0.5;
    const bx = cx + Math.cos(ang - Math.PI / 2) * (rx + 3);
    const by = cy + Math.sin(ang - Math.PI / 2) * (ry + 3);
    ctx.fillRect(bx - 3, by - 3, 6, 6);
  }
  // Vórtice.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, ry);
  g.addColorStop(0, fechado ? 'rgba(40,40,50,1)' : 'rgba(255,255,255,0.95)');
  g.addColorStop(0.35, `rgba(${c},${fechado ? 0.5 : 0.9})`);
  g.addColorStop(1, 'rgba(6,6,14,1)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  ctx.lineWidth = 2;
  for (let braco = 0; braco < 3; braco++) {
    ctx.strokeStyle = `rgba(${fechado ? c : '255,255,255'},${fechado ? 0.25 : 0.45})`;
    ctx.beginPath();
    for (let k = 0; k <= 1.001; k += 0.08) {
      const ang = (t / 500) * vel + (braco * Math.PI * 2) / 3 + k * 4.2;
      const xx = cx + Math.cos(ang) * rx * k;
      const yy = cy + Math.sin(ang) * ry * k;
      if (k === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
  // Fagulhas puxadas para o centro.
  if (!fechado) {
    for (let i = 0; i < 6; i++) {
      const fase = (t / 1400 + i / 6) % 1;
      const ang = i * 2.1 + fase * 5;
      const dist = (1 - fase) * 1.5;
      ctx.fillStyle = `rgba(${c},${fase})`;
      ctx.fillRect(
        cx + Math.cos(ang) * rx * dist - 1,
        cy + Math.sin(ang) * ry * dist - 1,
        2.5,
        2.5,
      );
    }
  } else {
    // Correntes de trancado.
    ctx.strokeStyle = 'rgba(160,160,175,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - rx, cy - ry * 0.6);
    ctx.lineTo(cx + rx, cy + ry * 0.6);
    ctx.moveTo(cx + rx, cy - ry * 0.6);
    ctx.lineTo(cx - rx, cy + ry * 0.6);
    ctx.stroke();
  }
}

/** Paredes com tocha: face visível, chão embaixo e espaçadas pelo hash. */
function temTocha(m: WorldMap, x: number, y: number): boolean {
  if (y + 1 >= m.altura) return false;
  const abaixo = m.tiles[(y + 1) * m.largura + x];
  if (abaixo === Tile.Parede || abaixo === Tile.Agua) return false;
  return hash(x * 3 + 17, y * 5 + 3) < 0.11;
}

function drawTocha(ctx: CanvasRenderingContext2D, cx: number, y: number, t: number, r: number) {
  ctx.fillStyle = '#4a3424';
  ctx.fillRect(cx - 2, y, 4, 9);
  ctx.fillStyle = '#2a1d14';
  ctx.fillRect(cx - 4, y + 7, 8, 2);
  const f = Math.sin(t / 90 + r * 20) * 1.5;
  const f2 = Math.sin(t / 57 + r * 11) * 1.2;
  ctx.fillStyle = '#ff7a2c';
  ctx.beginPath();
  ctx.moveTo(cx - 4, y + 1);
  ctx.quadraticCurveTo(cx - 3 + f2, y - 7, cx + f, y - 11);
  ctx.quadraticCurveTo(cx + 4 + f2, y - 5, cx + 4, y + 1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.moveTo(cx - 2, y + 1);
  ctx.quadraticCurveTo(cx - 1, y - 4, cx + f * 0.6, y - 7);
  ctx.quadraticCurveTo(cx + 2, y - 3, cx + 2, y + 1);
  ctx.closePath();
  ctx.fill();
}

/** Enfeites do chão: ossos, pedrinhas, cinza, mato seco, teias e brasas. */
function drawDecoracao(
  ctx: CanvasRenderingContext2D,
  m: WorldMap,
  x: number,
  y: number,
  px: number,
  py: number,
  t: number,
  r: number,
) {
  const brasa = COR.agua !== COR_BASE.agua;
  const posto = ehPosto;
  let tipo = Math.floor(hash(x * 13 + 5, y * 7 + 1) * 5);
  // Ossos são raros (e não aparecem no Posto).
  if (tipo === 0 && (posto || hash(x * 3 + 2, y * 11) > 0.3)) tipo = 1;
  const ox = px + 6 + hash(x, y * 3) * (TILE - 18);
  const oy = py + 8 + hash(y, x * 5) * (TILE - 18);
  const paredeAcima = y > 0 && m.tiles[(y - 1) * m.largura + x] === Tile.Parede;
  const paredeEsq = x > 0 && m.tiles[y * m.largura + x - 1] === Tile.Parede;
  if (paredeAcima && paredeEsq) {
    // Teia no canto.
    ctx.strokeStyle = 'rgba(220,220,235,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i <= 3; i++) {
      ctx.moveTo(px, py + i * 5);
      ctx.quadraticCurveTo(px + i * 3, py + i * 3, px + i * 5, py);
    }
    ctx.moveTo(px, py);
    ctx.lineTo(px + 16, py + 16);
    ctx.stroke();
    return;
  }
  if (tipo === 0) {
    // Osso.
    ctx.fillStyle = '#cfc6b0';
    ctx.fillRect(ox, oy + 2, 10, 2);
    ctx.fillRect(ox - 1, oy + 1, 3, 4);
    ctx.fillRect(ox + 9, oy + 1, 3, 4);
  } else if (tipo === 1) {
    // Pedrinhas.
    ctx.fillStyle = COR.detalhe;
    ctx.fillRect(ox, oy, 4, 3);
    ctx.fillRect(ox + 6, oy + 3, 3, 2);
    ctx.fillRect(ox + 2, oy + 6, 2, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(ox, oy, 4, 1);
  } else if (tipo === 2) {
    if (brasa) {
      // Brasa no chão, pulsando.
      const k = 0.5 + 0.5 * Math.sin(t / 400 + r * 9);
      ctx.fillStyle = `rgba(255,${120 + k * 60},60,${0.5 + 0.4 * k})`;
      ctx.fillRect(ox, oy, 3, 2);
      ctx.fillRect(ox + 4, oy + 2, 2, 2);
    } else {
      // Mato seco.
      ctx.strokeStyle = '#5a6a48';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(ox + i * 2, oy + 7);
        ctx.lineTo(ox + i * 2 + (i - 1.5), oy + 1 + (i % 2) * 2);
      }
      ctx.stroke();
    }
  } else if (tipo === 3) {
    // Montinho de cinza.
    ctx.fillStyle = brasa ? 'rgba(60,40,36,0.8)' : 'rgba(120,124,140,0.35)';
    ctx.beginPath();
    ctx.ellipse(ox + 5, oy + 5, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Poça escura.
    ctx.fillStyle = brasa ? 'rgba(90,20,10,0.4)' : 'rgba(10,20,35,0.45)';
    ctx.beginPath();
    ctx.ellipse(ox + 6, oy + 6, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,190,230,0.1)';
    ctx.fillRect(ox + 2, oy + 4, 4, 1);
  }
}

export const NOME_OBJETO: Record<string, string> = {
  mercadora: 'Mercadora',
  bau: 'Baú',
  altar: 'Altar',
  expedicao: 'Expedições',
  tesouro: '',
  relicario: 'Relicário',
};

/** Barraca da mercadora: toldo listrado, balcão com frascos e lanterna balançando. */
function drawMercadora(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number): void {
  const L = TILE * 0.82;
  const topo = cy - TILE * 0.86;
  // Luz quente em volta.
  const luz = ctx.createRadialGradient(cx, cy - 6, 2, cx, cy - 6, TILE * 1.1);
  luz.addColorStop(0, `rgba(242,181,107,${0.22 + 0.05 * Math.sin(t / 300)})`);
  luz.addColorStop(1, 'rgba(242,181,107,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(cx - TILE * 1.1, cy - TILE * 1.2, TILE * 2.2, TILE * 2.2);
  // Postes.
  ctx.fillStyle = '#4a3322';
  ctx.fillRect(cx - L, topo + 4, 3, TILE * 1.1);
  ctx.fillRect(cx + L - 3, topo + 4, 3, TILE * 1.1);
  // Mercadora: capuz roxo com borda clara, rosto na sombra, olhos acesos e mãos no balcão.
  const resp = Math.sin(t / 700) * 1;
  ctx.fillStyle = '#6a4a82';
  ctx.beginPath();
  ctx.moveTo(cx - 11, cy + 4);
  ctx.quadraticCurveTo(cx - 12, cy - 18 + resp, cx, cy - 21 + resp);
  ctx.quadraticCurveTo(cx + 12, cy - 18 + resp, cx + 11, cy + 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#a98bc4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 10 + resp, 6.5, 7, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  ctx.fillStyle = '#120c16';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 9 + resp, 5.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const piscou = Math.sin(t / 1900) > 0.97;
  if (!piscou) {
    ctx.fillStyle = '#ffd27a';
    ctx.fillRect(cx - 3, cy - 10 + resp, 2, 1.5);
    ctx.fillRect(cx + 1, cy - 10 + resp, 2, 1.5);
  }
  ctx.fillStyle = '#d8b89a';
  ctx.fillRect(cx - 8, cy - 4, 3, 2);
  ctx.fillRect(cx + 5, cy - 4, 3, 2);
  // Balcão com frascos.
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(cx - L, cy - 1, L * 2, 12);
  ctx.fillStyle = '#82593a';
  ctx.fillRect(cx - L, cy - 3, L * 2, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(cx - L, cy + 6, L * 2, 1);
  const frascos = ['#d4475e', '#4fa3c7', '#6fcf97', '#b07cf6'];
  frascos.forEach((f, i) => {
    const fx = cx - L + 5 + i * 7 + (i > 1 ? L : 0) * 0.55;
    ctx.fillStyle = f;
    ctx.fillRect(fx, cy - 9, 4, 6);
    ctx.fillStyle = '#d8ccb0';
    ctx.fillRect(fx + 1, cy - 11, 2, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(fx + 0.5, cy - 8, 1, 3);
  });
  // Toldo listrado com borda em ondas.
  const faixas = 6;
  const w = (L * 2 + 6) / faixas;
  for (let i = 0; i < faixas; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#8e2f3c' : '#d8ccb0';
    ctx.beginPath();
    ctx.moveTo(cx - L - 3 + i * w, topo + 10);
    ctx.lineTo(cx - L + 3 + i * w - 2, topo);
    ctx.lineTo(cx - L + 3 + (i + 1) * w - 2, topo);
    ctx.lineTo(cx - L - 3 + (i + 1) * w, topo + 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - L - 3 + (i + 0.5) * w, topo + 10, w / 2, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx - L - 3, topo + 10, L * 2 + 6, 1);
  // Lanterna pendurada, balançando.
  const bal = Math.sin(t / 650) * 0.25;
  const lx = cx + L + 2;
  const ly = topo + 8;
  const ex = lx + Math.sin(bal) * 10;
  const ey = ly + Math.cos(bal) * 10;
  ctx.strokeStyle = '#2a2220';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx, ly);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  const chama = 0.8 + 0.2 * Math.sin(t / 90);
  const brilho = ctx.createRadialGradient(ex, ey + 4, 1, ex, ey + 4, 14);
  brilho.addColorStop(0, `rgba(255,200,110,${0.7 * chama})`);
  brilho.addColorStop(1, 'rgba(255,200,110,0)');
  ctx.fillStyle = brilho;
  ctx.fillRect(ex - 14, ey - 10, 28, 28);
  ctx.fillStyle = '#2a2220';
  ctx.fillRect(ex - 3.5, ey, 7, 9);
  ctx.fillStyle = `rgba(255,214,140,${chama})`;
  ctx.fillRect(ex - 2, ey + 2, 4, 5);
}

const PALETA_BAU: Record<
  string,
  { madeira: string; tampa: string; ferro: string; brilho: string }
> = {
  posto: { madeira: '#6b4a2b', tampa: '#7d5632', ferro: '#5d6378', brilho: '190,180,255' },
  cinza: { madeira: '#5a4632', tampa: '#6b5238', ferro: '#8a8174', brilho: '220,205,170' },
  brasa: { madeira: '#2e2220', tampa: '#3d2c26', ferro: '#c8642a', brilho: '255,130,60' },
  veu: { madeira: '#1f5a5a', tampa: '#2a7070', ferro: '#e8d8b0', brilho: '120,230,220' },
};

/** Tema do mapa desenhado agora (baús e enfeites mudam com ele). */
let temaAtual = 'cinza';

/** Baú de madeira com cintas de ferro e tampa abaulada. O do Posto brilha de leve. */
function drawBau(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  tesouro: boolean,
  aberto: boolean,
): void {
  // Cada região tem o seu baú: madeira podre na Cinza, ferro queimado na Brasa, coral no Véu.
  const p = tesouro ? (PALETA_BAU[temaAtual] ?? PALETA_BAU.cinza!) : PALETA_BAU.posto!;
  const madeira = aberto ? tom(p.madeira, -0.35) : p.madeira;
  const tampa = aberto ? tom(p.tampa, -0.35) : p.tampa;
  const ferro = p.ferro;
  const W = 26;
  const top = cy - 2;
  if (!aberto) {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE * 0.75);
    const cor = p.brilho;
    g.addColorStop(0, `rgba(${cor},${0.18 + 0.1 * Math.sin(t / 380)})`);
    g.addColorStop(1, `rgba(${cor},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - TILE, cy - TILE, TILE * 2, TILE * 2);
  }
  // Corpo.
  ctx.fillStyle = madeira;
  ctx.fillRect(cx - W / 2, top, W, 13);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(cx - W / 2, top + 4, W, 1);
  ctx.fillRect(cx - W / 2, top + 8, W, 1);
  if (aberto) {
    // Tampa aberta para trás e interior vazio.
    ctx.fillStyle = tampa;
    ctx.fillRect(cx - W / 2, top - 12, W, 9);
    ctx.fillStyle = '#120d09';
    ctx.fillRect(cx - W / 2 + 2, top - 3, W - 4, 4);
  } else {
    // Tampa abaulada.
    ctx.fillStyle = tampa;
    ctx.beginPath();
    ctx.moveTo(cx - W / 2, top);
    ctx.lineTo(cx - W / 2, top - 5);
    ctx.quadraticCurveTo(cx, top - 15, cx + W / 2, top - 5);
    ctx.lineTo(cx + W / 2, top);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - W / 2 + 3, top - 5);
    ctx.quadraticCurveTo(cx, top - 13, cx + W / 2 - 3, top - 5);
    ctx.lineTo(cx + W / 2 - 3, top - 4);
    ctx.quadraticCurveTo(cx, top - 11, cx - W / 2 + 3, top - 4);
    ctx.fill();
  }
  // Cintas de ferro e rebites.
  ctx.fillStyle = ferro;
  for (const bx of [cx - W / 2 + 4, cx + W / 2 - 7]) {
    ctx.fillRect(bx, aberto ? top : top - 9, 3, aberto ? 13 : 22);
  }
  ctx.fillRect(cx - W / 2, top, W, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (const bx of [cx - W / 2 + 5, cx + W / 2 - 6]) ctx.fillRect(bx, top + 9, 1, 1);
  // Fechadura.
  if (!aberto) {
    ctx.fillStyle = ferro;
    ctx.fillRect(cx - 3, top - 2, 6, 7);
    ctx.fillStyle = `rgba(${p.brilho},${0.7 + 0.3 * Math.sin(t / 300)})`;
    ctx.fillRect(cx - 1, top + 1, 2, 3);
  }
  // Enfeite da região.
  if (tesouro && temaAtual === 'cinza') {
    ctx.fillStyle = 'rgba(110,140,80,0.8)';
    ctx.fillRect(cx - W / 2, top + 10, 5, 3);
    ctx.fillRect(cx + W / 2 - 8, top + 11, 6, 2);
  } else if (tesouro && temaAtual === 'brasa' && !aberto) {
    ctx.strokeStyle = `rgba(255,140,60,${0.6 + 0.3 * Math.sin(t / 200)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8, top + 3);
    ctx.lineTo(cx - 5, top + 7);
    ctx.lineTo(cx - 7, top + 11);
    ctx.moveTo(cx + 6, top + 4);
    ctx.lineTo(cx + 9, top + 9);
    ctx.stroke();
  } else if (tesouro && temaAtual === 'veu') {
    ctx.fillStyle = '#e8f4f0';
    for (const [bx, by] of [
      [-10, 4],
      [-7, 9],
      [9, 6],
    ] as const)
      ctx.fillRect(cx + bx, top + by, 2, 2);
  }
}

/** Relicário: baú de pedra preso por correntes de runas. Só abre com o enigma. */
function drawRelicario(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  t: number,
  aberto: boolean,
): void {
  const g = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy - 4, TILE);
  g.addColorStop(0, `rgba(242,210,122,${aberto ? 0.08 : 0.25 + 0.1 * Math.sin(t / 420)})`);
  g.addColorStop(1, 'rgba(242,210,122,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - TILE, cy - TILE, TILE * 2, TILE * 2);
  // Pedestal.
  ctx.fillStyle = '#3c4054';
  ctx.fillRect(cx - 15, cy + 6, 30, 7);
  ctx.fillStyle = '#4e536b';
  ctx.fillRect(cx - 15, cy + 6, 30, 2);
  // Caixa de pedra com tampa em arco.
  ctx.fillStyle = aberto ? '#4a4d5c' : '#6c7088';
  ctx.fillRect(cx - 12, cy - 6, 24, 12);
  ctx.fillStyle = aberto ? '#2a2c36' : '#8a8fa8';
  ctx.beginPath();
  if (aberto) {
    ctx.fillRect(cx - 12, cy - 18, 24, 9);
  } else {
    ctx.moveTo(cx - 12, cy - 6);
    ctx.lineTo(cx - 12, cy - 10);
    ctx.quadraticCurveTo(cx, cy - 20, cx + 12, cy - 10);
    ctx.lineTo(cx + 12, cy - 6);
    ctx.closePath();
    ctx.fill();
  }
  if (aberto) {
    ctx.fillStyle = '#0d0e14';
    ctx.fillRect(cx - 10, cy - 8, 20, 4);
    return;
  }
  // Selo e correntes que brilham.
  const pulso = 0.6 + 0.4 * Math.sin(t / 260);
  ctx.strokeStyle = `rgba(242,210,122,${pulso})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 13, cy - 9);
  ctx.lineTo(cx + 13, cy + 4);
  ctx.moveTo(cx + 13, cy - 9);
  ctx.lineTo(cx - 13, cy + 4);
  ctx.stroke();
  ctx.fillStyle = '#f2d27a';
  ctx.beginPath();
  ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a4020';
  ctx.fillRect(cx - 1, cy - 4, 2, 4);
}

/** Cores e formas das runas do enigma. */
const RUNAS = [
  { cor: '79,209,197', forma: 'triangulo' },
  { cor: '242,190,90', forma: 'losango' },
  { cor: '176,124,246', forma: 'circulo' },
  { cor: '255,110,110', forma: 'xis' },
  { cor: '140,200,120', forma: 'barras' },
] as const;

function drawRuna(
  ctx: CanvasRenderingContext2D,
  runa: number,
  px: number,
  py: number,
  acesa: number,
  t: number,
): void {
  const r = RUNAS[runa % RUNAS.length]!;
  const cx = px + TILE / 2;
  const cy = py + TILE / 2;
  // Placa de pedra.
  ctx.fillStyle = '#2b2f40';
  ctx.beginPath();
  ctx.arc(cx, cy, TILE * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const brilho = 0.35 + 0.1 * Math.sin(t / 500 + runa) + acesa * 0.65;
  if (acesa > 0) {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE * 0.9);
    g.addColorStop(0, `rgba(${r.cor},${0.6 * acesa})`);
    g.addColorStop(1, `rgba(${r.cor},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(cx - TILE, cy - TILE, TILE * 2, TILE * 2);
  }
  ctx.strokeStyle = `rgba(${r.cor},${brilho})`;
  ctx.fillStyle = `rgba(${r.cor},${brilho * 0.5})`;
  ctx.lineWidth = 2.5;
  const k = TILE * 0.2;
  ctx.beginPath();
  if (r.forma === 'triangulo') {
    ctx.moveTo(cx, cy - k);
    ctx.lineTo(cx + k, cy + k * 0.8);
    ctx.lineTo(cx - k, cy + k * 0.8);
    ctx.closePath();
  } else if (r.forma === 'losango') {
    ctx.moveTo(cx, cy - k);
    ctx.lineTo(cx + k, cy);
    ctx.lineTo(cx, cy + k);
    ctx.lineTo(cx - k, cy);
    ctx.closePath();
  } else if (r.forma === 'circulo') {
    ctx.arc(cx, cy, k * 0.9, 0, Math.PI * 2);
  } else if (r.forma === 'xis') {
    ctx.moveTo(cx - k, cy - k);
    ctx.lineTo(cx + k, cy + k);
    ctx.moveTo(cx + k, cy - k);
    ctx.lineTo(cx - k, cy + k);
  } else {
    for (const dx of [-k * 0.6, 0, k * 0.6]) {
      ctx.moveTo(cx + dx, cy - k);
      ctx.lineTo(cx + dx, cy + k);
    }
  }
  if (r.forma !== 'xis' && r.forma !== 'barras') ctx.fill();
  ctx.stroke();
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  id: string,
  px: number,
  py: number,
  t: number,
  aberto: boolean,
) {
  const cx = px + TILE / 2;
  const cy = py + TILE / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + TILE * 0.3, TILE * 0.36, TILE * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (id === 'mercadora') {
    drawMercadora(ctx, cx, cy, t);
  } else if (id === 'bau' || id === 'tesouro') {
    drawBau(ctx, cx, cy, t, id === 'tesouro', aberto);
  } else if (id === 'relicario') {
    drawRelicario(ctx, cx, cy, t, aberto);
  } else if (id === 'altar') {
    ctx.fillStyle = '#4a4f66';
    ctx.fillRect(cx - 11, cy - 2, 22, 13);
    ctx.fillStyle = '#5c6280';
    ctx.fillRect(cx - 13, cy - 5, 26, 4);
    const g = ctx.createRadialGradient(cx, cy - 10, 1, cx, cy - 10, 12);
    g.addColorStop(0, `rgba(190,180,255,${0.8 + 0.2 * Math.sin(t / 350)})`);
    g.addColorStop(1, 'rgba(139,124,246,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 14, cy - 24, 28, 24);
  } else if (id === 'expedicao') {
    ctx.fillStyle = '#5a4330';
    ctx.fillRect(cx - 13, cy - 4, 26, 6);
    ctx.fillRect(cx - 11, cy + 2, 3, 9);
    ctx.fillRect(cx + 8, cy + 2, 3, 9);
    ctx.fillStyle = '#d8ccb0';
    ctx.fillRect(cx - 9, cy - 8, 16, 6);
    ctx.strokeStyle = '#8b5a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - 4);
    ctx.lineTo(cx - 2, cy - 7);
    ctx.lineTo(cx + 4, cy - 5);
    ctx.stroke();
  }
}

function bar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  frac: number,
  cor: string,
) {
  ctx.fillStyle = COR.vidaFundo;
  ctx.fillRect(x - 1, y - 1, w + 2, 6);
  ctx.fillStyle = cor;
  ctx.fillRect(x, y, Math.max(0, w * frac), 4);
}

/** Para que lado cada ator olha (os sprites de fera olham para a direita). */
const OLHANDO_ESQUERDA = new Map<string, boolean>();

interface Animacao {
  /** 0 a 1 enquanto anda de um tile para o outro; -1 parado. */
  passo: number;
  /** Deslocamento do corpo (investida, tremida), em px. */
  dx: number;
  dy: number;
  lampejo: number;
  opacidade: number;
  /** Cor da afinidade do Eco (só para o Eco). */
  aura?: string;
}

/** O Eco: espírito translúcido que flutua, com o anel da afinidade embaixo. */
function drawEco(
  ctx: CanvasRenderingContext2D,
  a: RtActor,
  cx: number,
  cy: number,
  t: number,
  an: Animacao,
) {
  const cor = an.aura ?? '#9fe8ff';
  const flutua = Math.sin(t / 340) * 3 - 6;
  const tamanho = TILE * 0.82;
  const k = 0.5 + 0.5 * Math.sin(t / 420);
  // Anel da afinidade girando no chão.
  ctx.globalAlpha = 0.55 + 0.25 * k;
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.lineDashOffset = t / 80;
  ctx.beginPath();
  ctx.ellipse(cx, cy + TILE * 0.3, TILE * 0.34, TILE * 0.13, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // Brilho em volta do corpo.
  const g = ctx.createRadialGradient(cx, cy + flutua, 2, cx, cy + flutua, TILE * 0.7);
  g.addColorStop(0, `${cor}55`);
  g.addColorStop(1, `${cor}00`);
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(cx - TILE, cy - TILE + flutua, TILE * 2, TILE * 2);
  if (a.moverTotal > 0 && a.x !== a.deX) OLHANDO_ESQUERDA.set(a.uid, a.x < a.deX);
  const ap = APARENCIA[a.defId] ?? APARENCIA.carnical!;
  ctx.globalAlpha = 0.78;
  drawSprite(ctx, ap, cx + an.dx, cy + TILE * 0.36 + flutua + an.dy, tamanho, {
    espelhar: OLHANDO_ESQUERDA.get(a.uid) ?? false,
    olhos: cor,
    lampejo: 0.22 + 0.12 * k,
  });
  // Rastro: duas fagulhas subindo.
  for (let i = 0; i < 2; i++) {
    const f = (((t / 900 + i * 0.5) % 1) + 1) % 1;
    ctx.globalAlpha = (1 - f) * 0.7;
    ctx.fillStyle = cor;
    ctx.fillRect(Math.round(cx - 6 + i * 11), Math.round(cy + 4 - f * 20 + flutua), 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  a: RtActor,
  cx: number,
  cy: number,
  t: number,
  alvo: boolean,
  an: Animacao,
) {
  if (a.uid === ECO) return drawEco(ctx, a, cx, cy, t, an);
  const heroi = a.uid === HEROI;
  const raio = heroi ? TILE * 0.3 : a.chefe ? TILE * 0.42 : TILE * 0.3;
  const respira = Math.sin(t / 260 + (heroi ? 0 : a.origemX * 1.7));
  // Andando: pulinho a cada passo, com o corpo esticando no ar e achatando no chão.
  const pulo = an.passo >= 0 ? Math.sin(an.passo * Math.PI) : 0;
  const bob = an.passo >= 0 ? -pulo * 4 : respira * 1.2;
  const escalaY = an.passo >= 0 ? 1 + pulo * 0.08 - (1 - pulo) * 0.04 : 1 + respira * 0.025;
  const escalaX = 2 - escalaY;
  ctx.globalAlpha = an.opacidade;
  // Chefe: aura pulsando embaixo (mais forte na fúria final).
  if (a.chefe) {
    const furia = a.furiaFinal ? 1 : 0;
    const k = 0.5 + 0.5 * Math.sin(t / (furia ? 120 : 380));
    const r = TILE * (0.9 + 0.15 * k + 0.25 * furia);
    const g = ctx.createRadialGradient(cx, cy + raio, 2, cx, cy + raio, r);
    g.addColorStop(
      0,
      furia ? `rgba(255,70,60,${0.45 + 0.2 * k})` : `rgba(242,181,107,${0.25 + 0.15 * k})`,
    );
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy + raio, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Sombra no chão: encolhe quando o corpo sobe.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(
    cx + an.dx * 0.5,
    cy + raio * 0.95,
    raio * (0.95 - pulo * 0.15),
    raio * 0.35,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  if (alvo) {
    ctx.strokeStyle = COR.alvo;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -t / 60;
    ctx.beginPath();
    ctx.ellipse(cx, cy + raio * 0.9, raio * 1.3, raio * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const x = cx + an.dx;
  const y = cy + bob - 2 + an.dy;
  // Vira para o lado em que andou por último.
  if (a.moverTotal > 0 && a.x !== a.deX) OLHANDO_ESQUERDA.set(a.uid, a.x < a.deX);
  const tamanho = a.chefe ? TILE * 1.5 : TILE;
  const ap = heroi
    ? aparenciaDaClasse(useGame.getState().estado.cacador.classe)
    : (APARENCIA[a.defId] ?? APARENCIA.carnical!);
  drawSprite(ctx, ap, x, cy + TILE * 0.42 + bob + an.dy, tamanho, {
    espelhar: OLHANDO_ESQUERDA.get(a.uid) ?? false,
    escalaX,
    escalaY,
    lampejo: an.lampejo,
    ...(!heroi && a.agressivo && ap.forma !== 'olho' ? { olhos: '#ff5a6e' } : {}),
  });
  // Preparando golpe forte: brilho vermelho crescendo em volta do corpo.
  if (a.preparo) {
    const k = 1 - a.preparo.restante / a.preparo.total;
    const g = ctx.createRadialGradient(
      x,
      y - tamanho * 0.2,
      2,
      x,
      y - tamanho * 0.2,
      tamanho * 0.9,
    );
    g.addColorStop(0, `rgba(255,90,110,${0.15 + 0.35 * k})`);
    g.addColorStop(1, 'rgba(255,90,110,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - tamanho, y - tamanho * 1.2, tamanho * 2, tamanho * 2);
  }
  if (a.chefe) {
    const topo = cy + TILE * 0.42 + bob + an.dy - tamanho - 2;
    ctx.fillStyle = a.furiaFinal ? '#ff5a6e' : COR.chefe;
    ctx.beginPath();
    ctx.moveTo(x - 9, topo + 6);
    ctx.lineTo(x - 9, topo);
    ctx.lineTo(x - 4.5, topo + 3);
    ctx.lineTo(x, topo - 3);
    ctx.lineTo(x + 4.5, topo + 3);
    ctx.lineTo(x + 9, topo);
    ctx.lineTo(x + 9, topo + 6);
    ctx.closePath();
    ctx.fill();
  }
  // Próxima ação é golpe forte: sinal de alerta sobre o monstro.
  if (
    !heroi &&
    a.agressivo &&
    a.intencao &&
    actorEnemyDef(CONTEUDO, a).acoes.find((q) => q.id === a.intencao)?.forte
  ) {
    const pisca = a.preparo ? 0.6 + 0.4 * Math.sin(t / 60) : 1;
    ctx.globalAlpha = an.opacidade * pisca;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = a.preparo ? '#ff5a6e' : '#f2b56b';
    ctx.fillText('⚠', x + raio + 7, y - raio * 0.4);
    ctx.globalAlpha = an.opacidade;
  }
  if (heroi || alvo || a.vida < a.vidaMax) {
    const w = a.chefe ? TILE * 1.1 : TILE * 0.8;
    const topoBarra = a.chefe ? cy + TILE * 0.42 - TILE * 1.5 - 12 : cy - TILE * 0.62 - 6;
    bar(ctx, cx - w / 2, topoBarra, w, a.vida / a.vidaMax, heroi ? '#6fcf97' : COR.vida);
  }
  ctx.globalAlpha = 1;
}

/** Progresso do passo atual (0 a 1), ou -1 se está parado. */
function stepProgress(a: RtActor, alpha: number, tickMs: number): number {
  if (a.moverTotal <= 0 || a.moverRestante <= 0) return -1;
  const resta = Math.max(0, a.moverRestante - alpha * tickMs);
  return 1 - resta / a.moverTotal;
}

const DURACAO_MAGIA: Record<Magia['tipo'], number> = {
  corte: 320,
  projetil: 420,
  nova: 480,
  escudo: 900,
  cura: 900,
  chuva: 700,
  explosao: 480,
  sombra: 420,
};

/** Desenha os efeitos das habilidades do caçador (em coordenadas do mundo). */
function drawMagias(
  ctx: CanvasRenderingContext2D,
  s: Sessao,
  t: number,
  heroiPos: [number, number],
) {
  s.magias = s.magias.filter((m) => t - m.nasceu < DURACAO_MAGIA[m.tipo]);
  for (const m of s.magias) {
    const k = (t - m.nasceu) / DURACAO_MAGIA[m.tipo];
    const hx = (heroiPos[0] + 0.5) * TILE;
    const hy = (heroiPos[1] + 0.5) * TILE;
    const alvo = m.para ?? m.de;
    const ax = (alvo[0] + 0.5) * TILE;
    const ay = (alvo[1] + 0.5) * TILE;
    ctx.save();
    ctx.strokeStyle = m.cor;
    ctx.fillStyle = m.cor;
    ctx.shadowColor = m.cor;
    ctx.shadowBlur = 12;
    switch (m.tipo) {
      case 'corte': {
        // Dois cortes em meia-lua cruzando o alvo.
        const ang = Math.atan2(ay - hy, ax - hx);
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 5 * (1 - k) + 1;
        for (const lado of [-1, 1]) {
          ctx.beginPath();
          const a0 = ang - 1.3 * lado + k * 1.6 * lado;
          ctx.arc(ax, ay, TILE * 0.55, a0 - 0.9, a0 + 0.9);
          ctx.stroke();
        }
        break;
      }
      case 'projetil': {
        const fx = (m.de[0] + 0.5) * TILE;
        const fy = (m.de[1] + 0.5) * TILE;
        const voo = Math.min(1, k / 0.6);
        if (voo < 1) {
          const px = fx + (ax - fx) * voo;
          const py = fy + (ay - fy) * voo - Math.sin(voo * Math.PI) * TILE * 0.3;
          for (let i = 0; i < 5; i++) {
            const r = voo - i * 0.05;
            if (r < 0) break;
            const tx = fx + (ax - fx) * r;
            const ty = fy + (ay - fy) * r - Math.sin(r * Math.PI) * TILE * 0.3;
            ctx.globalAlpha = 0.5 - i * 0.09;
            ctx.beginPath();
            ctx.arc(tx, ty, 5 - i * 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const e = (k - 0.6) / 0.4;
          ctx.globalAlpha = 1 - e;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(ax, ay, TILE * (0.2 + 0.6 * e), 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'nova': {
        // Anel que se abre do caçador até o raio da habilidade, com riscos.
        const r = TILE * (0.4 + (m.raio + 0.3) * k);
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath();
        ctx.ellipse(hx, hy + TILE * 0.2, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2 + m.semente * 6;
          ctx.beginPath();
          ctx.moveTo(hx + Math.cos(a) * r * 0.7, hy + TILE * 0.2 + Math.sin(a) * r * 0.42);
          ctx.lineTo(hx + Math.cos(a) * r, hy + TILE * 0.2 + Math.sin(a) * r * 0.6);
          ctx.stroke();
        }
        break;
      }
      case 'escudo': {
        // Bolha hexagonal em volta do caçador.
        const surge = Math.min(1, k * 5);
        const some = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        ctx.globalAlpha = 0.85 * some;
        ctx.lineWidth = 2.5;
        const r = TILE * 0.62 * (0.6 + 0.4 * surge) * (1 + 0.04 * Math.sin(t / 60));
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const x = hx + Math.cos(a) * r;
          const y = hy - TILE * 0.1 + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.18 * some;
        ctx.fill();
        break;
      }
      case 'cura': {
        // Cruzes subindo em volta do caçador.
        ctx.shadowBlur = 8;
        for (let i = 0; i < 6; i++) {
          const fase = (k + i / 6) % 1;
          const a = i * 1.7 + m.semente * 6;
          const x = hx + Math.cos(a) * TILE * 0.45;
          const y = hy + TILE * 0.3 - fase * TILE * 1.1;
          ctx.globalAlpha = Math.sin(fase * Math.PI) * (1 - k * 0.5);
          ctx.fillRect(Math.round(x - 1), Math.round(y - 4), 3, 9);
          ctx.fillRect(Math.round(x - 4), Math.round(y - 1), 9, 3);
        }
        ctx.globalAlpha = 0.25 * (1 - k);
        ctx.beginPath();
        ctx.ellipse(hx, hy + TILE * 0.3, TILE * 0.6, TILE * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'chuva': {
        // Riscos caindo na área em volta do caçador.
        ctx.lineWidth = 2;
        const n = 8 + m.raio * 5;
        for (let i = 0; i < n; i++) {
          const r1 = hash(i, Math.floor(m.semente * 1000));
          const r2 = hash(i + 91, Math.floor(m.semente * 1000));
          const atraso = r1 * 0.5;
          const q = (k - atraso) / 0.5;
          if (q < 0 || q > 1) continue;
          const x = hx + (r2 * 2 - 1) * TILE * (m.raio + 0.5);
          const chao = hy + (r1 * 2 - 1) * TILE * (m.raio + 0.5) * 0.7;
          const y = chao - (1 - q) * TILE * 3;
          ctx.globalAlpha = 1 - q * 0.3;
          ctx.beginPath();
          ctx.moveTo(x - 4, y - 14);
          ctx.lineTo(x, y);
          ctx.stroke();
          if (q > 0.85) {
            ctx.globalAlpha = (1 - q) * 4;
            ctx.beginPath();
            ctx.ellipse(x, chao, 7, 3, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;
      }
      case 'explosao': {
        ctx.globalAlpha = 1 - k;
        const g = ctx.createRadialGradient(ax, ay, 0, ax, ay, TILE * (0.3 + 0.9 * k));
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.4, m.cor);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ax, ay, TILE * (0.3 + 0.9 * k), 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + m.semente * 3;
          const r0 = TILE * (0.2 + 0.8 * k);
          ctx.beginPath();
          ctx.moveTo(ax + Math.cos(a) * r0, ay + Math.sin(a) * r0);
          ctx.lineTo(ax + Math.cos(a) * (r0 + 10), ay + Math.sin(a) * (r0 + 10));
          ctx.stroke();
        }
        break;
      }
      case 'sombra': {
        // Fumaça escura no caçador e dois cortes em X no alvo.
        ctx.shadowBlur = 0;
        for (let i = 0; i < 6; i++) {
          const a = i + m.semente * 6;
          ctx.globalAlpha = 0.4 * (1 - k);
          ctx.fillStyle = '#120d1c';
          ctx.beginPath();
          ctx.arc(
            hx + Math.cos(a) * TILE * 0.3 * (1 + k),
            hy + Math.sin(a) * TILE * 0.2 - k * TILE * 0.4,
            TILE * 0.18 * (1 + k),
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.shadowBlur = 12;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 3;
        const d = TILE * 0.45 * Math.min(1, k * 3);
        ctx.beginPath();
        ctx.moveTo(ax - d, ay - d);
        ctx.lineTo(ax + d, ay + d);
        ctx.moveTo(ax + d, ay - d);
        ctx.lineTo(ax - d, ay + d);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }
}

/** Área de um golpe forte: preenchimento único, borda só por fora, rachaduras no fim. */
function drawPerigo(
  ctx: CanvasRenderingContext2D,
  m: WorldMap,
  tiles: ReadonlyArray<[number, number]>,
  k: number,
  t: number,
  origem: [number, number],
  chefe: boolean,
): void {
  const dentro = new Set(tiles.map(([x, y]) => y * m.largura + x));
  const tem = (x: number, y: number) => dentro.has(y * m.largura + x);
  let longe = 1;
  for (const [x, y] of tiles) longe = Math.max(longe, Math.hypot(x - origem[0], y - origem[1]));
  const cor = chefe ? '255,120,60' : '229,83,107';
  const pulso = 0.5 + 0.5 * Math.sin(t / 90);
  for (const [x, y] of tiles) {
    const px = x * TILE;
    const py = y * TILE;
    // Frente que avança de quem golpeia até a borda da área.
    const d = Math.hypot(x - origem[0], y - origem[1]) / longe;
    const cheio = Math.max(0, Math.min(1, (k * 1.15 - d) * 4));
    ctx.fillStyle = `rgba(${cor},${0.1 + 0.06 * pulso + 0.32 * cheio})`;
    ctx.fillRect(px, py, TILE, TILE);
    // Rachaduras que aparecem no fim do preparo.
    if (k > 0.45) {
      const hsh = hash(x, y);
      ctx.strokeStyle = `rgba(255,${chefe ? 200 : 170},140,${(k - 0.45) * 1.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const cx = px + TILE * (0.3 + (hsh % 5) * 0.1);
      const cy = py + TILE * (0.3 + ((hsh >> 3) % 5) * 0.1);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + TILE * 0.22, cy - TILE * 0.12);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - TILE * 0.18, cy - TILE * 0.2);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + TILE * 0.05, cy + TILE * 0.24);
      ctx.stroke();
    }
  }
  // Borda: só os lados que dão para fora, tracejada e andando.
  ctx.save();
  ctx.strokeStyle = `rgba(${cor},${0.75 + 0.25 * pulso})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.lineDashOffset = -t / 40;
  ctx.shadowColor = `rgba(${cor},0.9)`;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (const [x, y] of tiles) {
    const px = x * TILE;
    const py = y * TILE;
    if (!tem(x, y - 1)) {
      ctx.moveTo(px, py);
      ctx.lineTo(px + TILE, py);
    }
    if (!tem(x, y + 1)) {
      ctx.moveTo(px, py + TILE);
      ctx.lineTo(px + TILE, py + TILE);
    }
    if (!tem(x - 1, y)) {
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + TILE);
    }
    if (!tem(x + 1, y)) {
      ctx.moveTo(px + TILE, py);
      ctx.lineTo(px + TILE, py + TILE);
    }
  }
  ctx.stroke();
  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  s: Sessao,
  cam: Camera,
  alpha: number,
  dpr: number,
): void {
  const t = s.agora;
  const def = CONTEUDO.mapas[s.w.mapa]!;
  const amb = AMBIENTES[def.id];
  COR = { ...COR_BASE, ...TEMAS[def.tema ?? 'cinza'], ...amb?.cores };
  ehPosto = def.tipo === 'posto';
  temaAtual = def.tema ?? 'cinza';
  const m = loadMap(def);
  const tick = CONTEUDO.mundo.tickMs;
  const heroi = heroOf(s.w);
  const raio = CONTEUDO.mundo.raioRevelado;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = COR.vazio;
  ctx.fillRect(0, 0, cam.largura, cam.altura);
  // Tremor: sacode a câmera enquanto durar, cada vez mais fraco.
  let tx = 0;
  let ty = 0;
  if (t < s.tremor.ate) {
    const f = s.tremor.forca * Math.min(1, (s.tremor.ate - t) / 200);
    tx = Math.round((Math.random() * 2 - 1) * f);
    ty = Math.round((Math.random() * 2 - 1) * f);
  }
  ctx.translate(-Math.round(cam.x) + tx, -Math.round(cam.y) + ty);
  const [hx, hy] = actorPos(heroi, alpha, tick);

  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(m.largura - 1, Math.ceil((cam.x + cam.largura) / TILE));
  const y1 = Math.min(m.altura - 1, Math.ceil((cam.y + cam.altura) / TILE));
  /** Some aos poucos perto da borda da luz, em vez de sumir de uma vez. */
  const opacidade = (x: number, y: number) =>
    Math.max(0, Math.min(1, (raio + 0.5 - Math.hypot(x - hx, y - hy)) / 1.6));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!s.w.revelado[y * m.largura + x]) continue;
      drawTile(ctx, m, x, y, x * TILE, y * TILE, t);
    }
  }
  {
    const lagos: Array<[number, number]> = [];
    for (let y = Math.max(0, y0 - 1); y <= Math.min(m.altura - 1, y1 + 1); y++)
      for (let x = Math.max(0, x0 - 1); x <= Math.min(m.largura - 1, x1 + 1); x++)
        if (s.w.revelado[y * m.largura + x] && ehAgua(m, x, y)) lagos.push([x, y]);
    drawLagos(ctx, m, lagos, t);
  }
  // Runas do enigma: acendem na ordem enquanto o relicário mostra, e quando pisadas.
  {
    const e = s.w.enigma;
    const vis = s.enigmaVisto;
    let mostrando = -1;
    let forca = 0;
    if (vis && e?.ativo) {
      const passo = (t - vis.inicio) / ENIGMA_MOSTRA_MS;
      const k = Math.floor(passo);
      if (k < vis.sequencia.length) {
        mostrando = vis.sequencia[k]!;
        forca = Math.sin((passo - k) * Math.PI);
      }
    }
    s.runasPisadas = s.runasPisadas.filter((r) => t - r.nasceu < 600);
    for (const [idx, runa] of Object.entries(m.runas)) {
      const i = Number(idx);
      if (!s.w.revelado[i]) continue;
      const x = i % m.largura;
      const y = (i - x) / m.largura;
      let acesa = runa === mostrando ? forca : 0;
      const pis = s.runasPisadas.find((r) => r.x === x && r.y === y);
      if (pis) acesa = Math.max(acesa, 1 - (t - pis.nasceu) / 600);
      if (e?.resolvido) acesa = 0.25;
      drawRuna(ctx, runa, x * TILE, y * TILE, acesa, t);
      if (pis && !pis.certo) {
        ctx.fillStyle = `rgba(255,60,80,${0.5 * (1 - (t - pis.nasceu) / 600)})`;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }
  // Objetos e portais por cima do chão: podem passar do tile (toldo, vórtice).
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * m.largura + x;
      if (!s.w.revelado[i]) continue;
      if (m.tiles[i] === Tile.Objeto) {
        drawObject(ctx, m.objetos[i] ?? '', x * TILE, y * TILE, t, s.w.abertos.includes(i));
      } else if (m.tiles[i] === Tile.Portao) {
        const destino = CONTEUDO.mapas[m.portoes[i]?.destino ?? '']?.portal;
        const portal = destino ? CONTEUDO.portais[destino] : undefined;
        const fechado = !!portal && !isPortalOpen(useGame.getState().estado, CONTEUDO, portal.id);
        drawPortal(
          ctx,
          x * TILE,
          y * TILE,
          t,
          portal ? (COR_RANK[portal.rank] ?? '#8b7cf6') : '#d9d3ff',
          fechado,
        );
      }
    }
  }

  // Itens no chão: losango com brilho na cor da raridade.
  for (const g of s.w.chao) {
    if (!s.w.revelado[g.y * m.largura + g.x]) continue;
    const cx = (g.x + 0.5) * TILE;
    const cy = (g.y + 0.62) * TILE + Math.sin(t / 300 + g.x) * 2;
    const cor = COR_RARIDADE_ITEM[g.item.raridade];
    const brilho = ctx.createRadialGradient(cx, cy, 1, cx, cy, TILE * 0.45);
    brilho.addColorStop(0, cor + '88');
    brilho.addColorStop(1, cor + '00');
    ctx.fillStyle = brilho;
    ctx.fillRect(cx - TILE / 2, cy - TILE / 2, TILE, TILE);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 5, cy);
    ctx.lineTo(cx, cy + 7);
    ctx.lineTo(cx - 5, cy);
    ctx.closePath();
    ctx.fill();
  }

  // Avisos de golpe forte: uma área só, com borda viva, que se enche a partir de
  // quem golpeia e racha o chão perto do fim.
  for (const a of s.w.atores) {
    const p = a.vida > 0 ? a.preparo : null;
    if (!p) continue;
    const k = 1 - Math.max(0, p.restante - alpha * tick) / p.total;
    drawPerigo(ctx, m, p.tiles, k, t, [a.x, a.y], a.chefe);
  }

  // Impacto: o chão da área acende e apaga.
  s.impactos = s.impactos.filter((i) => t - i.nasceu < 420);
  for (const i of s.impactos) {
    const k = (t - i.nasceu) / 420;
    for (const [x, y] of i.tiles) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle =
        k < 0.25
          ? `rgba(255,240,220,${0.7 * (1 - k * 4) + 0.2})`
          : `rgba(${i.chefe ? '255,150,70' : '255,95,80'},${0.55 * (1 - k)})`;
      ctx.fillRect(px, py, TILE, TILE);
      const r = TILE * (0.2 + 0.5 * k);
      ctx.strokeStyle = `rgba(255,210,160,${0.6 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px + TILE / 2, py + TILE / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Atores, de cima para baixo (quem está mais embaixo cobre quem está atrás).
  // Quem caiu afunda, achata e some.
  s.mortes = s.mortes.filter((d) => t - d.nasceu < (d.chefe ? 1400 : 700));
  for (const d of s.mortes) {
    const dur = d.chefe ? 1400 : 700;
    const k = (t - d.nasceu) / dur;
    const ap = APARENCIA[d.defId] ?? APARENCIA.carnical!;
    const tam = d.chefe ? TILE * 1.5 : TILE;
    if (d.vinculo) {
      // Vinculado: encolhe, sobe e vira luz.
      ctx.globalAlpha = (1 - k) * opacidade(d.x, d.y);
      const e = Math.max(0.05, 1 - k * 0.9);
      drawSprite(ctx, ap, (d.x + 0.5) * TILE, (d.y + 0.5) * TILE + TILE * 0.42 - k * 18, tam, {
        espelhar: d.esquerda,
        escalaX: e,
        escalaY: e,
        lampejo: 0.4 + k * 0.6,
      });
      continue;
    }
    ctx.globalAlpha = (1 - k) * opacidade(d.x, d.y);
    drawSprite(ctx, ap, (d.x + 0.5) * TILE, (d.y + 0.5) * TILE + TILE * 0.42, tam, {
      espelhar: d.esquerda,
      escalaX: 1 + k * 0.5,
      escalaY: Math.max(0.05, 1 - k),
      lampejo: k < 0.25 ? 1 - k * 4 : 0,
    });
  }
  ctx.globalAlpha = 1;

  const atores = s.w.atores
    .filter((a) => a.vida > 0)
    .map((a) => {
      const p = actorPos(a, alpha, tick);
      return { a, p, o: a.uid === HEROI || a.uid === ECO ? 1 : opacidade(p[0], p[1]) };
    })
    .filter((x) => x.o > 0)
    .sort((p, q) => p.p[1] - q.p[1] || (p.a.uid === ECO ? -1 : q.a.uid === ECO ? 1 : 0));
  for (const { a, p, o } of atores) {
    let dx = 0;
    let dy = 0;
    // Investida: o corpo vai na direção do alvo e volta (180 ms).
    const inv = s.investidas.get(a.uid);
    if (inv && t - inv.t < 180) {
      const k = Math.sin(((t - inv.t) / 180) * Math.PI) * TILE * 0.28;
      dx += inv.dx * k;
      dy += inv.dy * k;
    }
    // Levou golpe: tremidinha e lampejo branco.
    const ac = s.acertos.get(a.uid);
    const desdeGolpe = ac === undefined ? Infinity : t - ac;
    if (desdeGolpe < 140) dx += Math.sin(desdeGolpe / 12) * 2.5;
    // Preparando golpe forte: treme no lugar.
    if (a.preparo) {
      const k = 1 - a.preparo.restante / a.preparo.total;
      dx += Math.sin(t / 25) * (0.6 + 1.6 * k);
    }
    drawActor(ctx, a, (p[0] + 0.5) * TILE, (p[1] + 0.5) * TILE, t, a.uid === heroi.alvo, {
      passo: stepProgress(a, alpha, tick),
      dx,
      dy,
      lampejo: desdeGolpe < 120 ? 1 - desdeGolpe / 120 : 0,
      opacidade: o,
      ...(a.uid === ECO && s.perfil.eco
        ? { aura: COR_AFINIDADE[s.perfil.eco.afinidade] ?? '#9fe8ff' }
        : {}),
    });
  }

  // Golpes: corte curto no corpo a corpo, projétil à distância.
  s.golpes = s.golpes.filter((g) => t - g.nasceu < 220);
  for (const g of s.golpes) {
    const k = (t - g.nasceu) / 220;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = g.heroi ? '#f4f1ff' : '#ff8a8a';
    ctx.lineWidth = 3;
    const tx = (g.para[0] + 0.5) * TILE;
    const ty = (g.para[1] + 0.5) * TILE;
    if (g.distancia > 1) {
      const fx = (g.de[0] + 0.5) * TILE;
      const fy = (g.de[1] + 0.5) * TILE;
      const px = fx + (tx - fx) * Math.min(1, k * 1.6);
      const py = fy + (ty - fy) * Math.min(1, k * 1.6);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const ang = Math.atan2(g.para[1] - g.de[1], g.para[0] - g.de[0]);
      ctx.beginPath();
      ctx.arc(tx, ty, TILE * 0.38, ang - 1 + k * 0.6, ang + 0.2 + k * 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Fagulhas: pixels que voam e caem.
  s.particulas = s.particulas.filter((q) => t - q.nasceu < q.vida);
  for (const q of s.particulas) {
    const dt = (t - q.nasceu) / 1000;
    const px = (q.x + q.vx * dt) * TILE;
    const py = (q.y + q.vy * dt + 3.2 * dt * dt) * TILE;
    ctx.globalAlpha = 1 - (t - q.nasceu) / q.vida;
    ctx.fillStyle = q.cor;
    ctx.fillRect(Math.round(px), Math.round(py), q.tam, q.tam);
  }
  ctx.globalAlpha = 1;

  // Ondas de chefe (fase nova, queda): anel que se abre.
  s.ondas = s.ondas.filter((o) => t - o.nasceu < 700);
  for (const o of s.ondas) {
    const k = (t - o.nasceu) / 700;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = o.cor;
    ctx.lineWidth = 4 * (1 - k) + 1;
    ctx.beginPath();
    ctx.ellipse(
      (o.x + 0.5) * TILE,
      (o.y + 0.7) * TILE,
      TILE * (0.5 + 3 * k),
      TILE * (0.25 + 1.5 * k),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Clima do mapa: poeira, cinzas, brasas, bolhas, névoa.
  if (amb) drawAmbiente(ctx, amb, cam, t);

  // Luz e sombra: a escuridão cobre o mapa, com buracos de luz suaves em volta
  // do caçador e de cada tocha. Tudo tremula de leve, como fogo.
  {
    const lx = (hx + 0.5) * TILE;
    const ly = (hy + 0.5) * TILE;
    const tocha = 1 + 0.018 * Math.sin(t / 170) + 0.012 * Math.sin(t / 61 + 1.3);
    const margem = TILE * 2;
    const w = Math.ceil(cam.largura + margem * 2);
    const h = Math.ceil(cam.altura + margem * 2);
    const ox = cam.x - margem;
    const oy = cam.y - margem;
    if (!escuro) escuro = document.createElement('canvas');
    if (escuro.width !== w || escuro.height !== h) {
      escuro.width = w;
      escuro.height = h;
    }
    const e = escuro.getContext('2d')!;
    e.globalCompositeOperation = 'source-over';
    e.clearRect(0, 0, w, h);
    e.fillStyle = `rgba(${COR.sombra},0.84)`;
    e.fillRect(0, 0, w, h);
    e.globalCompositeOperation = 'destination-out';
    const furo = (x: number, y: number, r0: number, r1: number, forca: number) => {
      const g = e.createRadialGradient(x - ox, y - oy, r0, x - ox, y - oy, r1);
      g.addColorStop(0, `rgba(0,0,0,${forca})`);
      g.addColorStop(0.55, `rgba(0,0,0,${forca * 0.72})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      e.fillStyle = g;
      e.fillRect(x - ox - r1, y - oy - r1, r1 * 2, r1 * 2);
    };
    furo(lx, ly, TILE * 3 * tocha, TILE * (raio + 0.3) * tocha, 1);
    const tochas: Array<[number, number, number]> = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (m.tiles[y * m.largura + x] !== Tile.Parede || !s.w.revelado[y * m.largura + x])
          continue;
        if (!temTocha(m, x, y)) continue;
        const fx = (x + 0.5) * TILE;
        const fy = (y + 0.9) * TILE;
        const tr = hash(x, y);
        const pisca = 1 + 0.06 * Math.sin(t / 110 + tr * 30) + 0.04 * Math.sin(t / 47 + tr * 9);
        furo(fx, fy, TILE * 0.4, TILE * 2.8 * pisca, 0.85);
        tochas.push([fx, fy, pisca]);
      }
    }
    ctx.drawImage(escuro, ox, oy);
    // Calor das luzes: um brilho quente somado por cima.
    ctx.globalCompositeOperation = 'lighter';
    const brilho = (x: number, y: number, r: number, a: number) => {
      const q = ctx.createRadialGradient(x, y, 0, x, y, r);
      q.addColorStop(0, `rgba(${COR.luz},${a})`);
      q.addColorStop(1, `rgba(${COR.luz},0)`);
      ctx.fillStyle = q;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    brilho(lx, ly, TILE * 3 * tocha, 0.07);
    for (const [fx, fy, p] of tochas) brilho(fx, fy - 6, TILE * 2.2 * p, 0.13);
    ctx.globalCompositeOperation = 'source-over';
  }

  // Tom do lugar e raios de luz.
  if (amb?.raios) {
    ctx.globalCompositeOperation = 'lighter';
    drawRaios(ctx, cam, t);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (amb?.tom) {
    ctx.fillStyle = `rgba(${amb.tom})`;
    ctx.fillRect(cam.x - 20, cam.y - 20, cam.largura + 40, cam.altura + 40);
  }

  // Habilidades brilham por cima da sombra.
  drawMagias(ctx, s, t, [hx, hy]);

  // Nomes dos personagens do Posto.
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const [idx, id] of Object.entries(m.objetos)) {
    const nome = NOME_OBJETO[id];
    const i = Number(idx);
    if (!nome || !s.w.revelado[i]) continue;
    const ox = (i % m.largura) * TILE + TILE / 2;
    const oy = Math.floor(i / m.largura) * TILE;
    const w = ctx.measureText(nome).width + 10;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(ox - w / 2, oy + TILE + 1, w, 15);
    ctx.fillStyle = '#f2d9b0';
    ctx.fillText(nome, ox, oy + TILE + 12);
  }

  // Rótulos dos portões.
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const [idx, g] of Object.entries(m.portoes)) {
    const i = Number(idx);
    const gx = i % m.largura;
    const gy = Math.floor(i / m.largura);
    if (!s.w.revelado[i]) continue;
    const destino = CONTEUDO.mapas[g.destino]?.portal;
    const fechado = !!destino && !isPortalOpen(useGame.getState().estado, CONTEUDO, destino);
    const rotulo = fechado ? `🔒 ${g.rotulo}` : g.rotulo;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const w = ctx.measureText(rotulo).width + 10;
    ctx.fillRect(gx * TILE + TILE / 2 - w / 2, (gy + 1) * TILE + 1, w, 15);
    ctx.fillStyle = fechado ? '#7d7f8f' : '#d9d3ff';
    ctx.fillText(rotulo, gx * TILE + TILE / 2, (gy + 1) * TILE + 12);
  }

  // Dica de interação: objeto ao lado do caçador.
  {
    let alvo: string | undefined;
    for (let dy = -1; dy <= 1 && !alvo; dy++)
      for (let dx = -1; dx <= 1 && !alvo; dx++) {
        const id = m.objetos[(heroi.y + dy) * m.largura + heroi.x + dx];
        if (id) alvo = id;
      }
    if (alvo) {
      const verbo: Record<string, string> = {
        mercadora: 'Negociar',
        bau: 'Abrir baú',
        altar: 'Usar altar',
        expedicao: 'Expedições',
        tesouro: 'Abrir baú',
        relicario: 'Tocar o relicário',
      };
      const texto = `Espaço  ${verbo[alvo] ?? 'Usar'}`;
      ctx.font = '600 11px system-ui, sans-serif';
      const w = ctx.measureText(texto).width + 14;
      const bx = (hx + 0.5) * TILE - w / 2;
      const by = (hy + 1) * TILE + 4;
      ctx.fillStyle = 'rgba(10,10,16,0.85)';
      ctx.fillRect(bx, by, w, 17);
      ctx.strokeStyle = 'rgba(242,210,122,0.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, w - 1, 16);
      ctx.fillStyle = '#f2d9b0';
      ctx.textAlign = 'center';
      ctx.fillText(texto, bx + w / 2, by + 12);
    }
  }
  // Enigma valendo: runas certas e tempo, em cima do caçador.
  {
    const e = s.w.enigma;
    if (e?.ativo) {
      const n = e.sequencia.length;
      const bx = (hx + 0.5) * TILE;
      const by = (hy - 0.2) * TILE - 44;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i < e.progresso ? '#6fcf97' : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(bx - (n - 1) * 6 + i * 12, by, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = e.prazo < 4000 ? '#ff8a8a' : '#f2d27a';
      ctx.fillText(`${Math.ceil(e.prazo / 1000)}s`, bx, by - 8);
    }
  }

  // Números flutuantes.
  s.flutuantes = s.flutuantes.filter((f) => t - f.nasceu < 900);
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  for (const f of s.flutuantes) {
    const k = (t - f.nasceu) / 900;
    const fx = (f.x + 0.5) * TILE;
    const fy = (f.y + 0.1) * TILE - k * TILE * 0.9;
    ctx.globalAlpha = 1 - k * k;
    ctx.strokeText(f.texto, fx, fy);
    ctx.fillStyle = f.cor;
    ctx.fillText(f.texto, fx, fy);
  }
  ctx.globalAlpha = 1;
}

/** Minimapa no canto e registro curto de acontecimentos, em coordenadas da tela. */
export function renderOverlay(
  ctx: CanvasRenderingContext2D,
  s: Sessao,
  cam: Camera,
  dpr: number,
  toque = false,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = loadMap(CONTEUDO.mapas[s.w.mapa]!);
  if (cam.largura >= 560) {
    const esc = Math.max(2, Math.min(150 / m.largura, 110 / m.altura));
    const mw = m.largura * esc;
    const mh = m.altura * esc;
    // No toque, os botões ocupam o canto de baixo: o minimapa sobe para a esquerda.
    const ox = toque ? 12 : cam.largura - mw - 12;
    const oy = toque ? 92 : cam.altura - mh - 12;
    ctx.fillStyle = 'rgba(5,6,10,0.78)';
    ctx.fillRect(ox - 4, oy - 4, mw + 8, mh + 8);
    ctx.strokeStyle = '#262c40';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 4.5, oy - 4.5, mw + 9, mh + 9);
    for (let y = 0; y < m.altura; y++) {
      for (let x = 0; x < m.largura; x++) {
        const i = y * m.largura + x;
        if (!s.w.revelado[i]) continue;
        const t = m.tiles[i];
        ctx.fillStyle =
          t === Tile.Parede
            ? '#2e3449'
            : t === Tile.Agua
              ? '#1d4a70'
              : t === Tile.Portao
                ? '#8b7cf6'
                : t === Tile.Objeto
                  ? '#f2b56b'
                  : '#555b70';
        ctx.fillRect(ox + x * esc, oy + y * esc, esc, esc);
      }
    }
    const h = heroOf(s.w);
    const raio = CONTEUDO.mundo.raioRevelado;
    for (const a of s.w.atores) {
      if (a.uid === HEROI || a.uid === ECO || a.vida <= 0) continue;
      if ((a.x - h.x) ** 2 + (a.y - h.y) ** 2 > raio * raio + 1) continue;
      ctx.fillStyle = a.chefe ? '#f2b56b' : '#e5536b';
      ctx.fillRect(ox + a.x * esc - 1, oy + a.y * esc - 1, esc + 2, esc + 2);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + h.x * esc - 1, oy + h.y * esc - 1, esc + 2, esc + 2);
  }
  // Registro: as últimas linhas somem depois de alguns segundos.
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  // Tela estreita (celular): menos linhas e acima do joystick.
  const estreita = cam.largura < 560;
  const recentes = s.log.filter((l) => s.agora - l.t < 10000).slice(estreita ? -3 : -5);
  const base = estreita ? cam.altura - 160 : cam.altura - 14;
  recentes.forEach((l, i) => {
    const y = base - (recentes.length - 1 - i) * 17;
    ctx.globalAlpha = Math.min(1, (10000 - (s.agora - l.t)) / 1500);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(10, y - 12, ctx.measureText(l.texto).width + 10, 16);
    ctx.fillStyle = l.cor;
    ctx.fillText(l.texto, 15, y);
  });
  ctx.globalAlpha = 1;
}
