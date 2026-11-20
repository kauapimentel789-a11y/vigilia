/**
 * Sessão de caça: o mundo em tempo real que está aberto agora.
 *
 * Fica fora do Zustand porque muda ~20 vezes por segundo. A store só recebe o
 * que importa para o progresso (abates, portal fechado). Sobrevive à troca de
 * abas; ao recarregar a página, o caçador volta ao Posto.
 */
import { CONTEUDO } from '../../../content/index.ts';
import type { RtEvent, RtInput, WorldState } from '../../../engine/realtime/state.ts';
import { HEROI, heroOf } from '../../../engine/realtime/state.ts';
import { applyProfile, createWorld, stepWorld } from '../../../engine/realtime/world.ts';
import { autoHuntInput } from '../../../engine/realtime/auto.ts';
import type { HunterProfile } from '../../../engine/hunter/stats.ts';
import type { VisualHabilidade } from '../../../engine/definitions.ts';

export interface Flutuante {
  x: number;
  y: number;
  texto: string;
  cor: string;
  nasceu: number;
}

export interface Golpe {
  de: [number, number];
  para: [number, number];
  distancia: number;
  heroi: boolean;
  nasceu: number;
}

/** Quem caiu: o sprite afunda e some no lugar. */
export interface Morte {
  x: number;
  y: number;
  defId: string;
  chefe: boolean;
  esquerda: boolean;
  nasceu: number;
}

/** Fagulha de pixel: sai voando de quem levou golpe. */
export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  cor: string;
  nasceu: number;
  vida: number;
  tam: number;
}

/** Efeito visual de uma habilidade do caçador. */
export interface Magia {
  tipo: VisualHabilidade['tipo'];
  cor: string;
  de: [number, number];
  para: [number, number] | null;
  raio: number;
  nasceu: number;
  semente: number;
}

export interface Sessao {
  w: WorldState;
  perfil: HunterProfile;
  /** Relógio da tela, em ms (performance.now). */
  agora: number;
  flutuantes: Flutuante[];
  golpes: Golpe[];
  /** Último golpe recebido por cada ator (para o lampejo branco). */
  acertos: Map<string, number>;
  /** Último ataque de cada ator: o corpo avança na direção do alvo. */
  investidas: Map<string, { dx: number; dy: number; t: number }>;
  mortes: Morte[];
  particulas: Particula[];
  /** Tremor da tela: força em px e quando acaba. */
  tremor: { forca: number; ate: number };
  /** Lampejo de fase de chefe (anel que se expande a partir dele). */
  ondas: Array<{ x: number; y: number; cor: string; nasceu: number }>;
  magias: Magia[];
  /** Golpes fortes que acabaram de cair: a área pisca e solta fagulhas. */
  impactos: Array<{ tiles: Array<[number, number]>; nasceu: number; chefe: boolean }>;
  /** Comandos de um passo só (clique, alvo, habilidade), na ordem em que chegaram. */
  fila: RtInput[];
  /** Direção segurada no teclado. */
  dir: [number, number];
  /** Depois de trocar de mapa, ignora a direção até o jogador soltar as teclas. */
  travaDir: boolean;
  /** Auto-caçar ligado (só em portais já fechados). */
  auto: boolean;
  /** Registro curto de acontecimentos. */
  log: Array<{ texto: string; cor: string; t: number }>;
}

function efeitosVazios() {
  return {
    acertos: new Map<string, number>(),
    investidas: new Map<string, { dx: number; dy: number; t: number }>(),
    mortes: [] as Morte[],
    particulas: [] as Particula[],
    tremor: { forca: 0, ate: 0 },
    ondas: [] as Array<{ x: number; y: number; cor: string; nasceu: number }>,
    magias: [] as Magia[],
    impactos: [] as Array<{ tiles: Array<[number, number]>; nasceu: number; chefe: boolean }>,
  };
}

/** Sacode a tela; um tremor mais forte substitui um mais fraco. */
export function tremer(s: Sessao, forca: number, ms: number): void {
  if (s.agora < s.tremor.ate && s.tremor.forca > forca) return;
  s.tremor = { forca, ate: s.agora + ms };
}

function fagulhas(s: Sessao, x: number, y: number, cor: string, n: number, forca = 1): void {
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const v = (0.6 + Math.random() * 1.4) * forca;
    s.particulas.push({
      x: x + 0.5,
      y: y + 0.4,
      vx: Math.cos(ang) * v,
      vy: Math.sin(ang) * v - 1.2 * forca,
      cor,
      nasceu: s.agora,
      vida: 380 + Math.random() * 320,
      tam: Math.random() < 0.3 ? 4 : 3,
    });
  }
  if (s.particulas.length > 260) s.particulas.splice(0, s.particulas.length - 260);
}

const semente = () => Math.floor(Math.random() * 2 ** 31);

let sessao: Sessao | null = null;

export function getSessao(perfil: HunterProfile): Sessao {
  if (!sessao) {
    sessao = {
      w: createWorld(CONTEUDO, CONTEUDO.mapaInicial, perfil, semente()),
      perfil,
      agora: 0,
      flutuantes: [],
      golpes: [],
      ...efeitosVazios(),
      fila: [],
      dir: [0, 0],
      travaDir: false,
      auto: false,
      log: [],
    };
  } else if (sessao.perfil !== perfil) {
    applyProfile(sessao.w, CONTEUDO, perfil);
    sessao.perfil = perfil;
  }
  return sessao;
}

/** Troca de mapa. No Posto a vida volta cheia; nos portais ela é mantida. */
export function trocarMapa(s: Sessao, mapaId: string): void {
  const vida = heroOf(s.w).vida;
  const posto = CONTEUDO.mapas[mapaId]?.tipo === 'posto';
  s.w = createWorld(CONTEUDO, mapaId, s.perfil, semente(), posto ? undefined : vida);
  s.flutuantes = [];
  s.golpes = [];
  Object.assign(s, efeitosVazios());
  s.fila = [];
  s.travaDir = true;
  s.auto = false;
}

export function registrar(s: Sessao, texto: string, cor = '#c9cedd'): void {
  s.log.push({ texto, cor, t: s.agora });
  if (s.log.length > 5) s.log.shift();
}

/** Avança um passo fixo com os comandos pendentes e devolve os eventos. */
export function passo(s: Sessao, pocoes: number, mochilaCheia = false): RtEvent[] {
  const segurando = s.dir[0] !== 0 || s.dir[1] !== 0;
  if (!segurando) s.travaDir = false;
  const input: RtInput = { dir: segurando && !s.travaDir ? s.dir : null };
  const pendente = s.fila.shift();
  if (pendente) Object.assign(input, pendente);
  // Auto-caçar só decide quando o jogador não está mandando nada.
  else if (s.auto && !input.dir)
    Object.assign(input, autoHuntInput(s.w, CONTEUDO, s.perfil, { pocoes, mochilaCheia }));
  return stepWorld(s.w, CONTEUDO, s.perfil, input);
}

function pos(s: Sessao, uid: string): [number, number] | null {
  const a = s.w.atores.find((x) => x.uid === uid);
  return a ? [a.x, a.y] : null;
}

/** Transforma eventos em números flutuantes e rastros de golpe. */
export function efeitosVisuais(s: Sessao, ev: RtEvent): void {
  const flut = (uid: string, texto: string, cor: string) => {
    const p = pos(s, uid);
    if (p) s.flutuantes.push({ x: p[0], y: p[1], texto, cor, nasceu: s.agora });
  };
  switch (ev.tipo) {
    case 'dano': {
      const p = pos(s, ev.alvo);
      if (ev.valor > 0) {
        s.acertos.set(ev.alvo, s.agora);
        if (p)
          fagulhas(
            s,
            p[0],
            p[1],
            ev.alvo === HEROI ? '#ff5a6e' : ev.critico ? '#f2b56b' : '#f4f1ff',
            ev.critico ? 10 : 6,
            ev.critico ? 1.3 : 1,
          );
        const h = heroOf(s.w);
        if (ev.alvo === HEROI) {
          const frac = ev.valor / Math.max(1, h.vidaMax);
          if (frac >= 0.08) tremer(s, Math.min(9, 3 + frac * 30), 260);
        } else if (ev.critico) tremer(s, 2, 120);
      }
      if (ev.valor > 0 || ev.bloqueado === 0)
        flut(
          ev.alvo,
          ev.critico ? `${ev.valor}!` : `${ev.valor}`,
          ev.alvo === HEROI ? '#e5536b' : ev.critico ? '#f2b56b' : '#e4e6f0',
        );
      if (ev.bloqueado > 0) flut(ev.alvo, `(${ev.bloqueado})`, '#6aa8e8');
      break;
    }
    case 'perdaDeVida':
      flut(ev.alvo, `${ev.valor}`, ev.motivo === 'queimadura' ? '#ff9a3c' : '#8bc34a');
      break;
    case 'invocado':
      flut(ev.alvo, 'Invocado!', '#ff8a8a');
      break;
    case 'cura':
      flut(ev.alvo, `+${ev.valor}`, '#6fcf97');
      break;
    case 'bloqueio':
      flut(ev.alvo, `+${ev.valor} ⛨`, '#6aa8e8');
      break;
    case 'preparo':
      flut(ev.origem, `⚠ ${ev.nome}`, '#ff8a8a');
      break;
    case 'impacto': {
      const chefe = s.w.atores.find((x) => x.uid === ev.origem)?.chefe ?? false;
      s.impactos.push({ tiles: ev.tiles, nasceu: s.agora, chefe });
      if (s.impactos.length > 12) s.impactos.shift();
      const passo = Math.max(1, Math.floor(ev.tiles.length / 8));
      for (let i = 0; i < ev.tiles.length; i += passo) {
        const [x, y] = ev.tiles[i]!;
        fagulhas(s, x, y, chefe ? '#ffb35a' : '#ff7a6a', 3, 0.8);
      }
      tremer(s, chefe ? 6 : 3, chefe ? 260 : 140);
      break;
    }
    case 'esquiva':
      flut(ev.alvo, 'Esquivou!', '#d9d3ff');
      break;
    case 'abate': {
      const a = s.w.atores.find((x) => x.uid === ev.alvo);
      if (a) {
        s.mortes.push({
          x: a.x,
          y: a.y,
          defId: a.defId,
          chefe: ev.chefe,
          esquerda: a.x < a.deX,
          nasceu: s.agora,
        });
        fagulhas(
          s,
          a.x,
          a.y,
          ev.chefe ? '#f2b56b' : '#8b7cf6',
          ev.chefe ? 40 : 12,
          ev.chefe ? 1.8 : 1,
        );
        if (ev.chefe) {
          tremer(s, 10, 600);
          s.ondas.push({ x: a.x, y: a.y, cor: '#f2b56b', nasceu: s.agora });
        }
      }
      break;
    }
    case 'especial': {
      const p = pos(s, ev.origem);
      if (p) {
        s.ondas.push({ x: p[0], y: p[1], cor: '#ff5a6e', nasceu: s.agora });
        fagulhas(s, p[0], p[1], '#ff8a5a', 18, 1.5);
      }
      tremer(s, 6, 400);
      break;
    }
    case 'habilidade': {
      const def = CONTEUDO.habilidades[ev.id];
      const h = heroOf(s.w);
      const alvo = h.alvo ? pos(s, h.alvo) : null;
      const v = def?.visual ?? { tipo: 'corte' as const, cor: '#f4f1ff' };
      s.magias.push({
        tipo: v.tipo,
        cor: v.cor,
        de: [h.x, h.y],
        para: alvo,
        raio: def?.raio ?? 1,
        nasceu: s.agora,
        semente: Math.random(),
      });
      if (v.tipo === 'explosao' || v.tipo === 'nova') tremer(s, 3, 160);
      if (v.tipo === 'cura') fagulhas(s, h.x, h.y, v.cor, 14, 0.7);
      break;
    }
    case 'ataque': {
      const de = pos(s, ev.origem);
      const para = pos(s, ev.alvo);
      if (de && para) {
        const d = Math.hypot(para[0] - de[0], para[1] - de[1]) || 1;
        s.investidas.set(ev.origem, {
          dx: (para[0] - de[0]) / d,
          dy: (para[1] - de[1]) / d,
          t: s.agora,
        });
      }
      if (de && para)
        s.golpes.push({
          de,
          para,
          distancia: ev.distancia,
          heroi: ev.origem === HEROI,
          nasceu: s.agora,
        });
      break;
    }
    default:
      break;
  }
}

/** A sessão aberta, se houver (para testes e o painel de teste). */
export function sessaoAtual(): Sessao | null {
  return sessao;
}
