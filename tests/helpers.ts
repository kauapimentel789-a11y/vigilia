/**
 * Conteúdo pequeno e previsível para os testes do motor.
 * Usa a progressão e as habilidades reais, com inimigos e portais de teste.
 */
import { HABILIDADES } from '../src/content/abilities.ts';
import { PROGRESSAO } from '../src/content/progression.ts';
import { MUNDO } from '../src/content/world.ts';
import type { EnemyDef, GameContent, PortalDef } from '../src/engine/definitions.ts';
import type { HunterProfile } from '../src/engine/hunter/stats.ts';
import { buildProfile } from '../src/engine/hunter/stats.ts';
import type { HunterState } from '../src/engine/hunter/hunter.ts';
import { createHunter } from '../src/engine/hunter/hunter.ts';

const inimigos: EnemyDef[] = [
  {
    id: 'boneco',
    nome: 'Boneco',
    descricao: 'Não faz nada.',
    xp: 5,
    ouro: 1,
    vidaMax: 100,
    ataque: 0,
    velocidade: 50,
    padrao: 'ciclo',
    acoes: [{ id: 'nada', nome: 'Nada', efeitos: [] }],
  },
  {
    id: 'brutamontes',
    nome: 'Brutamontes',
    descricao: 'Bate forte a cada duas ações.',
    xp: 5,
    ouro: 1,
    vidaMax: 400,
    ataque: 10,
    velocidade: 100,
    padrao: 'ciclo',
    acoes: [
      { id: 'soco', nome: 'Soco', efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }] },
      {
        id: 'esmagar',
        nome: 'Esmagar',
        forte: true,
        efeitos: [{ tipo: 'dano', mult: 3, alvo: 'alvo' }],
      },
    ],
  },
  {
    id: 'aleatorio',
    nome: 'Aleatório',
    descricao: 'Sorteia ações.',
    xp: 5,
    ouro: 1,
    vidaMax: 60,
    ataque: 5,
    velocidade: 120,
    padrao: 'aleatorio',
    acoes: [
      { id: 'a', nome: 'A', peso: 2, efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }] },
      {
        id: 'b',
        nome: 'B',
        efeitos: [{ tipo: 'status', status: 'veneno', valor: 2, alvo: 'alvo' }],
      },
    ],
    especial: {
      abaixoDe: 0.5,
      anuncio: 'Fúria',
      efeitos: [{ tipo: 'status', status: 'forca', valor: 2, alvo: 'proprio' }],
    },
  },
  {
    id: 'imortal',
    nome: 'Imortal',
    descricao: 'Vida enorme, nunca morre a tempo.',
    xp: 5,
    ouro: 1,
    vidaMax: 1_000_000,
    ataque: 0,
    velocidade: 10,
    padrao: 'ciclo',
    acoes: [{ id: 'nada', nome: 'Nada', efeitos: [] }],
  },
];

const portal = (id: string, ondas: string[][], requer?: string): PortalDef => ({
  id,
  nome: id,
  rank: 'cinza',
  descricao: '',
  levelRecomendado: 20,
  ondas,
  escala: { vida: 1, ataque: 1 },
  recompensa: { xp: 10, ouro: 4 },
  primeiraVitoria: { xp: 20, ouro: 10 },
  ...(requer ? { requer } : {}),
});

const portais = [
  portal('treino', [['boneco']]),
  portal('ondas', [['boneco'], ['boneco', 'boneco']], 'treino'),
  portal('bruto', [['brutamontes']], 'ondas'),
  portal('caos', [['aleatorio', 'aleatorio'], ['brutamontes']]),
  portal('eterno', [['imortal']]),
];

export const TEST_CONTENT: GameContent = {
  progressao: PROGRESSAO,
  habilidades: HABILIDADES,
  inimigos: Object.fromEntries(inimigos.map((i) => [i.id, i])),
  portais: Object.fromEntries(portais.map((p) => [p.id, p])),
  ordemPortais: portais.map((p) => p.id),
  mundo: MUNDO,
  mapas: {
    base: {
      id: 'base',
      nome: 'Base',
      tipo: 'posto',
      linhas: ['#######', '#@...1#', '#######'],
      legenda: { portoes: { '1': { destino: 'arena', rotulo: 'Arena' } } },
    },
    arena: {
      id: 'arena',
      nome: 'Arena',
      tipo: 'portal',
      portal: 'treino',
      linhas: ['##########', '#E@......#', '#........#', '#......b.#', '#........#', '##########'],
      legenda: {
        monstros: { b: 'brutamontes' },
        portoes: { E: { destino: 'base', rotulo: 'Base' } },
      },
    },
    grupo: {
      id: 'grupo',
      nome: 'Grupo',
      tipo: 'portal',
      linhas: ['############', '#@.....b.#b#', '############'],
      legenda: { monstros: { b: 'brutamontes' } },
    },
  },
  mapaInicial: 'base',
};

export function hunter(mods: Partial<HunterState> = {}): HunterState {
  return { ...createHunter(TEST_CONTENT), ...mods };
}

export function profile(mods: Partial<HunterState> = {}): HunterProfile {
  return buildProfile(hunter(mods), TEST_CONTENT);
}
