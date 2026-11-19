/**
 * Arena online: rivais gravados de outros jogadores e o ranking.
 *
 * Sem nuvem (ou sem conta), a Arena segue com os rivais do jogo. O resultado
 * de uma partida só entra no ranking depois que o servidor refaz a partida
 * inteira a partir da semente e dos comandos e confere a colocação.
 */
import { CONTEUDO } from '../../content/index.ts';
import type { ArenaRetrato } from '../../engine/arena/match.ts';
import { sanitizeRetrato } from '../../engine/arena/match.ts';
import type { ArenaRegistro } from '../../engine/game/arena.ts';
import { supabase, useCloud } from './cloud.ts';

export interface LinhaRanking {
  nome: string;
  gloria: number;
  partidas: number;
  vitorias: number;
  melhor_lugar: number | null;
}

export interface ResultadoOnline {
  ok: boolean;
  mensagem: string;
}

function comPrazo<T>(p: PromiseLike<T>, ms: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(p),
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

/** Até `qtd` times gravados por outros jogadores. Lista vazia se não der. */
export async function buscarRivais(qtd: number): Promise<ArenaRetrato[]> {
  if (!supabase || !useCloud.getState().usuario) return [];
  try {
    const r = await comPrazo(supabase.rpc('arena_rivais', { qtd }), 4000);
    if (!r || r.error || !Array.isArray(r.data)) return [];
    return (r.data as unknown[])
      .map((x) => sanitizeRetrato(CONTEUDO, x))
      .filter((x): x is ArenaRetrato => x !== null);
  } catch {
    return [];
  }
}

/** Manda a partida para o servidor conferir e entrar no ranking. */
export async function registrarPartida(registro: ArenaRegistro): Promise<ResultadoOnline | null> {
  if (!supabase || !useCloud.getState().usuario) return null;
  try {
    const { data, error } = await supabase.functions.invoke('arena-registrar', {
      body: {
        semente: registro.inicio.semente,
        heroi: registro.inicio.heroi,
        rivais: registro.inicio.rivais.map((r) => r.id ?? null),
        comandos: registro.comandos,
      },
    });
    if (error) return { ok: false, mensagem: 'O servidor não aceitou a partida.' };
    const d = data as { lugar?: number; erro?: string };
    if (d.erro) return { ok: false, mensagem: d.erro };
    return { ok: true, mensagem: `Partida conferida: ${d.lugar}º lugar entrou no ranking.` };
  } catch {
    return { ok: false, mensagem: 'Sem conexão com o servidor.' };
  }
}

export async function buscarRanking(): Promise<LinhaRanking[] | null> {
  if (!supabase) return null;
  const r = await comPrazo(
    supabase
      .from('arena_ranking')
      .select('nome, gloria, partidas, vitorias, melhor_lugar')
      .order('gloria', { ascending: false })
      .limit(20),
    5000,
  );
  if (!r || r.error) return null;
  return r.data as LinhaRanking[];
}
