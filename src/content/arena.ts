/**
 * Arena: unidades, marcas (sinergias), Heróis da Arena e regras da partida.
 * Nomes e números provisórios; o equilíbrio vem do teste de quem joga.
 *
 * A Arena é justa: todos usam as mesmas unidades. Os Selos da Caçada liberam
 * Heróis da Arena, poderes passivos equilibrados entre si.
 */
import type {
  ArenaDef,
  ArenaUnitDef,
  HeroiArenaDef,
  MarcaDef,
  MarcaId,
} from '../engine/definitions.ts';

const UNIDADES: ArenaUnitDef[] = [
  /* ---------- Custo 1 ---------- */
  {
    id: 'vigiaDeCinza',
    nome: 'Vigia de Cinza',
    custo: 1,
    marcas: ['cinzas', 'ossos'],
    vida: 620,
    ataque: 40,
    velocidade: 80,
    alcance: 1,
    habilidade: {
      nome: 'Escudo de Cinza',
      descricao: 'Ganha bloqueio igual a 30% da vida máxima.',
      efeitos: [{ tipo: 'bloqueio', pctVidaMax: 0.3, alvo: 'proprio' }],
    },
  },
  {
    id: 'ratoDeBrasa',
    nome: 'Rato de Brasa',
    custo: 1,
    marcas: ['chama', 'veu'],
    vida: 420,
    ataque: 46,
    velocidade: 120,
    alcance: 1,
    habilidade: {
      nome: 'Mordida Ardente',
      descricao: '150% do ataque e 6 de Queimadura no alvo.',
      efeitos: [
        { tipo: 'dano', mult: 1.5, alvo: 'alvo' },
        { tipo: 'status', status: 'queimadura', valor: 6, alvo: 'alvo' },
      ],
    },
  },
  {
    id: 'acolitaPalida',
    nome: 'Acólita Pálida',
    custo: 1,
    marcas: ['abismo', 'veu'],
    vida: 420,
    ataque: 34,
    velocidade: 90,
    alcance: 3,
    habilidade: {
      nome: 'Prece Fria',
      descricao: 'Cura 25% da vida máxima do aliado mais ferido.',
      efeitos: [{ tipo: 'cura', pctVidaMax: 0.25, alvo: 'aliadoMaisFerido' }],
    },
  },
  {
    id: 'arqueiroOco',
    nome: 'Arqueiro Oco',
    custo: 1,
    marcas: ['ossos', 'veu'],
    vida: 400,
    ataque: 50,
    velocidade: 85,
    alcance: 3,
    habilidade: {
      nome: 'Tiro Certeiro',
      descricao: '240% do ataque no alvo.',
      efeitos: [{ tipo: 'dano', mult: 2.4, alvo: 'alvo' }],
    },
  },
  {
    id: 'carnical',
    nome: 'Carniçal',
    custo: 1,
    marcas: ['abismo', 'ossos'],
    vida: 580,
    ataque: 42,
    velocidade: 80,
    alcance: 1,
    habilidade: {
      nome: 'Devorar',
      descricao: '150% do ataque no alvo e cura 15% da própria vida.',
      efeitos: [
        { tipo: 'dano', mult: 1.5, alvo: 'alvo' },
        { tipo: 'cura', pctVidaMax: 0.15, alvo: 'proprio' },
      ],
    },
  },
  {
    id: 'fagulha',
    nome: 'Fagulha',
    custo: 1,
    marcas: ['chama', 'cinzas'],
    vida: 380,
    ataque: 40,
    velocidade: 95,
    alcance: 3,
    habilidade: {
      nome: 'Chuva de Fagulhas',
      descricao: '60% do ataque em todos os inimigos.',
      efeitos: [{ tipo: 'dano', mult: 0.6, alvo: 'inimigos' }],
    },
  },

  /* ---------- Custo 2 ---------- */
  {
    id: 'ferreiro',
    nome: 'Ferreiro Cinzento',
    custo: 2,
    marcas: ['cinzas', 'chama'],
    vida: 800,
    ataque: 56,
    velocidade: 70,
    alcance: 1,
    habilidade: {
      nome: 'Malho',
      descricao: '220% do ataque e deixa o alvo Fraco por 4 s.',
      efeitos: [
        { tipo: 'dano', mult: 2.2, alvo: 'alvo' },
        { tipo: 'status', status: 'fraco', valor: 4, alvo: 'alvo' },
      ],
    },
  },
  {
    id: 'tecela',
    nome: 'Tecelã',
    custo: 2,
    marcas: ['veu', 'abismo'],
    vida: 520,
    ataque: 46,
    velocidade: 85,
    alcance: 3,
    habilidade: {
      nome: 'Teia Pálida',
      descricao: '8 de Veneno e 3 s de Fraco no alvo.',
      efeitos: [
        { tipo: 'status', status: 'veneno', valor: 8, alvo: 'alvo' },
        { tipo: 'status', status: 'fraco', valor: 3, alvo: 'alvo' },
      ],
    },
  },
  {
    id: 'sentinela',
    nome: 'Sentinela de Osso',
    custo: 2,
    marcas: ['ossos', 'cinzas'],
    vida: 860,
    ataque: 40,
    velocidade: 70,
    alcance: 1,
    habilidade: {
      nome: 'Proteger',
      descricao: 'Dá ao aliado mais ferido bloqueio igual a 25% da vida máxima da Sentinela.',
      efeitos: [{ tipo: 'bloqueio', pctVidaMax: 0.25, alvo: 'aliadoMaisFerido' }],
    },
  },
  {
    id: 'caoDeEscoria',
    nome: 'Cão de Escória',
    custo: 2,
    marcas: ['abismo', 'chama'],
    vida: 560,
    ataque: 60,
    velocidade: 120,
    alcance: 1,
    habilidade: {
      nome: 'Marcar a Presa',
      descricao: '120% do ataque e 6 de Marca no alvo.',
      efeitos: [
        { tipo: 'dano', mult: 1.2, alvo: 'alvo' },
        { tipo: 'status', status: 'marca', valor: 6, alvo: 'alvo' },
      ],
    },
  },
  {
    id: 'lancadora',
    nome: 'Lançadora de Brasas',
    custo: 2,
    marcas: ['chama', 'veu'],
    vida: 500,
    ataque: 56,
    velocidade: 85,
    alcance: 3,
    habilidade: {
      nome: 'Bola de Fogo',
      descricao: '180% do ataque e 6 de Queimadura no alvo.',
      efeitos: [
        { tipo: 'dano', mult: 1.8, alvo: 'alvo' },
        { tipo: 'status', status: 'queimadura', valor: 6, alvo: 'alvo' },
      ],
    },
  },

  /* ---------- Custo 3 ---------- */
  {
    id: 'cavaleiroOco',
    nome: 'Cavaleiro Oco',
    custo: 3,
    marcas: ['ossos', 'abismo'],
    vida: 1050,
    ataque: 70,
    velocidade: 70,
    alcance: 1,
    habilidade: {
      nome: 'Execução',
      descricao: '320% do ataque no alvo.',
      efeitos: [{ tipo: 'dano', mult: 3.2, alvo: 'alvo' }],
    },
  },
  {
    id: 'guardiaLimiar',
    nome: 'Guardiã do Limiar',
    custo: 3,
    marcas: ['cinzas', 'veu'],
    vida: 980,
    ataque: 64,
    velocidade: 75,
    alcance: 1,
    habilidade: {
      nome: 'Varrer o Limiar',
      descricao: '90% do ataque em todos os inimigos e bloqueio de 15% da vida.',
      efeitos: [
        { tipo: 'dano', mult: 0.9, alvo: 'inimigos' },
        { tipo: 'bloqueio', pctVidaMax: 0.15, alvo: 'proprio' },
      ],
    },
  },
  {
    id: 'arauto',
    nome: 'Arauto da Brasa',
    custo: 3,
    marcas: ['chama', 'abismo'],
    vida: 820,
    ataque: 74,
    velocidade: 80,
    alcance: 2,
    habilidade: {
      nome: 'Explosão de Brasa',
      descricao: '100% do ataque e 4 de Queimadura em todos os inimigos.',
      efeitos: [
        { tipo: 'dano', mult: 1, alvo: 'inimigos' },
        { tipo: 'status', status: 'queimadura', valor: 4, alvo: 'inimigos' },
      ],
    },
  },
  {
    id: 'caldeira',
    nome: 'Olho da Caldeira',
    custo: 3,
    marcas: ['veu', 'chama'],
    vida: 720,
    ataque: 62,
    velocidade: 70,
    alcance: 4,
    habilidade: {
      nome: 'Anel de Fogo',
      descricao: '90% do ataque em todos os inimigos e 3 s de Vulnerável.',
      efeitos: [
        { tipo: 'dano', mult: 0.9, alvo: 'inimigos' },
        { tipo: 'status', status: 'vulneravel', valor: 3, alvo: 'inimigos' },
      ],
    },
  },
];

const MARCAS_LISTA: MarcaDef[] = [
  {
    id: 'cinzas',
    nome: 'Cinzas',
    descricao: 'Começam a luta com bloqueio.',
    niveis: [
      { qtd: 2, texto: 'Todos: bloqueio de 15% da vida', bonus: { bloqueioPct: 0.15 } },
      { qtd: 4, texto: 'Todos: bloqueio de 35% da vida', bonus: { bloqueioPct: 0.35 } },
    ],
  },
  {
    id: 'ossos',
    nome: 'Ossos',
    descricao: 'Mais vida.',
    niveis: [
      { qtd: 2, texto: 'Todos: +15% de vida', bonus: { vidaPct: 0.15 } },
      { qtd: 4, texto: 'Todos: +35% de vida', bonus: { vidaPct: 0.35 } },
    ],
  },
  {
    id: 'veu',
    nome: 'Véu',
    descricao: 'Golpes críticos.',
    niveis: [
      { qtd: 2, texto: 'Todos: +15% de crítico', bonus: { critico: 0.15 } },
      {
        qtd: 4,
        texto: 'Todos: +30% de crítico e +30% de dano crítico',
        bonus: { critico: 0.3, danoCritico: 0.3 },
      },
    ],
  },
  {
    id: 'chama',
    nome: 'Chama',
    descricao: 'Ataques básicos queimam.',
    niveis: [
      {
        qtd: 2,
        texto: 'Todos: ataques aplicam 2 de Queimadura',
        bonus: { queimaduraAoAcertar: 2 },
      },
      {
        qtd: 4,
        texto: 'Todos: ataques aplicam 5 de Queimadura',
        bonus: { queimaduraAoAcertar: 5 },
      },
    ],
  },
  {
    id: 'abismo',
    nome: 'Abismo',
    descricao: 'Roubo de vida e habilidades mais cedo.',
    niveis: [
      { qtd: 2, texto: 'Todos: 10% de roubo de vida', bonus: { rouboVida: 0.1 } },
      {
        qtd: 4,
        texto: 'Todos: 25% de roubo de vida e começam com 40 de mana',
        bonus: { rouboVida: 0.25, manaInicial: 40 },
      },
    ],
  },
];

const HEROIS: HeroiArenaDef[] = [
  {
    id: 'vigia',
    nome: 'Vigia',
    descricao: 'Começa a partida com 3 de ouro a mais.',
    efeito: { ouroInicial: 3 },
  },
  {
    id: 'juramento',
    nome: 'Juramento',
    descricao: 'Unidades da frente começam com bloqueio de 15% da vida.',
    selo: 'seloCavaleiro',
    efeito: { bonusFrente: { bloqueioPct: 0.15 } },
  },
  {
    id: 'limiar',
    nome: 'Limiar',
    descricao: 'Uma rolagem da loja grátis a cada rodada.',
    selo: 'seloLimiar',
    efeito: { rolagemGratis: 1 },
  },
  {
    id: 'matilha',
    nome: 'Matilha',
    descricao: '+1 de XP a cada rodada.',
    selo: 'seloMatilheiro',
    efeito: { xpExtra: 1 },
  },
  {
    id: 'forja',
    nome: 'Forja',
    descricao: 'Todas as unidades com +8% de ataque.',
    selo: 'seloForjadora',
    efeito: { bonus: { ataquePct: 0.08 } },
  },
  {
    id: 'caldeira',
    nome: 'Caldeira',
    descricao: 'Ataques de todas as unidades aplicam 1 de Queimadura.',
    selo: 'seloCaldeira',
    efeito: { bonus: { queimaduraAoAcertar: 1 } },
  },
  {
    id: 'colosso',
    nome: 'Colosso',
    descricao: 'Todas as unidades com +8% de vida.',
    selo: 'seloColosso',
    efeito: { bonus: { vidaPct: 0.08 } },
  },
  {
    id: 'arauto',
    nome: 'Arauto',
    descricao: 'Começa a partida com 6 de vida a mais.',
    selo: 'seloArauto',
    efeito: { vidaJogador: 6 },
  },
];

export const ARENA: ArenaDef = {
  unidades: Object.fromEntries(UNIDADES.map((u) => [u.id, u])),
  marcas: Object.fromEntries(MARCAS_LISTA.map((m) => [m.id, m])) as Record<MarcaId, MarcaDef>,
  herois: Object.fromEntries(HEROIS.map((h) => [h.id, h])),
  regras: {
    jogadores: 4,
    vidaJogador: 40,
    rodadasMax: 20,
    banco: 8,
    colunas: 4,
    custoRolar: 2,
    custoXp: 4,
    xpPorCompra: 4,
    xpPorRodada: 2,
    xpParaNivel: [2, 4, 6, 10, 20, 30, 40],
    nivelMax: 8,
    nivelInicial: 2,
    renda: [3, 4, 5],
    jurosCada: 10,
    jurosMax: 3,
    bonusVitoria: 1,
    copias: [18, 13, 9],
    chances: [
      [100, 0, 0],
      [100, 0, 0],
      [75, 25, 0],
      [55, 35, 10],
      [45, 40, 15],
      [35, 40, 25],
      [25, 40, 35],
      [20, 35, 45],
    ],
    tamanhoLoja: 5,
    multEstrela: [1, 1.8, 3.2],
    limiteS: 30,
    manaMax: 100,
    manaPorAtaque: 12,
    manaPorDano: 4,
    danoBase: 1,
    gloria: [30, 18, 10, 5],
  },
  ofertas: { pocao: { custo: 6 }, ouro: { custo: 10, porLevel: 40 } },
  nomesBots: ['Sombra de Aldren', 'Irmã Vesper', 'O Andarilho', 'Mão Cinzenta', 'Corvo Pálido'],
};
