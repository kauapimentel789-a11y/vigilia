/**
 * Encontros de teste do protótipo e montagem do conteúdo para o motor.
 */
import type { CombatContent, EncounterDef } from '../engine/combat/index.ts';
import { CARDS } from './cards.ts';
import { ALLIES, ENEMIES } from './units.ts';

export { TEST_DECK } from './cards.ts';

export const ENCOUNTERS: EncounterDef[] = [
  {
    id: 'cacada',
    nome: 'Caçada',
    descricao: 'Um Carniçal Faminto. Aprenda o básico: ler intenções, atacar e defender.',
    inimigos: ['carnical-faminto'],
  },
  {
    id: 'ninho',
    nome: 'Ninho',
    descricao: 'Carniçal Faminto e Tecelã Pálida. Escolha bem quem atacar primeiro.',
    inimigos: ['carnical-faminto', 'tecela-palida'],
  },
  {
    id: 'guardiao',
    nome: 'Guardião',
    descricao: 'O Cavaleiro Oco. Planeje para sobreviver à Execução.',
    inimigos: ['cavaleiro-oco'],
  },
];

const byId = <T extends { id: string }>(itens: T[]): Record<string, T> =>
  Object.fromEntries(itens.map((i) => [i.id, i]));

export const CONTENT: CombatContent = {
  cartas: byId(CARDS),
  inimigos: byId(ENEMIES),
  aliados: byId(ALLIES),
  jogador: { vidaMax: 50, energiaPorTurno: 3, cartasPorTurno: 5, brasaMax: 3, maoMax: 10 },
};

export function getEncounter(id: string): EncounterDef {
  const encontro = ENCOUNTERS.find((e) => e.id === id);
  if (!encontro) throw new Error(`Encontro desconhecido: ${id}`);
  return encontro;
}
