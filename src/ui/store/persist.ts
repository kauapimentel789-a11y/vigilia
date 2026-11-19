/**
 * Onde o save mora: localStorage do navegador.
 *
 * O motor transforma o estado em texto e valida na volta; aqui só lemos e
 * gravamos. Um save estragado é guardado à parte (para diagnóstico) e o jogo
 * recomeça, avisando o jogador.
 */
import { CONTEUDO } from '../../content/index.ts';
import type { GameState } from '../../engine/game/game.ts';
import { deserialize, serialize } from '../../engine/save/save.ts';

const CHAVE = 'vigilia:save';
const CHAVE_CORROMPIDO = 'vigilia:save-corrompido';

export type LoadOutcome =
  | { tipo: 'novo' }
  | { tipo: 'carregado'; estado: GameState; salvoEm: number }
  | { tipo: 'corrompido'; erro: string };

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSave(): LoadOutcome {
  const s = storage();
  const texto = s?.getItem(CHAVE);
  if (!texto) return { tipo: 'novo' };
  const r = deserialize(texto, CONTEUDO);
  if (r.erro !== undefined) {
    try {
      s?.setItem(CHAVE_CORROMPIDO, texto);
    } catch {
      /* sem espaço: segue sem a cópia */
    }
    return { tipo: 'corrompido', erro: r.erro };
  }
  return { tipo: 'carregado', estado: r.estado, salvoEm: r.salvoEm };
}

export function writeSave(estado: GameState): void {
  try {
    storage()?.setItem(CHAVE, serialize(estado, Date.now()));
  } catch {
    /* modo privado ou sem espaço: o jogo continua sem salvar */
  }
}

export function clearSave(): void {
  try {
    storage()?.removeItem(CHAVE);
  } catch {
    /* nada a fazer */
  }
}
