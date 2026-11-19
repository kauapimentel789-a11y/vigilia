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

export type ClasseId = 'vigia' | 'guardiao' | 'arcanista' | 'lamina' | 'atiradora';
export const CLASSES_ORDEM: readonly ClasseId[] = [
  'vigia',
  'guardiao',
  'arcanista',
  'lamina',
  'atiradora',
];

/** Classe do caçador: muda os números de combate, o alcance e as habilidades exclusivas. */
export interface ClasseDef {
  id: ClasseId;
  nome: string;
  /** Papel em poucas palavras (ex.: "Tanque"). */
  papel: string;
  descricao: string;
  /** Alcance do ataque básico, em tiles. */
  alcance: number;
  /** Multiplicadores sobre os números derivados dos atributos. */
  mult: { vida: number; ataque: number; velocidade: number };
  /** Somas diretas (frações). */
  bonus: { critico: number; reducao: number; poder: number };
}

/** Como a habilidade aparece no mapa (só a tela usa). */
export interface VisualHabilidade {
  tipo: 'corte' | 'projetil' | 'nova' | 'escudo' | 'cura' | 'chuva' | 'explosao' | 'sombra';
  cor: string;
}

export interface AbilityDef {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaHabilidade;
  /** Só esta classe pode usar. Sem classe: todas podem. */
  classe?: ClasseId;
  /** Mapa: raio, em tiles, dos efeitos em "inimigos" em volta do caçador (padrão 1). */
  raio?: number;
  visual?: VisualHabilidade;
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
  /** Mapa: raio da área avisada no chão de um golpe forte (0 = só o tile do alvo). */
  area?: number;
  /**
   * Mapa: onde fica a área do golpe forte.
   * 'alvo' (padrão): quadrado em volta do caçador · 'emVolta': quadrado em volta de quem golpeia ·
   * 'cruz': linhas retas a partir de quem golpeia · 'anel': em volta de quem golpeia, menos perto
   * dele (encostar é o lugar seguro).
   */
  forma?: 'alvo' | 'emVolta' | 'cruz' | 'anel';
  /** Mapa: tempo de preparo deste golpe forte, em ms (padrão: mundo.preparoForteMs). */
  preparoMs?: number;
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
  /**
   * Fases de chefe, em ordem de vida decrescente. Cada uma dispara uma vez ao
   * cair abaixo de `abaixoDe`: anuncia, aplica efeitos, invoca ajudantes (só no
   * mapa) e pode trocar as ações por uma lista nova.
   */
  fases?: FaseDef[];
  /**
   * Quando o inimigo é o chefe de um mapa: ações a mais (somadas às normais) e
   * fases próprias. Assim um monstro comum vira uma luta de chefe de verdade.
   */
  comoChefe?: { acoes?: EnemyActionDef[]; fases?: FaseDef[]; padrao?: 'ciclo' | 'aleatorio' };
  /** Mapa: XP e ouro por abate (antes da escala do portal). */
  xp: number;
  ouro: number;
  /** Mapa: alcance de ataque em tiles (1 = corpo a corpo). */
  alcance?: number;
  /** Mapa: tempo para andar um tile, em ms. */
  passoMs?: number;
}

export interface FaseDef {
  abaixoDe: number;
  anuncio: string;
  efeitos?: Effect[];
  /** Ids de inimigos que aparecem ao lado do chefe (não renascem). */
  invocar?: string[];
  /** Ids das ações usadas a partir desta fase (no lugar das anteriores). */
  acoes?: string[];
}

export type RankId = 'cinza' | 'brasa';
export const RANKS_ORDEM: readonly RankId[] = ['cinza', 'brasa'];

export interface RankDef {
  id: RankId;
  nome: string;
  descricao: string;
}

/** Selo: lembrança de um chefe vencido. Será usado pela Arena. */
export interface SeloDef {
  id: string;
  nome: string;
  descricao: string;
}

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
  /** Exame de Rank: vencer o chefe pela primeira vez leva o caçador a este rank. */
  promove?: RankId;
  /** Selo que o chefe deste portal deixa a cada vitória. */
  selo?: string;
}

/** Configuração do mundo jogável (mapas em tempo real). */
export interface WorldDef {
  /** Passo fixo da simulação em tempo real, em ms. */
  tickMs: number;
  /** Tempo do caçador para andar um tile, em ms (com velocidade 100). */
  passoMsCacador: number;
  passoMsMinimo: number;
  /** Raio (em tiles) em que um monstro nota o caçador. */
  visaoMonstro: number;
  /** Distância do ponto de origem em que o monstro desiste de perseguir. */
  coleira: number;
  /** Tempo para um monstro comum renascer, em segundos. */
  renascerS: number;
  /** Raio revelado da névoa em volta do caçador. */
  raioRevelado: number;
  /** Tempo entre o aviso no chão e o golpe forte, em ms. */
  preparoForteMs: number;
  /** Monstros cuja origem está a esta distância entram juntos na luta. */
  raioGrupo: number;
  /** Multiplica o intervalo entre ataques dos monstros no mapa (1,5 = 50% mais lentos). */
  ritmoMonstros: number;
}

export interface MapDef {
  id: string;
  nome: string;
  tipo: 'posto' | 'portal';
  /** Paleta do mapa (padrão: 'cinza'). Em 'brasa', a água vira lava. */
  tema?: 'cinza' | 'brasa';
  /** Portal (da Caçada) que este mapa representa: define escala e recompensas. */
  portal?: string;
  /** Multiplicadores do chefe deste mapa (padrão: vida ×4, ataque ×1,3). */
  chefe?: { vida: number; ataque: number };
  linhas: string[];
  legenda: {
    monstros?: Record<string, string>;
    chefes?: Record<string, string>;
    portoes?: Record<string, { destino: string; rotulo: string }>;
    /** Objetos: personagens do Posto ('mercadora', 'bau', 'altar', 'expedicao') ou 'tesouro'. */
    objetos?: Record<string, string>;
  };
}

/* ---------- Itens ---------- */

export type SlotId = 'arma' | 'cabeca' | 'peito' | 'maos' | 'pes' | 'amuleto';
export const SLOTS: readonly SlotId[] = ['arma', 'cabeca', 'peito', 'maos', 'pes', 'amuleto'];

export type Raridade = 'comum' | 'incomum' | 'rara';
export const RARIDADES: readonly Raridade[] = ['comum', 'incomum', 'rara'];

/**
 * O que um item pode somar. Frações (reducao, critico, danoCritico, poder,
 * rouboVida) são escritas como 0,02 = 2%.
 */
export type ItemStatId =
  | AtributoId
  | 'vida'
  | 'ataque'
  | 'reducao'
  | 'critico'
  | 'danoCritico'
  | 'velocidade'
  | 'poder'
  | 'rouboVida'
  | 'venenoAoAcertar';

export type ItemStats = Partial<Record<ItemStatId, number>>;

export interface ItemBaseDef {
  id: string;
  nome: string;
  slot: SlotId;
  /** Faixa do item: decide em que portais ele cai e a força dos afixos. */
  nivel: number;
  stats: ItemStats;
  /** Valor de venda na mercadora (Comum). */
  valor: number;
}

export interface AffixDef {
  id: string;
  /** Sufixo mostrado no nome (ex.: "da Força"). */
  nome: string;
  stat: ItemStatId;
  /** Faixa sorteada no nível 1. Cresce com o nível do item (`porNivel` por nível). */
  min: number;
  max: number;
  porNivel: number;
  /** Só aparece em itens destes espaços (ausente = todos). */
  slots?: SlotId[];
}

export interface ItemsDef {
  bases: Record<string, ItemBaseDef>;
  afixos: Record<string, AffixDef>;
  /** Peso de cada raridade no sorteio, multiplicador dos números base e quantos afixos ela tem. */
  raridades: Record<
    Raridade,
    { peso: number; multBase: number; afixos: number; multValor: number }
  >;
  /** Chance de um monstro comum deixar um item. O chefe sempre deixa um, no mínimo Incomum. */
  chanceDeSaque: number;
  /** Faixas de item (ItemBaseDef.nivel) que caem em cada portal. */
  saquePorPortal: Record<string, number[]>;
  capacidadeMochila: number;
  capacidadeBau: number;
  /** Expedição: fração do saque de caçar ativamente e máximo de itens por coleta. */
  expedicao: { fator: number; maximo: number };
  pocao: { preco: number; curaPct: number; recargaS: number; maximo: number };
}

/* ---------- Arena (auto-battler) ---------- */

export type MarcaId = 'cinzas' | 'ossos' | 'veu' | 'chama' | 'abismo';
export const MARCAS: readonly MarcaId[] = ['cinzas', 'ossos', 'veu', 'chama', 'abismo'];

/** Bônus que uma marca, um herói ou uma posição dá às unidades. */
export interface ArenaBonus {
  /** Fração a mais de vida máxima (0,2 = +20%). */
  vidaPct?: number;
  ataquePct?: number;
  /** Bloqueio inicial, em fração da vida máxima. */
  bloqueioPct?: number;
  critico?: number;
  danoCritico?: number;
  rouboVida?: number;
  /** Queimadura aplicada a cada ataque básico. */
  queimaduraAoAcertar?: number;
  manaInicial?: number;
  /** Velocidade a mais (100 = uma ação por segundo). */
  velocidade?: number;
}

export interface ArenaUnitDef {
  id: string;
  nome: string;
  /** Custo na loja e raridade (1 a 3). */
  custo: number;
  marcas: [MarcaId, MarcaId];
  vida: number;
  ataque: number;
  velocidade: number;
  /** 1 = corpo a corpo (atrás de um aliado, só ataca quando a frente da coluna cai). */
  alcance: number;
  habilidade: { nome: string; descricao: string; efeitos: Effect[] };
}

export interface MarcaDef {
  id: MarcaId;
  nome: string;
  descricao: string;
  /** Níveis em ordem crescente de quantidade de unidades diferentes. */
  niveis: Array<{ qtd: number; texto: string; bonus: ArenaBonus }>;
}

export interface HeroiArenaDef {
  id: string;
  nome: string;
  descricao: string;
  /** Selo da Caçada que libera o herói (ausente = livre). */
  selo?: string;
  efeito: {
    ouroInicial?: number;
    /** Rolagens grátis da loja por rodada. */
    rolagemGratis?: number;
    xpExtra?: number;
    vidaJogador?: number;
    /** Bônus para todas as unidades. */
    bonus?: ArenaBonus;
    /** Bônus só para as unidades da fileira da frente. */
    bonusFrente?: ArenaBonus;
  };
}

export interface ArenaRules {
  jogadores: number;
  vidaJogador: number;
  rodadasMax: number;
  banco: number;
  colunas: number;
  custoRolar: number;
  custoXp: number;
  xpPorCompra: number;
  xpPorRodada: number;
  /** XP para ir do nível n ao n+1 (índice n − 1). */
  xpParaNivel: number[];
  nivelMax: number;
  nivelInicial: number;
  /** Renda por rodada (índice = rodada − 1; a última se repete). */
  renda: number[];
  jurosCada: number;
  jurosMax: number;
  bonusVitoria: number;
  /** Cópias de cada unidade no estoque, por custo (índice = custo − 1). */
  copias: number[];
  /** Chance de cada custo na loja, por nível do jogador (índice = nível − 1). */
  chances: number[][];
  tamanhoLoja: number;
  /** Multiplicador de vida e ataque por estrela (índice = estrelas − 1). */
  multEstrela: number[];
  /** Duração máxima de um combate, em segundos. Estourou: os dois perdem. */
  limiteS: number;
  manaMax: number;
  manaPorAtaque: number;
  manaPorDano: number;
  /** Dano ao jogador que perde: base + unidades inimigas vivas + 1 a cada 5 rodadas. */
  danoBase: number;
  /** Glória por colocação (índice 0 = 1º lugar). */
  gloria: number[];
}

export interface ArenaDef {
  unidades: Record<string, ArenaUnitDef>;
  marcas: Record<MarcaId, MarcaDef>;
  herois: Record<string, HeroiArenaDef>;
  regras: ArenaRules;
  /** Nomes dos adversários controlados pelo jogo. */
  nomesBots: string[];
  /** O que a Glória compra para a Caçada. */
  ofertas: { pocao: { custo: number }; ouro: { custo: number; porLevel: number } };
}

export interface GameContent {
  progressao: ProgressionDef;
  classes: Record<ClasseId, ClasseDef>;
  habilidades: Record<string, AbilityDef>;
  inimigos: Record<string, EnemyDef>;
  portais: Record<string, PortalDef>;
  /** Ordem de exibição dos portais. */
  ordemPortais: string[];
  mundo: WorldDef;
  mapas: Record<string, MapDef>;
  itens: ItemsDef;
  ranks: Record<RankId, RankDef>;
  selos: Record<string, SeloDef>;
  arena: ArenaDef;
  /** Mapa onde o caçador começa e para onde volta ao morrer. */
  mapaInicial: string;
}
