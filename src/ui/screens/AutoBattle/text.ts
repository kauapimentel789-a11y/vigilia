/** Textos do registro de combate. */
import { CONTEUDO } from '../../../content/index.ts';
import type { BattleEvent } from '../../../engine/autobattle/state.ts';
import { STATUS_DEFS } from '../../../engine/statuses/statuses.ts';

export function describe(e: BattleEvent, nomes: Record<string, string>): string | null {
  const n = (uid: string) => nomes[uid] ?? uid;
  switch (e.tipo) {
    case 'onda':
      return `Onda ${e.onda} de ${e.total}: ${e.inimigos.map((i) => i.nome).join(', ')}.`;
    case 'acao':
      return `${n(e.ator)} usa ${e.nome}${e.alvo && e.alvo !== e.ator ? ` em ${n(e.alvo)}` : ''}.`;
    case 'dano':
      return `${n(e.alvo)} sofre ${e.valor}${e.critico ? ' (crítico!)' : ''}${e.bloqueado ? `, ${e.bloqueado} bloqueado` : ''}.`;
    case 'perdaDeVida':
      return `${n(e.alvo)} perde ${e.valor} por ${STATUS_DEFS[e.motivo].nome}.`;
    case 'bloqueio':
      return `${n(e.alvo)} ganha ${e.valor} de bloqueio.`;
    case 'cura':
      return `${n(e.alvo)} recupera ${e.valor} de vida.`;
    case 'status':
      return `${n(e.alvo)}: ${STATUS_DEFS[e.status].nome} +${e.valor}.`;
    case 'limpar':
      return `${n(e.alvo)} se livra de ${STATUS_DEFS[e.status].nome}.`;
    case 'especial':
      return e.anuncio;
    case 'derrotado':
      return `${n(e.alvo)} caiu.`;
    case 'fim':
      return e.resultado === 'vitoria' ? 'Portal fechado!' : 'O caçador recua.';
    case 'intencao':
      return null;
  }
}

export const MOTIVO = {
  inimigosDerrotados: 'Todas as ondas foram derrotadas.',
  cacadorCaiu: 'O caçador caiu.',
  tempoEsgotado: `O tempo acabou (${CONTEUDO.progressao.combate.limiteS} s).`,
} as const;

export function intentName(
  defId: string,
  acao: string | null,
): { nome: string; forte: boolean } | null {
  if (!acao) return null;
  const a = CONTEUDO.inimigos[defId]?.acoes.find((x) => x.id === acao);
  return a ? { nome: a.nome, forte: !!a.forte } : null;
}
