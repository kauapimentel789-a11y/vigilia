/**
 * Desenho do mapa em Canvas 2D. Visual provisório, todo feito em código.
 *
 * Só lê a sessão: não muda nada no mundo. A câmera segue o caçador com o
 * movimento interpolado entre tiles.
 */
import { CONTEUDO } from '../../../content/index.ts';
import type { RtActor } from '../../../engine/realtime/state.ts';
import { HEROI, heroOf } from '../../../engine/realtime/state.ts';
import { actorEnemyDef, loadMap } from '../../../engine/realtime/world.ts';
import type { WorldMap } from '../../../engine/world/map.ts';
import { Tile } from '../../../engine/world/map.ts';
import type { Magia, Sessao } from './session.ts';
import { isPortalOpen } from '../../../engine/game/game.ts';
import { useGame } from '../../store/game.ts';
import { APARENCIA, aparenciaDaClasse, drawSprite } from '../../art/sprites.ts';

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
  aberto = false,
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
  if (tile === Tile.Agua) {
    ctx.fillStyle = COR.agua;
    ctx.fillRect(px, py, TILE, TILE);
    if (COR.agua !== COR_BASE.agua) {
      // Lava: pulsa devagar, cada tile no seu tempo.
      const k = 0.18 + 0.12 * Math.sin(t / 700 + r * 6.28);
      ctx.fillStyle = `rgba(255,140,60,${k})`;
      ctx.fillRect(px, py, TILE, TILE);
    }
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
  if (tile === Tile.Objeto) {
    drawObject(ctx, m.objetos[y * m.largura + x] ?? '', px, py, t, aberto);
    return;
  }
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
};

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
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 12);
    ctx.quadraticCurveTo(cx - 12, cy - 12, cx, cy - 13);
    ctx.quadraticCurveTo(cx + 12, cy - 12, cx + 10, cy + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(242,181,107,${0.75 + 0.25 * Math.sin(t / 300)})`;
    ctx.beginPath();
    ctx.arc(cx + 11, cy + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'bau' || id === 'tesouro') {
    ctx.fillStyle = id === 'bau' ? '#6b4a2b' : aberto ? '#3d3329' : '#8a6a2a';
    ctx.fillRect(cx - 12, cy - 4, 24, 15);
    ctx.fillStyle = aberto ? '#2a231c' : '#a07d3a';
    ctx.fillRect(cx - 12, cy - 10, 24, 7);
    ctx.fillStyle = '#d9c27a';
    ctx.fillRect(cx - 2, cy - 4, 4, 5);
    if (id === 'tesouro' && !aberto) {
      ctx.fillStyle = `rgba(242,181,107,${0.25 + 0.2 * Math.sin(t / 250)})`;
      ctx.fillRect(cx - 14, cy - 12, 28, 25);
    }
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

export function render(
  ctx: CanvasRenderingContext2D,
  s: Sessao,
  cam: Camera,
  alpha: number,
  dpr: number,
): void {
  const t = s.agora;
  const def = CONTEUDO.mapas[s.w.mapa]!;
  COR = { ...COR_BASE, ...TEMAS[def.tema ?? 'cinza'] };
  ehPosto = def.tipo === 'posto';
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
      drawTile(ctx, m, x, y, x * TILE, y * TILE, t, s.w.abertos.includes(y * m.largura + x));
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

  // Avisos de golpe forte: área vermelha que enche até o golpe.
  for (const a of s.w.atores) {
    const p = a.vida > 0 ? a.preparo : null;
    if (!p) continue;
    const k = 1 - Math.max(0, p.restante - alpha * tick) / p.total;
    for (const [x, y] of p.tiles) {
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = `rgba(229,83,107,${0.16 + 0.1 * Math.sin(t / 90)})`;
      ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = 'rgba(229,83,107,0.45)';
      const lado = (TILE - 2) * k;
      ctx.fillRect(px + TILE / 2 - lado / 2, py + TILE / 2 - lado / 2, lado, lado);
      ctx.strokeStyle = '#e5536b';
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
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
      return { a, p, o: a.uid === HEROI ? 1 : opacidade(p[0], p[1]) };
    })
    .filter((x) => x.o > 0)
    .sort((p, q) => p.p[1] - q.p[1]);
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
    ctx.fillRect(ox - w / 2, oy - 16, w, 15);
    ctx.fillStyle = '#f2d9b0';
    ctx.fillText(nome, ox, oy - 5);
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
    ctx.fillRect(gx * TILE + TILE / 2 - w / 2, gy * TILE - 16, w, 15);
    ctx.fillStyle = fechado ? '#7d7f8f' : '#d9d3ff';
    ctx.fillText(rotulo, gx * TILE + TILE / 2, gy * TILE - 5);
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
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const m = loadMap(CONTEUDO.mapas[s.w.mapa]!);
  if (cam.largura >= 560) {
    const esc = Math.max(2, Math.min(150 / m.largura, 110 / m.altura));
    const mw = m.largura * esc;
    const mh = m.altura * esc;
    const ox = cam.largura - mw - 12;
    const oy = cam.altura - mh - 12;
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
      if (a.uid === HEROI || a.vida <= 0) continue;
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
  const recentes = s.log.filter((l) => s.agora - l.t < 10000);
  recentes.forEach((l, i) => {
    const y = cam.altura - 14 - (recentes.length - 1 - i) * 17;
    ctx.globalAlpha = Math.min(1, (10000 - (s.agora - l.t)) / 1500);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(10, y - 12, ctx.measureText(l.texto).width + 10, 16);
    ctx.fillStyle = l.cor;
    ctx.fillText(l.texto, 15, y);
  });
  ctx.globalAlpha = 1;
}
