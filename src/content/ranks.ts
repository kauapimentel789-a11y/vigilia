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
  veu: {
    id: 'veu',
    nome: 'Véu',
    descricao:
      'Aprovado pelo Juiz das Marés. Abre a Catedral Submersa: até os comuns avisam golpes.',
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
  { id: 'seloMares', nome: 'Selo das Marés', descricao: 'Do Juiz do Exame do Véu.' },
  { id: 'seloAbadessa', nome: 'Selo da Abadessa', descricao: 'Do chefe do Véu I.' },
  { id: 'seloHidra', nome: 'Selo da Hidra', descricao: 'Do chefe do Véu II.' },
  { id: 'seloSoberano', nome: 'Selo do Soberano', descricao: 'Do chefe do Véu III.' },
];

export const SELOS: Record<string, SeloDef> = Object.fromEntries(lista.map((s) => [s.id, s]));
