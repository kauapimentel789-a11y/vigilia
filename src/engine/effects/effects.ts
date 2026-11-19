/**
 * Sistema de efeitos, independente do modo de jogo.
 *
 * Toda habilidade e toda ação de inimigo é apenas uma lista de efeitos. Cada tipo
 * de efeito tem um "handler" no registro abaixo, e os handlers só falam com um
 * `EffectHost`: o modo de jogo (a Caçada agora, a Arena depois) implementa esse
 * host com as próprias regras de alvo, dano e registro.
 *
 * Para criar um efeito novo: adicione o tipo à união `Effect` e um handler em `HANDLERS`.
 */
import type { StatusId, StatusMap } from '../statuses/statuses.ts';

/** Para quem o efeito vai, sempre relativo a quem o usa. */
export type TargetSpec = 'alvo' | 'proprio' | 'inimigos' | 'aliados' | 'aliadoMaisFerido';

export type Effect =
  /** Dano igual a `mult` × ataque de quem usa, `golpes` vezes. */
  | { tipo: 'dano'; mult: number; golpes?: number; alvo: TargetSpec }
  /** Bloqueio fixo (`valor`) ou proporcional à vida máxima de quem usa (`pctVidaMax`). */
  | { tipo: 'bloqueio'; valor?: number; pctVidaMax?: number; alvo: TargetSpec }
  /** Cura proporcional à vida máxima do alvo. */
  | { tipo: 'cura'; pctVidaMax: number; alvo: TargetSpec }
  | { tipo: 'status'; status: StatusId; valor: number; alvo: TargetSpec }
  /** Remove um status por completo. */
  | { tipo: 'limpar'; status: StatusId; alvo: TargetSpec };

/** O mínimo que uma unidade precisa ter para receber efeitos. */
export interface EffectUnit {
  uid: string;
  vida: number;
  vidaMax: number;
  bloqueio: number;
  status: StatusMap;
}

/** Quem está usando o efeito, qual o alvo principal e o rótulo para o registro. */
export interface EffectSource<U extends EffectUnit> {
  unidade: U;
  fonte: string;
  alvo?: U | undefined;
}

/** O que o modo de jogo precisa oferecer para os efeitos funcionarem. */
export interface EffectHost<U extends EffectUnit> {
  isOver(): boolean;
  resolveTargets(alvo: TargetSpec, origem: EffectSource<U>): U[];
  dealDamage(origem: EffectSource<U>, alvo: U, mult: number): void;
  gainBlock(alvo: U, valor: number): void;
  heal(alvo: U, valor: number): void;
  applyStatus(alvo: U, status: StatusId, valor: number): void;
  clearStatus(alvo: U, status: StatusId): void;
}

type Handler<T extends Effect['tipo']> = <U extends EffectUnit>(
  host: EffectHost<U>,
  efeito: Extract<Effect, { tipo: T }>,
  origem: EffectSource<U>,
  escala: number,
) => void;

const HANDLERS: { [T in Effect['tipo']]: Handler<T> } = {
  dano(host, e, origem, escala) {
    const golpes = e.golpes ?? 1;
    for (let i = 0; i < golpes; i++) {
      for (const alvo of host.resolveTargets(e.alvo, origem)) {
        if (host.isOver()) return;
        if (alvo.vida > 0) host.dealDamage(origem, alvo, e.mult * escala);
      }
    }
  },
  bloqueio(host, e, origem, escala) {
    const base = (e.valor ?? 0) + (e.pctVidaMax ?? 0) * origem.unidade.vidaMax;
    const valor = Math.round(base * escala);
    for (const alvo of host.resolveTargets(e.alvo, origem)) {
      if (alvo.vida > 0) host.gainBlock(alvo, valor);
    }
  },
  cura(host, e, origem, escala) {
    for (const alvo of host.resolveTargets(e.alvo, origem)) {
      if (alvo.vida > 0) host.heal(alvo, Math.round(alvo.vidaMax * e.pctVidaMax * escala));
    }
  },
  status(host, e, origem, escala) {
    const valor = Math.max(1, Math.round(e.valor * escala));
    for (const alvo of host.resolveTargets(e.alvo, origem)) {
      if (alvo.vida > 0) host.applyStatus(alvo, e.status, valor);
    }
  },
  limpar(host, e, origem) {
    for (const alvo of host.resolveTargets(e.alvo, origem)) host.clearStatus(alvo, e.status);
  },
};

/**
 * Executa uma lista de efeitos em ordem, parando se o combate terminar.
 * `escala` multiplica a força dos efeitos (poder e nível da habilidade).
 */
export function runEffects<U extends EffectUnit>(
  host: EffectHost<U>,
  efeitos: readonly Effect[],
  origem: EffectSource<U>,
  escala = 1,
): void {
  for (const efeito of efeitos) {
    if (host.isOver()) return;
    (HANDLERS[efeito.tipo] as Handler<typeof efeito.tipo>)(host, efeito as never, origem, escala);
  }
}
