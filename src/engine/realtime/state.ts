/**
 * Estado do mundo em tempo real (um mapa) e os eventos que ele produz.
 *
 * O mundo avança em passos fixos (`mundo.tickMs`). Com a mesma semente e a mesma
 * sequência de comandos, o resultado é sempre o mesmo.
 */
import type { BattleUnit } from '../autobattle/state.ts';
import type { StatusId } from '../statuses/statuses.ts';
import type { ItemInstance } from '../items/items.ts';

export interface GroundItem {
  id: string;
  item: ItemInstance;
  x: number;
  y: number;
}

export interface RtActor extends BattleUnit {
  /** Tile lógico atual (o destino, se estiver andando). */
  x: number;
  y: number;
  /** Tile de onde saiu, para a tela interpolar o movimento. */
  deX: number;
  deY: number;
  moverRestante: number;
  moverTotal: number;
  passoMs: number;
  atkIntervalo: number;
  atkCd: number;
  alcance: number;
  alvo: string | null;
  caminho: Array<[number, number]>;
  recalcular: number;
  origemX: number;
  origemY: number;
  chefe: boolean;
  /** Invocado por um chefe: não renasce e some quando o chefe cai. */
  invocado: boolean;
  /** Chefe abaixo de 25% de vida: ataca e anda mais rápido (uma vez por luta). */
  furiaFinal?: boolean;
  agressivo: boolean;
  /** Tempo até renascer, em ms. Negativo: não renasce. */
  renascer: number;
  xp: number;
  ouro: number;
  /** Índice do tile do objeto com que o caçador vai interagir ao chegar perto. */
  interagir: number | null;
  /** Golpe forte sendo preparado: a área avisada no chão e o tempo que falta. */
  /** Chefe protegido enquanto os ajudantes invocados vivem. */
  blindado?: boolean;
  preparo: { acao: string; restante: number; total: number; tiles: Array<[number, number]> } | null;
}

export interface WorldState {
  mapa: string;
  t: number;
  rngState: number;
  atores: RtActor[];
  proximoId: number;
  /** 1 para cada tile já visto (névoa de guerra). */
  revelado: number[];
  /** Recarga restante de cada habilidade, em ms. */
  recargas: Record<string, number>;
  heroiCaido: boolean;
  chefeDerrotado: boolean;
  /** Itens caídos no chão, esperando alguém pegar. */
  chao: GroundItem[];
  /** Baús de tesouro já abertos neste mapa (índice do tile). */
  abertos: number[];
  /** Recarga da poção, em ms. */
  recargaPocao: number;
}

type Body =
  | { tipo: 'ataque'; origem: string; alvo: string; distancia: number }
  | {
      tipo: 'dano';
      origem: string;
      alvo: string;
      valor: number;
      bloqueado: number;
      critico: boolean;
    }
  | { tipo: 'perdaDeVida'; alvo: string; valor: number; motivo: StatusId }
  | { tipo: 'bloqueio'; alvo: string; valor: number }
  | { tipo: 'cura'; alvo: string; valor: number }
  | { tipo: 'status'; alvo: string; status: StatusId; valor: number }
  | { tipo: 'limpar'; alvo: string; status: StatusId }
  | { tipo: 'habilidade'; origem: string; id: string; nome: string }
  | { tipo: 'aviso'; texto: string }
  | { tipo: 'especial'; origem: string; anuncio: string }
  | { tipo: 'preparo'; origem: string; nome: string; tiles: Array<[number, number]> }
  | { tipo: 'impacto'; origem: string; tiles: Array<[number, number]> }
  | { tipo: 'esquiva'; origem: string; alvo: string }
  | { tipo: 'abate'; alvo: string; defId: string; xp: number; ouro: number; chefe: boolean }
  | { tipo: 'renasceu'; alvo: string }
  /** Um chefe chamou ajuda. */
  | { tipo: 'invocado'; alvo: string; defId: string; x: number; y: number }
  /** Um invocado sumiu porque o chefe caiu. */
  | { tipo: 'desfeito'; alvo: string }
  | { tipo: 'saque'; id: string; x: number; y: number }
  /** O caçador pisou num tile com itens. */
  | { tipo: 'itemNoChao'; ids: string[] }
  /** Chegou perto de um objeto (personagem do Posto ou baú). */
  | { tipo: 'interagir'; objeto: string; x: number; y: number }
  | { tipo: 'pocao'; cura: number }
  | { tipo: 'heroiCaiu' }
  | { tipo: 'portao'; destino: string; rotulo: string };

export type RtEvent = Body & { t: number };

/** Comandos do jogador para um passo. Campos ausentes não mudam nada. */
export interface RtInput {
  /** Direção segurada no teclado/joystick. */
  dir?: readonly [number, number] | null;
  /** Clique no chão: andar até o tile. */
  irPara?: readonly [number, number] | null;
  /** Escolher alvo (id de um monstro) ou limpar (null). */
  alvo?: string | null;
  /** Usar a habilidade do espaço indicado (0 a 3). */
  habilidade?: number;
  /** Ir até um objeto e interagir com ele. */
  interagir?: readonly [number, number];
  /** Beber uma poção (a interface confere se há poções). */
  pocao?: boolean;
}

export const HEROI = 'heroi';

export function heroOf(w: WorldState): RtActor {
  return w.atores.find((a) => a.uid === HEROI) as RtActor;
}
