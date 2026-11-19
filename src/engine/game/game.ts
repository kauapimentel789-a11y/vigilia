/**
 * Estado completo do jogo e os comandos que o alteram.
 *
 * Todo comando é puro: recebe o estado atual e devolve um estado novo (ou um
 * erro), sem alterar a entrada. A interface só chama estes comandos.
 */
import type { AtributoId, GameContent, PortalDef, SlotId } from '../definitions.ts';
import type { PortalBattleOutput } from '../autobattle/simulate.ts';
import { simulatePortal } from '../autobattle/simulate.ts';
import type { ExpeditionGains, ExpeditionState } from '../expedition/expedition.ts';
import { accruedGains, calculateRate, rewardMultiplier } from '../expedition/expedition.ts';
import type { Comportamento, HunterResult, HunterState } from '../hunter/hunter.ts';
import { changeAttribute, createHunter, gainXp, resetAttributes } from '../hunter/hunter.ts';
import { setBehavior, setEquipped, upgradeAbility } from '../hunter/abilities.ts';
import { buildProfile } from '../hunter/stats.ts';
import type { ItemInstance } from '../items/items.ts';
import { baseOf } from '../items/items.ts';

export const VERSAO_DO_ESTADO = 2;

export interface GameState {
  versao: typeof VERSAO_DO_ESTADO;
  cacador: HunterState;
  ouro: number;
  portaisFechados: string[];
  expedicao: ExpeditionState | null;
  /** Próxima semente de combate. Avança a cada uso, para as lutas variarem. */
  proximaSemente: number;
  registro: { lutas: number; vitorias: number; criadoEm: number };
  /** Itens carregados (fora o que está vestido). Perdidos se o caçador cair. */
  mochila: ItemInstance[];
  /** Contador para dar um id único a cada item que entra no jogo. */
  proximoItem: number;
}

export type GameResult<Extra = object> =
  | ({ estado: GameState; erro?: undefined } & Extra)
  | ({ estado?: undefined; erro: string } & { [K in keyof Extra]?: undefined });

export function newGame(content: GameContent, semente: number, agora: number): GameState {
  return {
    versao: VERSAO_DO_ESTADO,
    cacador: createHunter(content),
    ouro: 0,
    portaisFechados: [],
    expedicao: null,
    proximaSemente: semente >>> 0,
    registro: { lutas: 0, vitorias: 0, criadoEm: agora },
    mochila: [],
    proximoItem: 1,
  };
}

function nextSeed(s: number): number {
  return (Math.imul(s, 1664525) + 1013904223) >>> 0;
}

export function isPortalOpen(estado: GameState, content: GameContent, portalId: string): boolean {
  const p = content.portais[portalId];
  if (!p) return false;
  return !p.requer || estado.portaisFechados.includes(p.requer);
}

function portalOrError(content: GameContent, id: string): PortalDef | string {
  return content.portais[id] ?? `Portal desconhecido: ${id}`;
}

/* ---------- Caçador ---------- */

function withHunter(estado: GameState, r: HunterResult): GameResult {
  if (r.erro !== undefined) return { erro: r.erro };
  return { estado: { ...structuredClone(estado), cacador: r.cacador } };
}

export function spendPoint(
  estado: GameState,
  content: GameContent,
  a: AtributoId,
  delta: number,
): GameResult {
  return withHunter(estado, changeAttribute(estado.cacador, content, a, delta));
}

export function respec(estado: GameState, content: GameContent): GameResult {
  return {
    estado: { ...structuredClone(estado), cacador: resetAttributes(estado.cacador, content) },
  };
}

export function equip(estado: GameState, content: GameContent, ids: readonly string[]): GameResult {
  return withHunter(estado, setEquipped(estado.cacador, content, ids));
}

export function changeBehavior(estado: GameState, comportamento: Comportamento): GameResult {
  return withHunter(estado, setBehavior(estado.cacador, comportamento));
}

export function upgrade(estado: GameState, content: GameContent, habilidade: string): GameResult {
  const r = upgradeAbility(estado.cacador, content, habilidade, estado.ouro);
  if ('erro' in r) return { erro: r.erro };
  const novo = structuredClone(estado);
  novo.cacador = r.cacador;
  novo.ouro -= r.custo;
  return { estado: novo };
}

/* ---------- Portais ---------- */

export interface Reward {
  xp: number;
  ouro: number;
  levelsGanhos: number;
  primeiraVitoria: boolean;
}

/** Entra num portal: simula a luta completa (com registro) e aplica a recompensa. */
export function fightPortal(
  estado: GameState,
  content: GameContent,
  portalId: string,
): GameResult<{ batalha: PortalBattleOutput; recompensa: Reward }> {
  if (estado.expedicao) return { erro: 'O caçador está em expedição. Chame-o de volta primeiro.' };
  const portal = portalOrError(content, portalId);
  if (typeof portal === 'string') return { erro: portal };
  if (!isPortalOpen(estado, content, portalId))
    return { erro: `${portal.nome} ainda está fechado.` };

  const novo = structuredClone(estado);
  const batalha = simulatePortal({
    perfil: buildProfile(estado.cacador, content),
    portal,
    content,
    semente: estado.proximaSemente,
    registrar: true,
  });
  novo.proximaSemente = nextSeed(estado.proximaSemente);
  novo.registro.lutas++;

  const recompensa: Reward = { xp: 0, ouro: 0, levelsGanhos: 0, primeiraVitoria: false };
  if (batalha.resultado === 'vitoria') {
    novo.registro.vitorias++;
    recompensa.primeiraVitoria = !estado.portaisFechados.includes(portalId);
    const mult = rewardMultiplier(content, portal, estado.cacador.level);
    const primeira = recompensa.primeiraVitoria ? portal.primeiraVitoria : { xp: 0, ouro: 0 };
    recompensa.xp = Math.round(portal.recompensa.xp * mult) + primeira.xp;
    recompensa.ouro = Math.round(portal.recompensa.ouro * mult) + primeira.ouro;
    if (recompensa.primeiraVitoria) novo.portaisFechados.push(portalId);
    const r = gainXp(novo.cacador, content, recompensa.xp);
    novo.cacador = r.cacador;
    recompensa.levelsGanhos = r.levelsGanhos;
    novo.ouro += recompensa.ouro;
  }
  return { estado: novo, batalha, recompensa };
}

/* ---------- Expedição ---------- */

function withRate(
  estado: GameState,
  content: GameContent,
  portal: PortalDef,
): GameState['expedicao'] & object {
  const taxa = calculateRate(
    buildProfile(estado.cacador, content),
    portal,
    content,
    estado.proximaSemente,
  );
  return { portal: portal.id, inicio: 0, ultimaColeta: 0, taxa };
}

export function startExpedition(
  estado: GameState,
  content: GameContent,
  portalId: string,
  agora: number,
): GameResult {
  if (estado.expedicao) return { erro: 'Já existe uma expedição em andamento.' };
  const portal = portalOrError(content, portalId);
  if (typeof portal === 'string') return { erro: portal };
  if (!estado.portaisFechados.includes(portalId)) {
    return { erro: 'Só dá para enviar o caçador a um portal já fechado.' };
  }
  const novo = structuredClone(estado);
  novo.expedicao = { ...withRate(estado, content, portal), inicio: agora, ultimaColeta: agora };
  novo.proximaSemente = nextSeed(estado.proximaSemente);
  return { estado: novo };
}

export interface Collected {
  ganhos: ExpeditionGains;
  levelsGanhos: number;
}

/**
 * Coleta o que a expedição rendeu desde a última coleta e recalcula a taxa com o
 * caçador atual. Com `encerrar`, o caçador volta e a expedição termina.
 */
export function collectExpedition(
  estado: GameState,
  content: GameContent,
  agora: number,
  encerrar = false,
): GameResult<Collected> {
  const exp = estado.expedicao;
  if (!exp) return { erro: 'Nenhuma expedição em andamento.' };
  const portal = portalOrError(content, exp.portal);
  if (typeof portal === 'string') return { erro: portal };

  const ganhos = accruedGains(exp, agora, content, estado.cacador);
  const novo = structuredClone(estado);
  const r = gainXp(novo.cacador, content, ganhos.xp);
  novo.cacador = r.cacador;
  novo.ouro += ganhos.ouro;
  novo.registro.lutas += ganhos.lutas;
  novo.registro.vitorias += ganhos.vitorias;
  if (encerrar) {
    novo.expedicao = null;
  } else {
    novo.expedicao = {
      ...withRate(novo, content, portal),
      inicio: exp.inicio,
      ultimaColeta: agora,
    };
    novo.proximaSemente = nextSeed(estado.proximaSemente);
  }
  return { estado: novo, ganhos, levelsGanhos: r.levelsGanhos };
}

/** Ferramenta de teste: faz a expedição "envelhecer" `ms`, como se o tempo tivesse passado. */
export function advanceTime(estado: GameState, ms: number): GameState {
  const novo = structuredClone(estado);
  if (novo.expedicao) {
    novo.expedicao.inicio -= ms;
    novo.expedicao.ultimaColeta -= ms;
  }
  return novo;
}

/* ---------- Mapa ---------- */

export interface KillReward {
  xp: number;
  ouro: number;
  levelsGanhos: number;
  /** O abate fechou o portal pela primeira vez (chefe). */
  primeiraVitoria: boolean;
}

/**
 * Paga um abate no mapa. O XP e o ouro do monstro já vêm escalados pelo portal;
 * aqui entra a queda por level e, no chefe, o bônus da primeira vitória.
 */
export function rewardKill(
  estado: GameState,
  content: GameContent,
  portalId: string,
  abate: { xp: number; ouro: number; chefe: boolean },
): GameResult<{ recompensa: KillReward }> {
  const portal = portalOrError(content, portalId);
  if (typeof portal === 'string') return { erro: portal };
  const novo = structuredClone(estado);
  const mult = rewardMultiplier(content, portal, estado.cacador.level);
  const primeiraVitoria = abate.chefe && !estado.portaisFechados.includes(portalId);
  const bonus = primeiraVitoria ? portal.primeiraVitoria : { xp: 0, ouro: 0 };
  const xp = Math.round(abate.xp * mult) + bonus.xp;
  const ouro = Math.round(abate.ouro * mult) + bonus.ouro;
  if (primeiraVitoria) novo.portaisFechados.push(portalId);
  if (abate.chefe) {
    novo.registro.lutas++;
    novo.registro.vitorias++;
  }
  const r = gainXp(novo.cacador, content, xp);
  novo.cacador = r.cacador;
  novo.ouro += ouro;
  return { estado: novo, recompensa: { xp, ouro, levelsGanhos: r.levelsGanhos, primeiraVitoria } };
}

/* ---------- Itens ---------- */

/** Põe um item achado na mochila, com um id novo. */
export function pickUp(
  estado: GameState,
  content: GameContent,
  item: ItemInstance,
): GameResult<{ item: ItemInstance }> {
  if (!baseOf(content, item)) return { erro: 'Item desconhecido.' };
  if (estado.mochila.length >= content.itens.capacidadeMochila) return { erro: 'Mochila cheia.' };
  const novo = structuredClone(estado);
  const guardado: ItemInstance = { ...structuredClone(item), uid: `it${novo.proximoItem++}` };
  novo.mochila.push(guardado);
  return { estado: novo, item: guardado };
}

/** Veste um item da mochila. O que estava no espaço volta para a mochila. */
export function equipItem(estado: GameState, content: GameContent, uid: string): GameResult {
  const i = estado.mochila.findIndex((x) => x.uid === uid);
  const item = estado.mochila[i];
  const base = item && baseOf(content, item);
  if (!item || !base) return { erro: 'Item não está na mochila.' };
  const novo = structuredClone(estado);
  const antigo = novo.cacador.equipamento[base.slot];
  novo.mochila.splice(i, 1);
  if (antigo) novo.mochila.splice(i, 0, antigo);
  novo.cacador.equipamento[base.slot] = structuredClone(item);
  return { estado: novo };
}

/** Tira um item vestido e guarda na mochila. */
export function unequipItem(estado: GameState, content: GameContent, slot: SlotId): GameResult {
  const item = estado.cacador.equipamento[slot];
  if (!item) return { erro: 'Nada vestido nesse espaço.' };
  if (estado.mochila.length >= content.itens.capacidadeMochila) return { erro: 'Mochila cheia.' };
  const novo = structuredClone(estado);
  delete novo.cacador.equipamento[slot];
  novo.mochila.push(structuredClone(item));
  return { estado: novo };
}

/** Joga fora um item da mochila. */
export function discardItem(estado: GameState, uid: string): GameResult {
  if (!estado.mochila.some((x) => x.uid === uid)) return { erro: 'Item não está na mochila.' };
  const novo = structuredClone(estado);
  novo.mochila = novo.mochila.filter((x) => x.uid !== uid);
  return { estado: novo };
}
