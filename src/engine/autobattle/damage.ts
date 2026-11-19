/**
 * Dano, bloqueio, cura e status no combate automático. Implementa o `EffectHost`.
 *
 * Fórmula de um golpe:
 *   base = ataque × mult
 *   + Força de quem bate, × Fraco de quem bate
 *   + Marca do alvo, × Vulnerável do alvo
 *   × dano crítico (se sortear crítico)
 *   × (1 − redução do alvo), arredondado
 * O bloqueio absorve primeiro; o resto sai da vida.
 */
import type { EffectHost, EffectSource, TargetSpec } from '../effects/effects.ts';
import { STATUS_DEFS, activeStatuses, addStatus } from '../statuses/statuses.ts';
import type { StatusId } from '../statuses/statuses.ts';
import type { BattleCtx, BattleUnit } from './state.ts';
import { alliesOf, emit, opponentsOf } from './state.ts';

export function computeHit(
  origem: BattleUnit,
  alvo: BattleUnit,
  mult: number,
  critico: boolean,
): number {
  let valor = origem.ataque * mult;
  for (const [id, q] of activeStatuses(origem.status)) {
    const def = STATUS_DEFS[id];
    if (def.somaDanoCausado) valor += def.somaDanoCausado(q);
  }
  for (const [id] of activeStatuses(origem.status)) {
    const m = STATUS_DEFS[id].multDanoCausado;
    if (m !== undefined) valor *= m;
  }
  for (const [id, q] of activeStatuses(alvo.status)) {
    const def = STATUS_DEFS[id];
    if (def.somaDanoRecebido) valor += def.somaDanoRecebido(q);
  }
  for (const [id] of activeStatuses(alvo.status)) {
    const m = STATUS_DEFS[id].multDanoRecebido;
    if (m !== undefined) valor *= m;
  }
  if (critico) valor *= origem.danoCritico;
  valor *= 1 - alvo.reducao;
  return Math.max(0, Math.round(valor));
}

/** Tira vida diretamente (sem bloqueio) e trata a morte. */
export function loseLife(ctx: BattleCtx, alvo: BattleUnit, valor: number, motivo: StatusId): void {
  if (valor <= 0 || alvo.vida <= 0) return;
  const perda = Math.min(alvo.vida, valor);
  alvo.vida -= perda;
  emit(ctx, { tipo: 'perdaDeVida', alvo: alvo.uid, valor: perda, motivo });
  if (alvo.lado === 'inimigo') {
    ctx.state.stats.danoCausado += perda;
    const fonte = `status:${motivo}`;
    ctx.state.stats.danoPorFonte[fonte] = (ctx.state.stats.danoPorFonte[fonte] ?? 0) + perda;
  } else {
    ctx.state.stats.danoRecebido += perda;
  }
  if (alvo.vida === 0) emit(ctx, { tipo: 'derrotado', alvo: alvo.uid });
}

export function createHost(ctx: BattleCtx): EffectHost<BattleUnit> {
  const s = ctx.state;
  return {
    isOver: () => s.resultado !== null,
    resolveTargets(alvo: TargetSpec, origem: EffectSource<BattleUnit>): BattleUnit[] {
      const u = origem.unidade;
      switch (alvo) {
        case 'alvo': {
          if (origem.alvo && origem.alvo.vida > 0) return [origem.alvo];
          return opponentsOf(s, u).slice(0, 1);
        }
        case 'proprio':
          return u.vida > 0 ? [u] : [];
        case 'inimigos':
          return opponentsOf(s, u);
        case 'aliados':
          return alliesOf(s, u);
        case 'aliadoMaisFerido': {
          const lista = alliesOf(s, u);
          let melhor: BattleUnit | undefined;
          for (const a of lista) {
            if (!melhor || a.vida / a.vidaMax < melhor.vida / melhor.vidaMax) melhor = a;
          }
          return melhor ? [melhor] : [];
        }
      }
    },
    dealDamage(origem, alvo, mult) {
      const atacante = origem.unidade;
      const critico = atacante.critico > 0 && ctx.rng.next() < atacante.critico;
      const valor = computeHit(atacante, alvo, mult, critico);
      const bloqueado = Math.min(alvo.bloqueio, valor);
      alvo.bloqueio -= bloqueado;
      const perda = Math.min(alvo.vida, valor - bloqueado);
      alvo.vida -= perda;
      emit(ctx, {
        tipo: 'dano',
        origem: atacante.uid,
        alvo: alvo.uid,
        valor: perda,
        bloqueado,
        critico,
      });
      if (atacante.lado === 'cacador') {
        s.stats.danoCausado += perda;
        s.stats.danoPorFonte[origem.fonte] = (s.stats.danoPorFonte[origem.fonte] ?? 0) + perda;
      } else {
        s.stats.danoRecebido += perda;
      }
      if (alvo.vida === 0) emit(ctx, { tipo: 'derrotado', alvo: alvo.uid });
    },
    gainBlock(alvo, valor) {
      if (valor <= 0) return;
      alvo.bloqueio += valor;
      emit(ctx, { tipo: 'bloqueio', alvo: alvo.uid, valor });
    },
    heal(alvo, valor) {
      const ganho = Math.min(valor, alvo.vidaMax - alvo.vida);
      if (ganho <= 0) return;
      alvo.vida += ganho;
      if (alvo.lado === 'cacador') s.stats.curaTotal += ganho;
      emit(ctx, { tipo: 'cura', alvo: alvo.uid, valor: ganho });
    },
    applyStatus(alvo, status, valor) {
      addStatus(alvo.status, status, valor);
      emit(ctx, { tipo: 'status', alvo: alvo.uid, status, valor });
    },
    clearStatus(alvo, status) {
      if (!alvo.status[status]) return;
      delete alvo.status[status];
      emit(ctx, { tipo: 'limpar', alvo: alvo.uid, status });
    },
  };
}
