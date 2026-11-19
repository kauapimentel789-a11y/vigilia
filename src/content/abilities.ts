/**
 * Habilidades do caçador. Para criar uma nova, adicione uma entrada aqui:
 * os efeitos usam o sistema de efeitos do motor (dano, bloqueio, cura, status...).
 */
import type { AbilityDef } from '../engine/definitions.ts';

const lista: AbilityDef[] = [
  {
    id: 'corteRapido',
    nome: 'Corte Rápido',
    descricao: 'Um corte veloz: 120% do ataque no alvo.',
    categoria: 'ataque',
    desbloqueio: 1,
    recarga: 3,
    efeitos: [{ tipo: 'dano', mult: 1.2, alvo: 'alvo' }],
  },
  {
    id: 'guardaCinzenta',
    nome: 'Guarda Cinzenta',
    descricao: 'Ergue a guarda: bloqueio igual a 30% da vida máxima.',
    categoria: 'defesa',
    desbloqueio: 1,
    recarga: 8,
    efeitos: [{ tipo: 'bloqueio', pctVidaMax: 0.3, alvo: 'proprio' }],
  },
  {
    id: 'laminaVenenosa',
    nome: 'Lâmina Venenosa',
    descricao: '80% do ataque e 4 de Veneno no alvo.',
    categoria: 'ataque',
    desbloqueio: 3,
    recarga: 6,
    efeitos: [
      { tipo: 'dano', mult: 0.8, alvo: 'alvo' },
      { tipo: 'status', status: 'veneno', valor: 4, alvo: 'alvo' },
    ],
  },
  {
    id: 'golpeRasgante',
    nome: 'Golpe Rasgante',
    descricao: '90% do ataque em todos os inimigos.',
    categoria: 'ataque',
    desbloqueio: 6,
    recarga: 10,
    efeitos: [{ tipo: 'dano', mult: 0.9, alvo: 'inimigos' }],
  },
  {
    id: 'folegoDaVigilia',
    nome: 'Fôlego da Vigília',
    descricao: 'Cura 25% da vida máxima e remove Fraco.',
    categoria: 'cura',
    desbloqueio: 10,
    recarga: 14,
    efeitos: [
      { tipo: 'cura', pctVidaMax: 0.25, alvo: 'proprio' },
      { tipo: 'limpar', status: 'fraco', alvo: 'proprio' },
    ],
  },
  {
    id: 'marcaDoCacador',
    nome: 'Marca do Caçador',
    descricao: 'Deixa o alvo Vulnerável por 4 s e causa 150% do ataque.',
    categoria: 'ataque',
    desbloqueio: 15,
    recarga: 12,
    efeitos: [
      { tipo: 'status', status: 'vulneravel', valor: 4, alvo: 'alvo' },
      { tipo: 'dano', mult: 1.5, alvo: 'alvo' },
    ],
  },
];

export const HABILIDADES: Record<string, AbilityDef> = Object.fromEntries(
  lista.map((h) => [h.id, h]),
);
