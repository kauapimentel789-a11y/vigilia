/**
 * Inteligência dos inimigos: escolhe a próxima ação (a "intenção") e a executa.
 *
 * A intenção é escolhida logo depois de o inimigo agir e fica visível até a
 * próxima ação dele. A ação executada é sempre a intenção anunciada.
 */
import type { EnemyActionDef, EnemyDef } from '../definitions.ts';
import { runEffects } from '../effects/effects.ts';
import type { EffectHost } from '../effects/effects.ts';
import type { BattleCtx, BattleUnit } from './state.ts';
import { alive, emit } from './state.ts';

function enemyDef(ctx: BattleCtx, u: BattleUnit): EnemyDef {
  const def = ctx.content.inimigos[u.defId];
  if (!def) throw new Error(`Inimigo desconhecido: ${u.defId}`);
  return def;
}

/** Ações em uso: todas, ou as da fase atual do chefe. */
export function phaseActions(def: EnemyDef, acoesFase?: string[] | null): EnemyActionDef[] {
  if (!acoesFase) return def.acoes;
  const lista = def.acoes.filter((a) => acoesFase.includes(a.id));
  return lista.length > 0 ? lista : def.acoes;
}

function available(ctx: BattleCtx, u: BattleUnit, def: EnemyDef): EnemyActionDef[] {
  const temAliados = alive(ctx.state.inimigos).some((i) => i.uid !== u.uid);
  const base = phaseActions(def, u.acoesFase);
  const lista = base.filter((a) => !a.requerAliados || temAliados);
  return lista.length > 0 ? lista : base;
}

/** Escolhe e anuncia a próxima ação do inimigo. */
export function chooseIntent(ctx: BattleCtx, u: BattleUnit): void {
  const def = enemyDef(ctx, u);
  const opcoes = available(ctx, u, def);
  const ciclo = phaseActions(def, u.acoesFase);
  let acao: EnemyActionDef;
  if (def.padrao === 'ciclo') {
    // Avança no ciclo pulando ações indisponíveis agora.
    let escolhida: EnemyActionDef | undefined;
    for (let i = 0; i < ciclo.length && !escolhida; i++) {
      const candidata = ciclo[(u.cicloIndice + i) % ciclo.length] as EnemyActionDef;
      if (opcoes.includes(candidata)) {
        escolhida = candidata;
        u.cicloIndice = (u.cicloIndice + i + 1) % ciclo.length;
      }
    }
    acao = escolhida ?? (opcoes[0] as EnemyActionDef);
  } else {
    const total = opcoes.reduce((s, a) => s + (a.peso ?? 1), 0);
    let r = ctx.rng.next() * total;
    acao = opcoes[opcoes.length - 1] as EnemyActionDef;
    for (const a of opcoes) {
      r -= a.peso ?? 1;
      if (r < 0) {
        acao = a;
        break;
      }
    }
  }
  u.intencao = acao.id;
  emit(ctx, {
    tipo: 'intencao',
    inimigo: u.uid,
    acao: acao.id,
    nome: acao.nome,
    forte: !!acao.forte,
  });
}

export function intentAction(ctx: BattleCtx, u: BattleUnit): EnemyActionDef | undefined {
  return enemyDef(ctx, u).acoes.find((a) => a.id === u.intencao);
}

/** Dispara o especial (ex.: fúria) se a vida caiu abaixo do limite. */
export function checkSpecial(ctx: BattleCtx, host: EffectHost<BattleUnit>, u: BattleUnit): void {
  // Fases de chefe (as invocações só existem no mapa).
  const fases = enemyDef(ctx, u).fases ?? [];
  while (u.vida > 0 && (u.fase ?? 0) < fases.length) {
    const f = fases[u.fase ?? 0];
    if (!f || u.vida / u.vidaMax >= f.abaixoDe) break;
    u.fase = (u.fase ?? 0) + 1;
    emit(ctx, { tipo: 'especial', inimigo: u.uid, anuncio: f.anuncio });
    if (f.efeitos) runEffects(host, f.efeitos, { unidade: u, fonte: 'especial' });
    if (f.acoes) {
      u.acoesFase = f.acoes;
      u.cicloIndice = 0;
    }
  }
  const esp = enemyDef(ctx, u).especial;
  if (!esp || u.especialUsado || u.vida <= 0 || u.vida / u.vidaMax >= esp.abaixoDe) return;
  u.especialUsado = true;
  emit(ctx, { tipo: 'especial', inimigo: u.uid, anuncio: esp.anuncio });
  runEffects(host, esp.efeitos, { unidade: u, fonte: 'especial' });
}

/** Executa a intenção atual e escolhe a próxima. */
export function enemyAct(ctx: BattleCtx, host: EffectHost<BattleUnit>, u: BattleUnit): void {
  const acao = intentAction(ctx, u);
  if (acao) {
    emit(ctx, {
      tipo: 'acao',
      ator: u.uid,
      acao: acao.id,
      nome: acao.nome,
      alvo: ctx.state.cacador.uid,
    });
    runEffects(host, acao.efeitos, { unidade: u, fonte: acao.id, alvo: ctx.state.cacador });
  }
  if (u.vida > 0 && ctx.state.resultado === null) chooseIntent(ctx, u);
}
