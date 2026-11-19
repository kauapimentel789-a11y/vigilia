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

export interface Sessao {
  w: WorldState;
  perfil: HunterProfile;
  /** Relógio da tela, em ms (performance.now). */
  agora: number;
  flutuantes: Flutuante[];
  golpes: Golpe[];
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
    case 'dano':
      if (ev.valor > 0 || ev.bloqueado === 0)
        flut(
          ev.alvo,
          ev.critico ? `${ev.valor}!` : `${ev.valor}`,
          ev.alvo === HEROI ? '#e5536b' : ev.critico ? '#f2b56b' : '#e4e6f0',
        );
      if (ev.bloqueado > 0) flut(ev.alvo, `(${ev.bloqueado})`, '#6aa8e8');
      break;
    case 'perdaDeVida':
      flut(ev.alvo, `${ev.valor}`, '#8bc34a');
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
    case 'esquiva':
      flut(ev.alvo, 'Esquivou!', '#d9d3ff');
      break;
    case 'ataque': {
      const de = pos(s, ev.origem);
      const para = pos(s, ev.alvo);
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
