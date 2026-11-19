/**
 * O pedaço do motor que o servidor usa para conferir partidas da Arena.
 * `npm run edge` empacota este arquivo em supabase/functions/arena-registrar/motor.js.
 */
import { CONTEUDO } from '../../src/content/index.ts';
import type { ArenaComando, ArenaRetrato } from '../../src/engine/arena/index.ts';
import { replayMatch, sanitizeRetrato } from '../../src/engine/arena/index.ts';

export interface Conferencia {
  erro?: string;
  lugar?: number;
  gloria?: number;
  retrato?: ArenaRetrato | null;
}

export function conferir(
  semente: unknown,
  heroi: unknown,
  rivais: unknown[],
  comandos: unknown,
): Conferencia {
  if (typeof semente !== 'number' || !Number.isInteger(semente))
    return { erro: 'Semente inválida.' };
  if (typeof heroi !== 'string') return { erro: 'Herói inválido.' };
  if (!Array.isArray(comandos) || comandos.length > 5000) return { erro: 'Comandos inválidos.' };
  const limpos: ArenaRetrato[] = [];
  for (const r of rivais) {
    const x = sanitizeRetrato(CONTEUDO, r);
    if (!x) return { erro: 'Rival inválido.' };
    limpos.push(x);
  }
  const r = replayMatch(
    CONTEUDO,
    { semente, heroi, nome: 'Você', rivais: limpos },
    comandos as ArenaComando[],
  );
  if (r.erro !== undefined) return { erro: r.erro };
  return {
    lugar: r.lugar,
    gloria: CONTEUDO.arena.regras.gloria[r.lugar - 1] ?? 0,
    retrato: r.retrato,
  };
}

export const HEROIS = Object.keys(CONTEUDO.arena.herois);
