/**
 * Textos da batalha: descrição de ações (para as dicas das intenções) e
 * transformação dos eventos do motor em linhas do registro de combate.
 */
import type {
  CombatContent,
  CombatEvent,
  CombatState,
  Effect,
} from '../../../engine/combat/index.ts';
import { STATUS_DEFS, findUnit } from '../../../engine/combat/index.ts';

const ALVO: Record<string, string> = {
  jogador: 'em você',
  aliado: 'no aliado',
  jogadorEAliado: 'em você e no aliado',
  proprio: 'em si',
  todosInimigos: 'em todos os inimigos',
  inimigoEsquerda: 'no inimigo mais à esquerda',
  escolhido: 'no alvo',
};

/** Descrição curta de uma lista de efeitos, do ponto de vista de quem usa. */
export function describeEffects(efeitos: readonly Effect[]): string {
  return efeitos
    .map((e) => {
      switch (e.tipo) {
        case 'dano':
          return `Causa ${e.valor} de dano${e.golpes && e.golpes > 1 ? ` ${e.golpes} vezes` : ''} ${ALVO[e.alvo]}.`;
        case 'bloqueio':
          return e.alvo === 'proprio'
            ? `Ganha ${e.valor} de bloqueio.`
            : `Dá ${e.valor} de bloqueio a você.`;
        case 'status':
          return `Aplica ${e.valor} de ${STATUS_DEFS[e.status].nome} ${ALVO[e.alvo]}.`;
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ');
}

const nome = (s: CombatState, uid: string): string => {
  if (uid === 'jogador') return 'Você';
  return findUnit(s, uid)?.nome ?? 'A Sentinela';
};

/** Converte um evento do motor numa linha legível do registro (ou null para ignorar). */
export function describeEvent(e: CombatEvent, s: CombatState, c: CombatContent): string | null {
  switch (e.tipo) {
    case 'turnoIniciado':
      return `— Turno ${e.turno} —`;
    case 'cartaJogada':
      return `Você jogou ${c.cartas[e.carta]?.nome ?? e.carta}${e.avivada ? ' (avivada)' : ''}.`;
    case 'dano': {
      const alvo = nome(s, e.alvo);
      const bloqueado = e.bloqueado > 0 ? ` (${e.bloqueado} bloqueado)` : '';
      return `${nome(s, e.origem)} → ${alvo}: ${e.valor} de dano${bloqueado}.`;
    }
    case 'perdaDeVida':
      return `${nome(s, e.alvo)} perdeu ${e.valor} de vida por Veneno.`;
    case 'bloqueio':
      return `${nome(s, e.alvo)} ganhou ${e.valor} de bloqueio.`;
    case 'status':
      return `${nome(s, e.alvo)} recebeu ${e.valor} de ${STATUS_DEFS[e.status].nome}.`;
    case 'brasa':
      if (e.excedente) return `Brasa no máximo: ${e.excedente} perdida(s).`;
      if (e.delta > 0) return `+${e.delta} Brasa (${e.total}/3).`;
      if (e.delta < 0) return `${-e.delta} Brasa gasta(s).`;
      return null;
    case 'ritualAtivado':
      return `Ritual ativo: ${e.descricao}`;
    case 'ritualDisparado':
      return `Ritual: ${c.cartas[e.fonte]?.nome ?? e.fonte}.`;
    case 'aliadoInvocado':
      return e.renovado ? 'A Sentinela Ossuda foi restaurada.' : 'A Sentinela Ossuda foi invocada.';
    case 'aliadoAgiu':
      return `A Sentinela usou ${e.acao === 'proteger' ? 'Proteger' : 'Golpe de Osso'}.`;
    case 'inimigoAgiu': {
      const u = findUnit(s, e.inimigo);
      const acao = u ? c.inimigos[u.defId]?.acoes.find((a) => a.id === e.acao) : undefined;
      return `${u?.nome ?? 'Inimigo'} usou ${acao?.nome ?? e.acao}.`;
    }
    case 'especialAtivado':
      return `⚠ ${e.anuncio}`;
    case 'derrotado':
      return `${nome(s, e.alvo)} foi derrotado(a).`;
    case 'descarteReembaralhado':
      return `Descarte embaralhado de volta (${e.quantidade} cartas).`;
    case 'maoCheia':
      return `Mão cheia: ${c.cartas[e.carta]?.nome ?? e.carta} foi para o descarte.`;
    case 'combateEncerrado':
      return e.resultado === 'vitoria'
        ? 'Vitória!'
        : e.resultado === 'derrota'
          ? 'Derrota.'
          : 'Empate.';
    default:
      return null;
  }
}
