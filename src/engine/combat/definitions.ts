/**
 * Tipos das definições de conteúdo (cartas, inimigos, aliados, encontros).
 *
 * O motor nunca importa o conteúdo: ele recebe essas definições como parâmetro.
 * O conteúdo, por sua vez, só importa estes tipos.
 */
import type { Effect } from '../effects/effects.ts';

export type Rarity = 'comum' | 'incomum' | 'rara';
export type CardType = 'ataque' | 'defesa' | 'tecnica' | 'invocacao' | 'ritual';

export interface AvivarDef {
  /** Brasa gasta para avivar. */
  custo: number;
  /** "substitui": usa estes efeitos no lugar dos normais. "adiciona": executa os normais e depois estes. */
  modo: 'substitui' | 'adiciona';
  efeitos: Effect[];
}

export interface CardDef {
  id: string;
  nome: string;
  custo: number;
  tipo: CardType;
  raridade: Rarity;
  /** "inimigo": o jogador escolhe um inimigo vivo como alvo. "nenhum": não há alvo a escolher. */
  alvo: 'inimigo' | 'nenhum';
  efeitos: Effect[];
  avivar?: AvivarDef;
  /** A carta sai do combate depois de jogada. */
  consumir?: boolean;
  /** Texto de regras exibido na carta. */
  texto: string;
}

/** Categorias de intenção, usadas para escolher o ícone e para a IA do aliado. */
export type IntentKind = 'ataque' | 'defesa' | 'buff' | 'debuff' | 'preparar';

export interface EnemyActionDef {
  id: string;
  nome: string;
  tipos: IntentKind[];
  efeitos: Effect[];
  /** Aviso extra mostrado junto da intenção (ex.: "Próximo turno: Execução"). */
  aviso?: string;
}

export type EnemyPattern =
  | { tipo: 'sequencia'; ordem: string[] }
  | {
      tipo: 'pesos';
      pesos: Array<{ acao: string; peso: number }>;
      /** Número máximo de vezes seguidas que a mesma ação pode ser escolhida. */
      maxRepeticoes: number;
    };

export interface EnemySpecialDef {
  id: string;
  /** Dispara uma única vez quando a vida fica abaixo desta fração da vida máxima. */
  gatilho: { tipo: 'vidaAbaixo'; fracao: number };
  efeitos: Effect[];
  anuncio: string;
}

export interface EnemyDef {
  id: string;
  nome: string;
  vidaMax: number;
  descricao: string;
  acoes: EnemyActionDef[];
  padrao: EnemyPattern;
  especiais?: EnemySpecialDef[];
}

export interface AllyActionDef {
  id: string;
  nome: string;
  tipos: IntentKind[];
  efeitos: Effect[];
}

export interface AllyDef {
  id: string;
  nome: string;
  vidaMax: number;
  descricao: string;
  /** Ação quando algum inimigo pretende atacar neste turno. */
  quandoInimigoAtaca: AllyActionDef;
  /** Ação nos demais casos. */
  casoContrario: AllyActionDef;
}

export interface EncounterDef {
  id: string;
  nome: string;
  descricao: string;
  inimigos: string[];
}

export interface PlayerSetup {
  vidaMax: number;
  energiaPorTurno: number;
  cartasPorTurno: number;
  brasaMax: number;
  maoMax: number;
}

/** Todo o conteúdo que o motor precisa para rodar um combate. */
export interface CombatContent {
  cartas: Record<string, CardDef>;
  inimigos: Record<string, EnemyDef>;
  aliados: Record<string, AllyDef>;
  jogador: PlayerSetup;
}
