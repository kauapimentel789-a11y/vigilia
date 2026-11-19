/**
 * Comandos públicos do combate.
 *
 * Cada comando recebe o estado atual e devolve um estado NOVO e a lista de
 * eventos do que aconteceu. O estado recebido nunca é alterado. Comandos
 * inválidos devolvem o mesmo estado e um motivo legível em `erro`.
 */
import { runEffects } from '../effects/effects.ts';
import type { CombatContent, EncounterDef } from './definitions.ts';
import type { CombatEvent, CombatState } from './state.ts';
import { closeCtx, createInitialState, emit, findUnit, openCtx } from './state.ts';
import { chooseIntent } from './ai.ts';
import { endPlayerTurn, startPlayerTurn } from './turn.ts';

export interface CommandResult {
  estado: CombatState;
  eventos: CombatEvent[];
  erro?: string;
}

export interface PlayCardInput {
  /** uid da carta na mão. */
  carta: string;
  /** uid do inimigo escolhido, para cartas com alvo. */
  alvo?: string | undefined;
  /** Pagar o custo de Avivar. */
  avivar?: boolean | undefined;
}

function rejected(estado: CombatState, erro: string): CommandResult {
  return { estado, eventos: [], erro };
}

export function startCombat(
  content: CombatContent,
  encontro: EncounterDef,
  deck: readonly string[],
  semente: number,
): CommandResult {
  const { state, rng } = createInitialState(content, encontro, deck, semente);
  const ctx = { state, content, rng, eventos: [] as CombatEvent[] };
  for (const inimigo of state.inimigos) chooseIntent(ctx, inimigo);
  startPlayerTurn(ctx);
  return { estado: closeCtx(ctx), eventos: ctx.eventos };
}

/** Motivo pelo qual a carta não pode ser jogada agora, ou null se pode. */
export function cannotPlay(
  estado: CombatState,
  content: CombatContent,
  input: PlayCardInput,
): string | null {
  if (estado.resultado) return 'O combate já terminou.';
  const instancia = estado.mao.find((c) => c.uid === input.carta);
  if (!instancia) return 'Essa carta não está na sua mão.';
  const def = content.cartas[instancia.defId];
  if (!def) return 'Carta desconhecida.';
  if (estado.energia < def.custo) return `Precisa de ${def.custo} de energia.`;
  if (def.alvo === 'inimigo') {
    const alvo = input.alvo ? findUnit(estado, input.alvo) : undefined;
    if (!alvo || alvo.tipo !== 'inimigo' || alvo.vida <= 0) return 'Escolha um inimigo como alvo.';
  }
  if (input.avivar) {
    if (!def.avivar) return 'Esta carta não pode ser avivada.';
    if (estado.brasa < def.avivar.custo) return `Precisa de ${def.avivar.custo} Brasa.`;
  }
  return null;
}

export function playCard(
  estado: CombatState,
  content: CombatContent,
  input: PlayCardInput,
): CommandResult {
  const motivo = cannotPlay(estado, content, input);
  if (motivo) return rejected(estado, motivo);

  const ctx = openCtx(estado, content);
  const s = ctx.state;
  const indice = s.mao.findIndex((c) => c.uid === input.carta);
  const [instancia] = s.mao.splice(indice, 1);
  if (!instancia) return rejected(estado, 'Essa carta não está na sua mão.');
  const def = content.cartas[instancia.defId];
  if (!def) return rejected(estado, 'Carta desconhecida.');

  s.energia -= def.custo;
  const avivar = input.avivar && def.avivar ? def.avivar : null;
  if (avivar) {
    s.brasa -= avivar.custo;
    s.stats.brasaGasta += avivar.custo;
    emit(ctx, { tipo: 'brasa', delta: -avivar.custo, total: s.brasa });
  }
  s.stats.cartasJogadas++;
  emit(ctx, {
    tipo: 'cartaJogada',
    carta: def.id,
    avivada: avivar !== null,
    ...(input.alvo ? { alvo: input.alvo } : {}),
  });

  const efeitos = !avivar
    ? def.efeitos
    : avivar.modo === 'substitui'
      ? avivar.efeitos
      : [...def.efeitos, ...avivar.efeitos];
  const escolhido = input.alvo ? findUnit(s, input.alvo) : undefined;
  runEffects(ctx, efeitos, {
    unidade: s.jogador,
    fonte: def.id,
    ...(escolhido ? { escolhido } : {}),
  });

  // A carta só vai para o descarte depois de resolvida.
  if (def.consumir) s.consumidas.push(instancia);
  else s.descarte.push(instancia);

  return { estado: closeCtx(ctx), eventos: ctx.eventos };
}

export function endTurn(estado: CombatState, content: CombatContent): CommandResult {
  if (estado.resultado) return rejected(estado, 'O combate já terminou.');
  const ctx = openCtx(estado, content);
  endPlayerTurn(ctx);
  return { estado: closeCtx(ctx), eventos: ctx.eventos };
}
