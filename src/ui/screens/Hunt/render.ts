/**
 * Desenho do mapa em Canvas 2D. Visual provisório, todo feito em código.
 *
 * Só lê a sessão: não muda nada no mundo. A câmera segue o caçador com o
 * movimento interpolado entre tiles.
 */
import { CONTEUDO } from '../../../content/index.ts';
import type { RtActor } from '../../../engine/realtime/state.ts';
import { HEROI, heroOf } from '../../../engine/realtime/state.ts';
import { loadMap } from '../../../engine/realtime/world.ts';
import type { WorldMap } from '../../../engine/world/map.ts';
import { Tile } from '../../../engine/world/map.ts';
import type { Sessao } from './session.ts';

export const TILE = 36;

export interface Camera {
  /** Canto superior esquerdo da tela, em pixels do mundo. */
  x: number;
  y: number;
  largura: number;
  altura: number;
}

const COR = {
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
  nevoa: 'rgba(5,6,10,0.6)',
};

const COR_MONSTRO: Record<string, string> = {
  carnical: '#9fae7e',
  ratoDeCinza: '#8a7f70',
  tecela: '#6fb3a0',
  sentinela: '#9aa3b5',
  arqueiro: '#c49a6c',
  cavaleiro: '#7c7f99',
};

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
    const topo = TILE * 0.66;
    ctx.fillStyle = COR.paredeTopo;
    ctx.fillRect(px, py, TILE, topo);
    ctx.fillStyle = COR.paredeFace;
    ctx.fillRect(px, py + topo, TILE, TILE - topo);
    // Juntas das pedras na face.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    const desloc = y % 2 === 0 ? 0 : TILE / 2;
    ctx.fillRect(px + ((desloc + TILE / 4) % TILE), py + topo, 2, TILE - topo);
    ctx.fillRect(px + ((desloc + (3 * TILE) / 4) % TILE), py + topo, 2, TILE - topo);
    // Borda iluminada no topo, só onde não há outra parede acima.
    if (y === 0 || m.tiles[(y - 1) * m.largura + x] !== Tile.Parede) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(px, py, TILE, 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(px + 4 + r * 14, py + 6 + r * 8, 7, 3);
    return;
  }
  if (tile === Tile.Agua) {
    ctx.fillStyle = COR.agua;
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = COR.aguaBrilho;
    ctx.lineWidth = 2;
    const onda = Math.sin(t / 600 + x * 0.9 + y * 0.6) * 3;
    ctx.beginPath();
    ctx.moveTo(px + 6, py + TILE / 2 + onda);
    ctx.quadraticCurveTo(
      px + TILE / 2,
      py + TILE / 2 - 4 + onda,
      px + TILE - 6,
      py + TILE / 2 + onda,
    );
    ctx.stroke();
    return;
  }
  ctx.fillStyle = (x + y) % 2 === 0 ? COR.chao : COR.chaoB;
  ctx.fillRect(px, py, TILE, TILE);
  // Sombra da parede logo acima.
  if (y > 0 && m.tiles[(y - 1) * m.largura + x] === Tile.Parede) {
    ctx.fillStyle = COR.paredeSombra;
    ctx.fillRect(px, py, TILE, 7);
  }
  if (tile === Tile.ChaoDetalhe || r > 0.86) {
    ctx.fillStyle = COR.detalhe;
    const n = tile === Tile.ChaoDetalhe ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const rx = hash(x * 7 + i, y * 13 - i);
      const ry = hash(y * 5 - i, x * 11 + i);
      ctx.fillRect(px + 4 + rx * (TILE - 10), py + 4 + ry * (TILE - 10), 3, 2);
    }
  }
  if (tile === Tile.Portao) {
    const pulso = 0.55 + 0.25 * Math.sin(t / 400);
    const cx = px + TILE / 2;
    const cy = py + TILE / 2;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, TILE * 0.55);
    g.addColorStop(0, `rgba(190,180,255,${pulso})`);
    g.addColorStop(1, 'rgba(139,124,246,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - 4, py - 4, TILE + 8, TILE + 8);
    ctx.strokeStyle = COR.portao;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, TILE * 0.32, TILE * 0.4, 0, 0, Math.PI * 2);
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

function drawActor(
  ctx: CanvasRenderingContext2D,
  a: RtActor,
  cx: number,
  cy: number,
  t: number,
  alvo: boolean,
) {
  const heroi = a.uid === HEROI;
  const raio = heroi ? TILE * 0.3 : a.chefe ? TILE * 0.42 : TILE * 0.28;
  const bob = Math.sin(t / 260 + (heroi ? 0 : a.origemX * 1.7)) * 1.2;
  // Sombra.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + raio * 0.95, raio * 0.95, raio * 0.35, 0, 0, Math.PI * 2);
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
  const y = cy + bob - 2;
  if (heroi) {
    const g = ctx.createRadialGradient(cx - 3, y - 4, 1, cx, y, raio);
    g.addColorStop(0, COR.heroiCore);
    g.addColorStop(1, COR.heroi);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, y, raio, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = COR_MONSTRO[a.defId] ?? '#999';
    ctx.beginPath();
    // Corpo levemente curvado: mais largo embaixo.
    ctx.moveTo(cx - raio, y + raio * 0.7);
    ctx.quadraticCurveTo(cx - raio * 1.1, y - raio * 1.1, cx, y - raio);
    ctx.quadraticCurveTo(cx + raio * 1.1, y - raio * 1.1, cx + raio, y + raio * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.agressivo ? '#ff5a6e' : '#2a2030';
    ctx.fillRect(cx - raio * 0.45, y - raio * 0.35, 3, 3);
    ctx.fillRect(cx + raio * 0.45 - 3, y - raio * 0.35, 3, 3);
    if (a.chefe) {
      ctx.strokeStyle = COR.chefe;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - raio * 0.6, y - raio * 0.95);
      ctx.lineTo(cx - raio * 0.3, y - raio * 1.35);
      ctx.lineTo(cx, y - raio * 1.05);
      ctx.lineTo(cx + raio * 0.3, y - raio * 1.35);
      ctx.lineTo(cx + raio * 0.6, y - raio * 0.95);
      ctx.stroke();
    }
  }
  if (heroi || alvo || a.vida < a.vidaMax) {
    const w = a.chefe ? TILE * 1.1 : TILE * 0.8;
    bar(ctx, cx - w / 2, cy - raio - 14, w, a.vida / a.vidaMax, heroi ? '#6fcf97' : COR.vida);
  }
}

export function render(
  ctx: CanvasRenderingContext2D,
  s: Sessao,
  cam: Camera,
  alpha: number,
  dpr: number,
): void {
  const t = s.agora;
  const m = loadMap(CONTEUDO.mapas[s.w.mapa]!);
  const tick = CONTEUDO.mundo.tickMs;
  const heroi = heroOf(s.w);
  const raio = CONTEUDO.mundo.raioRevelado;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = COR.vazio;
  ctx.fillRect(0, 0, cam.largura, cam.altura);
  ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(m.largura - 1, Math.ceil((cam.x + cam.largura) / TILE));
  const y1 = Math.min(m.altura - 1, Math.ceil((cam.y + cam.altura) / TILE));
  const visivel = (x: number, y: number) =>
    (x - heroi.x) ** 2 + (y - heroi.y) ** 2 <= raio * raio + 1;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!s.w.revelado[y * m.largura + x]) continue;
      drawTile(ctx, m, x, y, x * TILE, y * TILE, t);
    }
  }

  // Rótulos dos portões.
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const [idx, g] of Object.entries(m.portoes)) {
    const i = Number(idx);
    const gx = i % m.largura;
    const gy = Math.floor(i / m.largura);
    if (!s.w.revelado[i]) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const w = ctx.measureText(g.rotulo).width + 10;
    ctx.fillRect(gx * TILE + TILE / 2 - w / 2, gy * TILE - 16, w, 15);
    ctx.fillStyle = '#d9d3ff';
    ctx.fillText(g.rotulo, gx * TILE + TILE / 2, gy * TILE - 5);
  }

  // Atores, de cima para baixo (quem está mais embaixo cobre quem está atrás).
  const atores = s.w.atores
    .filter((a) => a.vida > 0 && (a.uid === HEROI || visivel(a.x, a.y)))
    .map((a) => ({ a, p: actorPos(a, alpha, tick) }))
    .sort((p, q) => p.p[1] - q.p[1]);
  for (const { a, p } of atores) {
    drawActor(ctx, a, (p[0] + 0.5) * TILE, (p[1] + 0.5) * TILE, t, a.uid === heroi.alvo);
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

  // Névoa: o que já foi visto mas está longe fica escuro.
  ctx.fillStyle = COR.nevoa;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (s.w.revelado[y * m.largura + x] && !visivel(x, y))
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
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
