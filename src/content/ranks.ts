/**
 * Ranks do caçador e Selos dos chefes.
 * O caçador sobe de rank vencendo o Exame de Rank (um portal com `promove`).
 */
import type { RankDef, RankId, SeloDef } from '../engine/definitions.ts';

export const RANKS: Record<RankId, RankDef> = {
  cinza: {
    id: 'cinza',
    nome: 'Cinza',
    descricao: 'O rank mais baixo. Portais da Periferia Apagada.',
  },
  brasa: {
    id: 'brasa',
    nome: 'Brasa',
    descricao: 'Aprovado no Exame. Abre as Forjas Caídas, onde os chefes têm mecânicas.',
  },
};

const lista: SeloDef[] = [
  { id: 'seloCarnical', nome: 'Selo do Carniçal', descricao: 'Do chefe da Cinza I.' },
  { id: 'seloRato', nome: 'Selo do Rato-Rei', descricao: 'Do chefe da Cinza II.' },
  { id: 'seloTecela', nome: 'Selo da Tecelã', descricao: 'Do chefe da Cinza III.' },
  { id: 'seloSentinela', nome: 'Selo da Sentinela', descricao: 'Do chefe da Cinza IV.' },
  { id: 'seloCavaleiro', nome: 'Selo do Cavaleiro Oco', descricao: 'Do chefe da Cinza V.' },
  { id: 'seloLimiar', nome: 'Selo do Limiar', descricao: 'Da Guardiã do Exame de Rank.' },
  { id: 'seloMatilheiro', nome: 'Selo do Matilheiro', descricao: 'Do chefe da Brasa I.' },
  { id: 'seloForjadora', nome: 'Selo da Forjadora', descricao: 'Do chefe da Brasa II.' },
  { id: 'seloCaldeira', nome: 'Selo da Caldeira', descricao: 'Do chefe da Brasa III.' },
  { id: 'seloColosso', nome: 'Selo do Colosso', descricao: 'Do chefe da Brasa IV.' },
  { id: 'seloArauto', nome: 'Selo do Arauto', descricao: 'Do chefe da Brasa V.' },
];

export const SELOS: Record<string, SeloDef> = Object.fromEntries(lista.map((s) => [s.id, s]));
