/**
 * Registro de comandos da partida e reprodução.
 *
 * Como o motor é determinístico, a semente, os rivais e a lista de comandos
 * bastam para refazer a partida inteira. O servidor usa isso para conferir a
 * colocação e o time que um jogador diz ter montado.
 */
import type { GameContent } from '../definitions.ts';
import type { ArenaMatch, ArenaRetrato, Lugar, MatchResult } from './match.ts';
import {
  buyUnit,
  buyXp,
  createMatch,
  endRound,
  moveUnit,
  myRetrato,
  placement,
  rerollShop,
  sellUnit,
} from './match.ts';

export type ArenaComando =
  | { t: 'comprar'; slot: number }
  | { t: 'vender'; uid: string }
  | { t: 'rolar' }
  | { t: 'xp' }
  | { t: 'mover'; uid: string; destino: Lugar }
  | { t: 'lutar' };

export function applyCommand(m: ArenaMatch, content: GameContent, c: ArenaComando): MatchResult {
  switch (c.t) {
    case 'comprar':
      return buyUnit(m, content, c.slot);
    case 'vender':
      return sellUnit(m, content, c.uid);
    case 'rolar':
      return rerollShop(m, content);
    case 'xp':
      return buyXp(m, content);
    case 'mover':
      return moveUnit(m, content, c.uid, c.destino);
    case 'lutar':
      return endRound(m, content);
  }
}

export interface ArenaInicio {
  semente: number;
  heroi: string;
  nome: string;
  rivais: ArenaRetrato[];
}

export type ReplayResult =
  | { erro: string; lugar?: undefined }
  | { erro?: undefined; partida: ArenaMatch; lugar: number; retrato: ArenaRetrato | null };

/** Refaz a partida do começo. Qualquer comando recusado invalida tudo. */
export function replayMatch(
  content: GameContent,
  inicio: ArenaInicio,
  comandos: ArenaComando[],
): ReplayResult {
  if (!content.arena.herois[inicio.heroi]) return { erro: 'Herói desconhecido.' };
  let m = createMatch(content, inicio.semente, inicio.heroi, inicio.nome, inicio.rivais);
  for (const [i, c] of comandos.entries()) {
    if (m.fim) return { erro: `Comando ${i + 1} depois do fim da partida.` };
    const r = applyCommand(m, content, c);
    if (r.erro !== undefined) return { erro: `Comando ${i + 1} recusado: ${r.erro}` };
    m = r.partida;
  }
  if (!m.fim) return { erro: 'A partida não terminou.' };
  return { partida: m, lugar: placement(m), retrato: myRetrato(m) };
}
