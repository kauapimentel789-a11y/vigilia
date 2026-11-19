/**
 * Comportamento automático: intenções e ações dos inimigos, regras especiais
 * e a ação do aliado.
 *
 * Regra fundamental: a intenção mostrada é exatamente a ação que será executada.
 * Ela é escolhida no fim do turno do inimigo e só muda depois de executada.
 */
import type { AllyActionDef, CombatContent, EnemyActionDef } from './definitions.ts';
import type { CombatState, Ctx, EnemyUnit } from './state.ts';
import { aliveEnemies, emit, nextUid } from './state.ts';
import { computeDamage } from './damage.ts';
import { runEffects } from '../effects/effects.ts';

export function enemyAction(
  content: CombatContent,
  inimigo: EnemyUnit,
  acaoId: string,
): EnemyActionDef {
  const acao = content.inimigos[inimigo.defId]?.acoes.find((a) => a.id === acaoId);
  if (!acao) throw new Error(`Ação desconhecida "${acaoId}" para ${inimigo.defId}`);
  return acao;
}

/** Escolhe a próxima ação do inimigo e a torna visível. */
export function chooseIntent(ctx: Ctx, inimigo: EnemyUnit): void {
  const def = ctx.content.inimigos[inimigo.defId];
  if (!def) throw new Error(`Inimigo desconhecido: ${inimigo.defId}`);
  let acaoId: string;
  if (def.padrao.tipo === 'sequencia') {
    const ordem = def.padrao.ordem;
    acaoId = ordem[inimigo.ia.indice % ordem.length] as string;
    inimigo.ia.indice++;
  } else {
    const { pesos, maxRepeticoes } = def.padrao;
    const recentes = inimigo.ia.historico.slice(-maxRepeticoes);
    const repetida =
      recentes.length === maxRepeticoes && recentes.every((a) => a === recentes[0])
        ? recentes[0]
        : undefined;
    const opcoes = pesos.filter((p) => p.acao !== repetida);
    const total = opcoes.reduce((soma, p) => soma + p.peso, 0);
    let sorteio = ctx.rng.next() * total;
    acaoId = (opcoes[opcoes.length - 1] as { acao: string }).acao;
    for (const p of opcoes) {
      sorteio -= p.peso;
      if (sorteio < 0) {
        acaoId = p.acao;
        break;
      }
    }
  }
  inimigo.intencao = acaoId;
  inimigo.ia.historico.push(acaoId);
  emit(ctx, { tipo: 'intencaoDefinida', inimigo: inimigo.uid, acao: acaoId });
}

/** O inimigo executa a intenção visível. */
export function enemyAct(ctx: Ctx, inimigo: EnemyUnit): void {
  if (!inimigo.intencao) return;
  const acao = enemyAction(ctx.content, inimigo, inimigo.intencao);
  emit(ctx, { tipo: 'inimigoAgiu', inimigo: inimigo.uid, acao: acao.id });
  runEffects(ctx, acao.efeitos, { unidade: inimigo, fonte: `${inimigo.defId}:${acao.id}` });
}

/** Dispara regras especiais (uma vez cada) quando o gatilho for atingido. */
export function checkSpecials(ctx: Ctx, inimigo: EnemyUnit): void {
  const def = ctx.content.inimigos[inimigo.defId];
  for (const especial of def?.especiais ?? []) {
    if (inimigo.especiaisUsados.includes(especial.id)) continue;
    const { fracao } = especial.gatilho;
    if (inimigo.vida > 0 && inimigo.vida < inimigo.vidaMax * fracao) {
      inimigo.especiaisUsados.push(especial.id);
      emit(ctx, { tipo: 'especialAtivado', inimigo: inimigo.uid, anuncio: especial.anuncio });
      runEffects(ctx, especial.efeitos, {
        unidade: inimigo,
        fonte: `${inimigo.defId}:${especial.id}`,
      });
    }
  }
}

/** Algum inimigo vivo pretende atacar neste turno? */
export function anyEnemyAttacking(state: CombatState, content: CombatContent): boolean {
  return aliveEnemies(state).some(
    (i) => i.intencao !== null && enemyAction(content, i, i.intencao).tipos.includes('ataque'),
  );
}

/** A ação que o aliado faria agora. */
export function allyIntent(state: CombatState, content: CombatContent): AllyActionDef | null {
  if (!state.aliado) return null;
  const def = content.aliados[state.aliado.defId];
  if (!def) return null;
  return anyEnemyAttacking(state, content) ? def.quandoInimigoAtaca : def.casoContrario;
}

export function allyAct(ctx: Ctx): void {
  const aliado = ctx.state.aliado;
  const acao = allyIntent(ctx.state, ctx.content);
  if (!aliado || !acao) return;
  emit(ctx, { tipo: 'aliadoAgiu', acao: acao.id });
  runEffects(ctx, acao.efeitos, { unidade: aliado, fonte: aliado.defId });
}

/** Coloca o aliado em campo. Se ele já estiver lá, recupera toda a vida. */
export function summonAlly(ctx: Ctx, aliadoId: string): void {
  const def = ctx.content.aliados[aliadoId];
  if (!def) throw new Error(`Aliado desconhecido: ${aliadoId}`);
  const atual = ctx.state.aliado;
  if (atual && atual.defId === aliadoId) {
    atual.vida = atual.vidaMax;
    emit(ctx, { tipo: 'aliadoInvocado', aliado: aliadoId, renovado: true });
    return;
  }
  ctx.state.aliado = {
    tipo: 'aliado',
    uid: nextUid(ctx.state, 'a'),
    defId: def.id,
    nome: def.nome,
    vida: def.vidaMax,
    vidaMax: def.vidaMax,
    bloqueio: 0,
    status: {},
  };
  emit(ctx, { tipo: 'aliadoInvocado', aliado: aliadoId, renovado: false });
}

/** Resumo calculado de uma intenção, com os valores reais já modificados. */
export interface IntentPreview {
  acao: EnemyActionDef;
  /** Dano total no jogador, se a ação ataca o jogador. */
  danoJogador: number | null;
  /** Dano total no aliado, se a ação ataca o aliado e ele está em campo. */
  danoAliado: number | null;
  golpes: number;
}

export function previewIntent(
  state: CombatState,
  content: CombatContent,
  inimigo: EnemyUnit,
): IntentPreview | null {
  if (!inimigo.intencao || inimigo.vida <= 0) return null;
  const acao = enemyAction(content, inimigo, inimigo.intencao);
  let danoJogador: number | null = null;
  let danoAliado: number | null = null;
  let golpes = 1;
  for (const e of acao.efeitos) {
    if (e.tipo !== 'dano') continue;
    golpes = e.golpes ?? 1;
    if (e.alvo === 'jogador' || e.alvo === 'jogadorEAliado') {
      danoJogador =
        (danoJogador ?? 0) + computeDamage(e.valor, inimigo.status, state.jogador.status) * golpes;
    }
    if ((e.alvo === 'aliado' || e.alvo === 'jogadorEAliado') && state.aliado) {
      danoAliado =
        (danoAliado ?? 0) + computeDamage(e.valor, inimigo.status, state.aliado.status) * golpes;
    }
  }
  return { acao, danoJogador, danoAliado, golpes };
}
