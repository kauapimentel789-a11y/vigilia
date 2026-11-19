/**
 * A Arena dentro do estado do jogo: escolher o Herói da Arena, jogar a partida
 * contra os adversários do jogo, ganhar Glória e trocá-la por ajuda na Caçada.
 */
import type { GameContent } from '../definitions.ts';
import type { ArenaMatch, ArenaRetrato, RoundReport } from '../arena/match.ts';
import { createMatch, endRound, placement } from '../arena/match.ts';
import type { ArenaComando, ArenaInicio } from '../arena/replay.ts';
import { applyCommand } from '../arena/replay.ts';
import type { GameResult, GameState } from './game.ts';

export interface ArenaState {
  gloria: number;
  heroi: string;
  partida: ArenaMatch | null;
  partidas: number;
  melhorLugar: number | null;
  /** Como a partida atual começou e tudo o que foi feito nela (para o servidor conferir). */
  registro?: ArenaRegistro | null;
}

export interface ArenaRegistro {
  inicio: ArenaInicio;
  comandos: ArenaComando[];
}

export function newArenaState(): ArenaState {
  return {
    gloria: 0,
    heroi: 'vigia',
    partida: null,
    partidas: 0,
    melhorLugar: null,
    registro: null,
  };
}

export function isHeroUnlocked(estado: GameState, content: GameContent, id: string): boolean {
  const h = content.arena.herois[id];
  if (!h) return false;
  return !h.selo || (estado.selos[h.selo] ?? 0) > 0;
}

export function chooseArenaHero(estado: GameState, content: GameContent, id: string): GameResult {
  if (!isHeroUnlocked(estado, content, id))
    return { erro: 'Este herói pede um Selo que você ainda não tem.' };
  const novo = structuredClone(estado);
  novo.arena.heroi = id;
  return { estado: novo };
}

export function startArenaMatch(
  estado: GameState,
  content: GameContent,
  rivais: ArenaRetrato[] = [],
  nome = 'Você',
): GameResult {
  if (estado.arena.partida && !estado.arena.partida.fim)
    return { erro: 'Já existe uma partida em andamento.' };
  if (!isHeroUnlocked(estado, content, estado.arena.heroi))
    return { erro: 'Escolha um herói liberado.' };
  const novo = structuredClone(estado);
  const inicio: ArenaInicio = {
    semente: estado.proximaSemente,
    heroi: estado.arena.heroi,
    nome,
    rivais,
  };
  novo.arena.partida = createMatch(content, inicio.semente, inicio.heroi, nome, rivais);
  novo.arena.registro = { inicio, comandos: [] };
  novo.proximaSemente = (Math.imul(estado.proximaSemente, 1664525) + 1013904223) >>> 0;
  return { estado: novo };
}

/** Aplica um comando da partida (comprar, vender, mover...) ao estado e o anota. */
export function arenaAction(
  estado: GameState,
  content: GameContent,
  comando: Exclude<ArenaComando, { t: 'lutar' }>,
): GameResult {
  const m = estado.arena.partida;
  if (!m) return { erro: 'Nenhuma partida em andamento.' };
  const r = applyCommand(m, content, comando);
  if (r.erro !== undefined) return { erro: r.erro };
  const novo = structuredClone(estado);
  novo.arena.partida = r.partida;
  novo.arena.registro?.comandos.push(comando);
  return { estado: novo };
}

export interface ArenaRoundOutcome {
  relatorio: RoundReport;
  /** Fim da partida: colocação, Glória ganha e o registro para o ranking. */
  fim: { lugar: number; gloria: number; registro: ArenaRegistro | null } | null;
}

export function playArenaRound(
  estado: GameState,
  content: GameContent,
): GameResult<{ resultado: ArenaRoundOutcome }> {
  const m = estado.arena.partida;
  if (!m) return { erro: 'Nenhuma partida em andamento.' };
  const r = endRound(m, content);
  if (r.erro !== undefined) return { erro: r.erro };
  const novo = structuredClone(estado);
  novo.arena.partida = r.partida;
  novo.arena.registro?.comandos.push({ t: 'lutar' });
  let fim: ArenaRoundOutcome['fim'] = null;
  if (r.partida.fim) {
    const lugar = placement(r.partida);
    const gloria = content.arena.regras.gloria[lugar - 1] ?? 0;
    novo.arena.gloria += gloria;
    novo.arena.partidas++;
    novo.arena.melhorLugar = Math.min(novo.arena.melhorLugar ?? lugar, lugar);
    fim = { lugar, gloria, registro: novo.arena.registro ?? null };
  }
  return { estado: novo, resultado: { relatorio: r.relatorio, fim } };
}

/** Desiste ou fecha uma partida já terminada. Desistir não dá Glória. */
export function leaveArenaMatch(estado: GameState): GameResult {
  const novo = structuredClone(estado);
  novo.arena.partida = null;
  novo.arena.registro = null;
  return { estado: novo };
}

export function spendGloria(
  estado: GameState,
  content: GameContent,
  oferta: 'pocao' | 'ouro',
): GameResult {
  const o = content.arena.ofertas;
  const custo = oferta === 'pocao' ? o.pocao.custo : o.ouro.custo;
  if (estado.arena.gloria < custo) return { erro: 'Glória insuficiente.' };
  const novo = structuredClone(estado);
  if (oferta === 'pocao') {
    if (novo.pocoes >= content.itens.pocao.maximo)
      return { erro: 'Você já tem o máximo de poções.' };
    novo.pocoes++;
  } else {
    novo.ouro += o.ouro.porLevel * novo.cacador.level;
  }
  novo.arena.gloria -= custo;
  return { estado: novo };
}
