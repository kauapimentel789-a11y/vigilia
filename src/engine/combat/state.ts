/**
 * Estado do combate, eventos e operações básicas sobre as pilhas de cartas.
 *
 * O estado é sempre um objeto simples (sem classes), serializável.
 */
import type { Rng } from '../core/index.ts';
import { createRng, restoreRng } from '../core/index.ts';
import type { Effect } from '../effects/effects.ts';
import type { StatusId, StatusMap } from '../statuses/statuses.ts';
import type { CombatContent, EncounterDef } from './definitions.ts';

export interface UnitBase {
  uid: string;
  defId: string;
  nome: string;
  vida: number;
  vidaMax: number;
  bloqueio: number;
  status: StatusMap;
}

export interface PlayerUnit extends UnitBase {
  tipo: 'jogador';
}

export interface EnemyUnit extends UnitBase {
  tipo: 'inimigo';
  /** Id da ação que o inimigo vai executar no próximo turno dele. */
  intencao: string | null;
  ia: { indice: number; historico: string[] };
  especiaisUsados: string[];
}

export interface AllyUnit extends UnitBase {
  tipo: 'aliado';
}

export type Unit = PlayerUnit | EnemyUnit | AllyUnit;

export interface CardInstance {
  uid: string;
  defId: string;
}

export interface RitualState {
  fonte: string;
  descricao: string;
  efeitos: Effect[];
}

export type CombatResult = 'vitoria' | 'derrota' | 'empate';

export interface CombatStats {
  danoCausado: number;
  danoRecebido: number;
  cartasJogadas: number;
  brasaGasta: number;
  /** Dano causado aos inimigos, por fonte (id da carta, aliado, veneno). */
  danoPorFonte: Record<string, number>;
}

export interface CombatState {
  encontro: string;
  semente: number;
  rngState: number;
  turno: number;
  resultado: CombatResult | null;
  jogador: PlayerUnit;
  energia: number;
  brasa: number;
  aliado: AllyUnit | null;
  inimigos: EnemyUnit[];
  compra: CardInstance[];
  mao: CardInstance[];
  descarte: CardInstance[];
  consumidas: CardInstance[];
  rituais: RitualState[];
  stats: CombatStats;
  proximoUid: number;
}

export type CombatEvent =
  | { tipo: 'turnoIniciado'; turno: number }
  | { tipo: 'cartasCompradas'; quantidade: number }
  | { tipo: 'maoCheia'; carta: string }
  | { tipo: 'descarteReembaralhado'; quantidade: number }
  | { tipo: 'cartaJogada'; carta: string; avivada: boolean; alvo?: string }
  | { tipo: 'dano'; fonte: string; origem: string; alvo: string; valor: number; bloqueado: number }
  | { tipo: 'perdaDeVida'; alvo: string; valor: number; motivo: StatusId }
  | { tipo: 'bloqueio'; alvo: string; valor: number }
  | { tipo: 'status'; alvo: string; status: StatusId; valor: number }
  | { tipo: 'brasa'; delta: number; total: number; excedente?: number }
  | { tipo: 'ritualAtivado'; fonte: string; descricao: string }
  | { tipo: 'ritualDisparado'; fonte: string }
  | { tipo: 'aliadoInvocado'; aliado: string; renovado: boolean }
  | { tipo: 'aliadoAgiu'; acao: string }
  | { tipo: 'inimigoAgiu'; inimigo: string; acao: string }
  | { tipo: 'intencaoDefinida'; inimigo: string; acao: string }
  | { tipo: 'especialAtivado'; inimigo: string; anuncio: string }
  | { tipo: 'derrotado'; alvo: string }
  | { tipo: 'combateEncerrado'; resultado: CombatResult };

/** Contexto de execução de um comando: uma cópia do estado que pode ser alterada. */
export interface Ctx {
  state: CombatState;
  content: CombatContent;
  rng: Rng;
  eventos: CombatEvent[];
}

export function emit(ctx: Ctx, evento: CombatEvent): void {
  ctx.eventos.push(evento);
}

export function isOver(ctx: Ctx): boolean {
  return ctx.state.resultado !== null;
}

export function aliveEnemies(state: CombatState): EnemyUnit[] {
  return state.inimigos.filter((i) => i.vida > 0);
}

export function nextUid(state: CombatState, prefixo: string): string {
  return `${prefixo}${state.proximoUid++}`;
}

export function findUnit(state: CombatState, uid: string): Unit | undefined {
  if (state.jogador.uid === uid) return state.jogador;
  if (state.aliado?.uid === uid) return state.aliado;
  return state.inimigos.find((i) => i.uid === uid);
}

/** Abre um contexto sobre uma cópia profunda do estado. */
export function openCtx(state: CombatState, content: CombatContent): Ctx {
  const copia = structuredClone(state);
  return { state: copia, content, rng: restoreRng(copia.rngState), eventos: [] };
}

export function closeCtx(ctx: Ctx): CombatState {
  ctx.state.rngState = ctx.rng.getState();
  return ctx.state;
}

/**
 * Compra cartas. Se a pilha de compra acabar, o descarte inteiro é embaralhado
 * e vira a nova pilha. Com a mão cheia, a carta comprada vai para o descarte.
 */
export function drawCards(ctx: Ctx, quantidade: number): void {
  const s = ctx.state;
  let compradas = 0;
  for (let i = 0; i < quantidade; i++) {
    if (s.compra.length === 0) {
      if (s.descarte.length === 0) break;
      s.compra = ctx.rng.shuffle(s.descarte);
      s.descarte = [];
      emit(ctx, { tipo: 'descarteReembaralhado', quantidade: s.compra.length });
    }
    const carta = s.compra.shift() as CardInstance;
    if (s.mao.length >= ctx.content.jogador.maoMax) {
      s.descarte.push(carta);
      emit(ctx, { tipo: 'maoCheia', carta: carta.defId });
    } else {
      s.mao.push(carta);
      compradas++;
    }
  }
  if (compradas > 0) emit(ctx, { tipo: 'cartasCompradas', quantidade: compradas });
}

/** Ganha Brasa respeitando o máximo. O excedente é perdido e anunciado. */
export function gainBrasa(ctx: Ctx, valor: number): void {
  if (valor <= 0) return;
  const s = ctx.state;
  const max = ctx.content.jogador.brasaMax;
  const novo = Math.min(max, s.brasa + valor);
  const ganho = novo - s.brasa;
  const excedente = valor - ganho;
  s.brasa = novo;
  emit(ctx, {
    tipo: 'brasa',
    delta: ganho,
    total: novo,
    ...(excedente > 0 ? { excedente } : {}),
  });
}

/** Cria o estado inicial (antes do primeiro turno) de um combate. */
export function createInitialState(
  content: CombatContent,
  encontro: EncounterDef,
  deck: readonly string[],
  semente: number,
): { state: CombatState; rng: Rng } {
  const rng = createRng(semente);
  const j = content.jogador;
  const state: CombatState = {
    encontro: encontro.id,
    semente,
    rngState: 0,
    turno: 0,
    resultado: null,
    jogador: {
      tipo: 'jogador',
      uid: 'jogador',
      defId: 'jogador',
      nome: 'Você',
      vida: j.vidaMax,
      vidaMax: j.vidaMax,
      bloqueio: 0,
      status: {},
    },
    energia: 0,
    brasa: 0,
    aliado: null,
    inimigos: [],
    compra: [],
    mao: [],
    descarte: [],
    consumidas: [],
    rituais: [],
    stats: { danoCausado: 0, danoRecebido: 0, cartasJogadas: 0, brasaGasta: 0, danoPorFonte: {} },
    proximoUid: 1,
  };

  for (const id of deck) {
    if (!content.cartas[id]) throw new Error(`Carta desconhecida no deck: ${id}`);
  }
  state.compra = rng.shuffle(deck.map((defId) => ({ uid: nextUid(state, 'c'), defId })));

  for (const id of encontro.inimigos) {
    const def = content.inimigos[id];
    if (!def) throw new Error(`Inimigo desconhecido no encontro ${encontro.id}: ${id}`);
    state.inimigos.push({
      tipo: 'inimigo',
      uid: nextUid(state, 'i'),
      defId: def.id,
      nome: def.nome,
      vida: def.vidaMax,
      vidaMax: def.vidaMax,
      bloqueio: 0,
      status: {},
      intencao: null,
      ia: { indice: 0, historico: [] },
      especiaisUsados: [],
    });
  }
  return { state, rng };
}
