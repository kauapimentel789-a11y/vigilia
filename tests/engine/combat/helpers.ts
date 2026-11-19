/**
 * Conteúdo "de mentira" para testar as regras do motor isoladamente,
 * sem depender dos números do conteúdo real.
 */
import type {
  CardDef,
  CombatContent,
  CombatState,
  EncounterDef,
  EnemyDef,
} from '../../../src/engine/combat/index.ts';
import { startCombat } from '../../../src/engine/combat/index.ts';

const card = (c: Partial<CardDef> & Pick<CardDef, 'id' | 'efeitos'>): CardDef => ({
  nome: c.id,
  custo: 1,
  tipo: 'ataque',
  raridade: 'comum',
  alvo: 'nenhum',
  texto: '',
  ...c,
});

export const TEST_CARDS: CardDef[] = [
  card({ id: 'golpe', alvo: 'inimigo', efeitos: [{ tipo: 'dano', valor: 5, alvo: 'escolhido' }] }),
  card({
    id: 'duplo',
    alvo: 'inimigo',
    efeitos: [{ tipo: 'dano', valor: 3, golpes: 2, alvo: 'escolhido' }],
  }),
  card({ id: 'escudo', efeitos: [{ tipo: 'bloqueio', valor: 5, alvo: 'proprio' }] }),
  card({ id: 'gratis', custo: 0, efeitos: [{ tipo: 'comprar', valor: 1 }] }),
  card({ id: 'compra3', custo: 0, efeitos: [{ tipo: 'comprar', valor: 3 }] }),
  card({ id: 'caro', custo: 3, efeitos: [] }),
  card({
    id: 'avivavel',
    alvo: 'inimigo',
    efeitos: [{ tipo: 'dano', valor: 4, alvo: 'escolhido' }],
    avivar: {
      custo: 2,
      modo: 'substitui',
      efeitos: [{ tipo: 'dano', valor: 10, alvo: 'escolhido' }],
    },
  }),
  card({
    id: 'adiciona',
    efeitos: [{ tipo: 'bloqueio', valor: 4, alvo: 'proprio' }],
    avivar: {
      custo: 1,
      modo: 'adiciona',
      efeitos: [{ tipo: 'bloqueio', valor: 5, alvo: 'proprio' }],
    },
  }),
  card({
    id: 'devorar',
    custo: 0,
    alvo: 'inimigo',
    efeitos: [{ tipo: 'danoPorBrasa', base: 8, porBrasa: 6, alvo: 'escolhido' }],
  }),
  card({
    id: 'ritual',
    consumir: true,
    efeitos: [
      { tipo: 'ritual', descricao: '+1 Brasa', efeitos: [{ tipo: 'ganharBrasa', valor: 1 }] },
    ],
  }),
  card({ id: 'invocar', custo: 0, efeitos: [{ tipo: 'invocar', aliado: 'guardiao' }] }),
  card({ id: 'ordem', custo: 0, efeitos: [{ tipo: 'comandarAliado' }] }),
  card({
    id: 'vulneravel',
    custo: 0,
    alvo: 'inimigo',
    efeitos: [{ tipo: 'status', status: 'vulneravel', valor: 2, alvo: 'escolhido' }],
  }),
  card({
    id: 'marca',
    custo: 0,
    alvo: 'inimigo',
    efeitos: [{ tipo: 'status', status: 'marca', valor: 3, alvo: 'escolhido' }],
  }),
  card({
    id: 'veneno',
    custo: 0,
    alvo: 'inimigo',
    efeitos: [{ tipo: 'status', status: 'veneno', valor: 3, alvo: 'escolhido' }],
  }),
];

const enemy = (e: Partial<EnemyDef> & Pick<EnemyDef, 'id' | 'acoes' | 'padrao'>): EnemyDef => ({
  nome: e.id,
  vidaMax: 30,
  descricao: '',
  ...e,
});

export const TEST_ENEMIES: EnemyDef[] = [
  enemy({
    id: 'boneco',
    vidaMax: 30,
    acoes: [
      {
        id: 'bater',
        nome: 'Bater',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 6, alvo: 'jogador' }],
      },
    ],
    padrao: { tipo: 'sequencia', ordem: ['bater'] },
  }),
  enemy({
    id: 'passivo',
    vidaMax: 30,
    acoes: [
      {
        id: 'esperar',
        nome: 'Esperar',
        tipos: ['defesa'],
        efeitos: [{ tipo: 'bloqueio', valor: 3, alvo: 'proprio' }],
      },
    ],
    padrao: { tipo: 'sequencia', ordem: ['esperar'] },
  }),
  enemy({
    id: 'ciclico',
    acoes: [
      {
        id: 'a',
        nome: 'A',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 1, alvo: 'jogador' }],
      },
      {
        id: 'b',
        nome: 'B',
        tipos: ['buff'],
        efeitos: [{ tipo: 'status', status: 'forca', valor: 2, alvo: 'proprio' }],
      },
      {
        id: 'c',
        nome: 'C',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 4, alvo: 'jogadorEAliado' }],
      },
    ],
    padrao: { tipo: 'sequencia', ordem: ['a', 'b', 'c'] },
  }),
  enemy({
    id: 'sorteado',
    acoes: [
      {
        id: 'x',
        nome: 'X',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 1, alvo: 'jogador' }],
      },
      {
        id: 'y',
        nome: 'Y',
        tipos: ['defesa'],
        efeitos: [{ tipo: 'bloqueio', valor: 1, alvo: 'proprio' }],
      },
    ],
    padrao: {
      tipo: 'pesos',
      pesos: [
        { acao: 'x', peso: 100 },
        { acao: 'y', peso: 1 },
      ],
      maxRepeticoes: 2,
    },
  }),
  enemy({
    id: 'furioso',
    vidaMax: 40,
    acoes: [
      {
        id: 'bater',
        nome: 'Bater',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 10, alvo: 'jogador' }],
      },
    ],
    padrao: { tipo: 'sequencia', ordem: ['bater'] },
    especiais: [
      {
        id: 'furia',
        gatilho: { tipo: 'vidaAbaixo', fracao: 0.5 },
        efeitos: [{ tipo: 'status', status: 'forca', valor: 2, alvo: 'proprio' }],
        anuncio: 'Fúria!',
      },
    ],
  }),
];

const byId = <T extends { id: string }>(itens: T[]): Record<string, T> =>
  Object.fromEntries(itens.map((i) => [i.id, i]));

export const TEST_CONTENT: CombatContent = {
  cartas: byId(TEST_CARDS),
  inimigos: byId(TEST_ENEMIES),
  aliados: {
    guardiao: {
      id: 'guardiao',
      nome: 'Guardião',
      vidaMax: 10,
      descricao: '',
      quandoInimigoAtaca: {
        id: 'proteger',
        nome: 'Proteger',
        tipos: ['defesa'],
        efeitos: [{ tipo: 'bloqueio', valor: 5, alvo: 'jogador' }],
      },
      casoContrario: {
        id: 'atacar',
        nome: 'Atacar',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 4, alvo: 'inimigoEsquerda' }],
      },
    },
  },
  jogador: { vidaMax: 50, energiaPorTurno: 3, cartasPorTurno: 5, brasaMax: 3, maoMax: 10 },
};

/** Cria um combate de teste com o deck e os inimigos indicados. */
export function setup(deck: string[], inimigos: string[] = ['boneco'], semente = 1): CombatState {
  const encontro: EncounterDef = { id: 'teste', nome: 'Teste', descricao: '', inimigos };
  return startCombat(TEST_CONTENT, encontro, deck, semente).estado;
}

/** Uid da primeira carta da mão com o id informado. */
export function inHand(state: CombatState, defId: string): string {
  const carta = state.mao.find((c) => c.defId === defId);
  if (!carta)
    throw new Error(`Carta ${defId} não está na mão: ${state.mao.map((c) => c.defId).join(', ')}`);
  return carta.uid;
}

export const enemyUid = (state: CombatState, i = 0): string => {
  const inimigo = state.inimigos[i];
  if (!inimigo) throw new Error(`Inimigo ${i} não existe`);
  return inimigo.uid;
};
