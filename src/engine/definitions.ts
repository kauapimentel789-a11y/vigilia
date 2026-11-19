/**
 * Formato do conteúdo que o motor recebe.
 *
 * O motor nunca importa `src/content`: ele recebe um `GameContent` como parâmetro.
 * Assim os testes podem usar conteúdo próprio e os números podem mudar sem tocar
 * nas regras.
 */
import type { Effect } from './effects/effects.ts';

export type AtributoId = 'forca' | 'agilidade' | 'vigor' | 'percepcao' | 'vontade';

export const ATRIBUTOS: readonly AtributoId[] = [
  'forca',
  'agilidade',
  'vigor',
  'percepcao',
  'vontade',
];

/** Coeficientes que transformam level e atributos em números de combate. */
export interface StatsDef {
  vidaBase: number;
  vidaPorLevel: number;
  vidaPorVigor: number;
  ataqueBase: number;
  ataquePorLevel: number;
  ataquePorForca: number;
  /** Bônus percentual de dano por ponto de Força (0,02 = +2%). */
  danoPctPorForca: number;
  velocidadeBase: number;
  velocidadePctPorAgilidade: number;
  velocidadeBonusMax: number;
  reducaoPorVigor: number;
  reducaoMax: number;
  criticoBase: number;
  criticoPorPercepcao: number;
  criticoMax: number;
  danoCriticoBase: number;
  danoCriticoPorPercepcao: number;
  poderPorVontade: number;
  recargaPorVontade: number;
  recargaReducaoMax: number;
}

export interface ProgressionDef {
  levelMax: number;
  /** XP para ir do level n ao n+1: round(xpBase × n^xpExpoente). */
  xpBase: number;
  xpExpoente: number;
  pontosPorLevel: number;
  atributoInicial: number;
  stats: StatsDef;
  espacosDeHabilidade: number;
  habilidadeNivelMax: number;
  /** Cada nível de habilidade acima do 1 soma esta fração à força dela. */
  escalaPorNivelDeHabilidade: number;
  /** Custo em ouro para ir do nível n ao n+1: round(custoMelhoriaBase × n²). */
  custoMelhoriaBase: number;
  ataqueBasico: { nome: string; mult: number };
  combate: {
    /** Duração de um tique da simulação, em ms. */
    tickMs: number;
    /** Carga de ação necessária para agir. A velocidade é somada a cada tique. */
    cargaParaAgir: number;
    /** Tempo máximo de um portal, em segundos. Estourou: derrota. */
    limiteS: number;
    /** Fração do bloqueio que some a cada segundo. */
    decaimentoBloqueio: number;
  };
  expedicao: {
    /** Quantas lutas reais são simuladas para calcular a taxa. */
    lutasAmostra: number;
    /** Pausa entre uma luta e outra, em segundos. */
    pausaEntreLutasS: number;
    /** Teto de tempo acumulado sem coletar, em horas. */
    tetoHoras: number;
  };
  /**
   * Recompensa de portais fáceis demais: acima de `levelRecomendado + tolerancia`,
   * cada level a mais tira `quedaPorLevel` do XP e do ouro, até o `minimo`.
   */
  xpAcimaDoRecomendado: { tolerancia: number; quedaPorLevel: number; minimo: number };
}

export type CategoriaHabilidade = 'ataque' | 'defesa' | 'cura';

export interface AbilityDef {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaHabilidade;
  /** Level do caçador em que a habilidade fica disponível. */
  desbloqueio: number;
  /** Recarga em segundos. */
  recarga: number;
  efeitos: Effect[];
}

export interface EnemyActionDef {
  id: string;
  nome: string;
  efeitos: Effect[];
  /** Golpe forte: a regra "Guarda contra golpe forte" reage a ele. */
  forte?: boolean;
  /** Peso no sorteio, quando o padrão é aleatório. */
  peso?: number;
  /** Só é escolhida se houver outro inimigo vivo (ex.: proteger um aliado). */
  requerAliados?: boolean;
}

export interface EnemyDef {
  id: string;
  nome: string;
  descricao: string;
  vidaMax: number;
  ataque: number;
  velocidade: number;
  /** "ciclo" repete as ações em ordem; "aleatorio" sorteia pelo peso. */
  padrao: 'ciclo' | 'aleatorio';
  acoes: EnemyActionDef[];
  /** Efeito único quando a vida cai abaixo da fração indicada (ex.: fúria). */
  especial?: { abaixoDe: number; anuncio: string; efeitos: Effect[] };
}

export type RankId = 'cinza';

export interface PortalDef {
  id: string;
  nome: string;
  rank: RankId;
  descricao: string;
  /** Level a partir do qual o portal costuma ser vencido. Também regula o XP (ver progressão). */
  levelRecomendado: number;
  /** Cada onda é uma lista de ids de inimigos. */
  ondas: string[][];
  /** Multiplicadores aplicados a vida e ataque dos inimigos deste portal. */
  escala: { vida: number; ataque: number };
  recompensa: { xp: number; ouro: number };
  /** Bônus extra da primeira vitória. */
  primeiraVitoria: { xp: number; ouro: number };
  /** Portal que precisa estar fechado para este abrir. */
  requer?: string;
  chefe?: boolean;
}

export interface GameContent {
  progressao: ProgressionDef;
  habilidades: Record<string, AbilityDef>;
  inimigos: Record<string, EnemyDef>;
  portais: Record<string, PortalDef>;
  /** Ordem de exibição dos portais. */
  ordemPortais: string[];
}
