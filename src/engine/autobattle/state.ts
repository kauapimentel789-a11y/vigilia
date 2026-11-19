/**
 * Estado do combate automático e os eventos que ele registra.
 *
 * O estado é um objeto simples, serializável. Cada evento carrega o instante
 * (`t`, em ms de jogo) em que aconteceu, para a interface reproduzir a luta.
 */
import type { Rng } from '../core/index.ts';
import type { GameContent } from '../definitions.ts';
import type { EffectUnit } from '../effects/effects.ts';
import type { StatusId, StatusMap } from '../statuses/statuses.ts';

export type Lado = 'cacador' | 'inimigo';

export interface BattleUnit extends EffectUnit {
  uid: string;
  defId: string;
  nome: string;
  lado: Lado;
  vida: number;
  vidaMax: number;
  bloqueio: number;
  status: StatusMap;
  ataque: number;
  velocidade: number;
  reducao: number;
  critico: number;
  danoCritico: number;
  /** Carga de ação: ao chegar em `cargaParaAgir`, a unidade age. */
  carga: number;
  /** Inimigos: id da próxima ação (sempre a que será executada). */
  intencao: string | null;
  /** Inimigos: posição no ciclo de ações. */
  cicloIndice: number;
  especialUsado: boolean;
}

export type BattleResult = 'vitoria' | 'derrota';

export interface BattleStats {
  danoCausado: number;
  danoRecebido: number;
  curaTotal: number;
  /** Dano causado pelo caçador, por fonte (id da habilidade, "basico" ou status). */
  danoPorFonte: Record<string, number>;
  usos: Record<string, number>;
}

export interface BattleState {
  t: number;
  onda: number;
  totalOndas: number;
  resultado: BattleResult | null;
  motivo: 'inimigosDerrotados' | 'cacadorCaiu' | 'tempoEsgotado' | null;
  cacador: BattleUnit;
  inimigos: BattleUnit[];
  /** Recarga restante de cada habilidade equipada, em ms. */
  recargas: Record<string, number>;
  proximoUid: number;
  stats: BattleStats;
}

type EventBody =
  | {
      tipo: 'onda';
      onda: number;
      total: number;
      inimigos: Array<{ uid: string; defId: string; nome: string }>;
    }
  | { tipo: 'acao'; ator: string; acao: string; nome: string; alvo?: string }
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
  | { tipo: 'intencao'; inimigo: string; acao: string; nome: string; forte: boolean }
  | { tipo: 'especial'; inimigo: string; anuncio: string }
  | { tipo: 'derrotado'; alvo: string }
  | { tipo: 'fim'; resultado: BattleResult; motivo: NonNullable<BattleState['motivo']> };

export type BattleEvent = EventBody & { t: number };

/** Foto das unidades num instante, para a interface desenhar sem recalcular. */
export interface UnitSnapshot {
  uid: string;
  defId: string;
  nome: string;
  lado: Lado;
  vida: number;
  vidaMax: number;
  bloqueio: number;
  status: StatusMap;
  /** Carga de ação de 0 a 1. */
  carga: number;
  intencao: string | null;
}

export interface BattleFrame {
  t: number;
  onda: number;
  unidades: UnitSnapshot[];
  recargas: Record<string, number>;
}

/** Contexto de uma simulação em andamento. */
export interface BattleCtx {
  state: BattleState;
  content: GameContent;
  rng: Rng;
  eventos: BattleEvent[];
  registrar: boolean;
}

export function emit(ctx: BattleCtx, evento: EventBody): void {
  if (ctx.registrar) ctx.eventos.push({ ...evento, t: ctx.state.t } as BattleEvent);
}

export function alive(units: readonly BattleUnit[]): BattleUnit[] {
  return units.filter((u) => u.vida > 0);
}

export function opponentsOf(state: BattleState, u: BattleUnit): BattleUnit[] {
  return u.lado === 'cacador'
    ? alive(state.inimigos)
    : state.cacador.vida > 0
      ? [state.cacador]
      : [];
}

export function alliesOf(state: BattleState, u: BattleUnit): BattleUnit[] {
  return u.lado === 'cacador' ? [state.cacador] : alive(state.inimigos);
}
