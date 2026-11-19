/**
 * Classes do caçador. A escolha é livre e pode ser trocada no Caçador a
 * qualquer momento: muda os números, o alcance do ataque e as habilidades
 * exclusivas (em abilities.ts, com `classe`).
 */
import type { ClasseDef, ClasseId } from '../engine/definitions.ts';

export const CLASSES: Record<ClasseId, ClasseDef> = {
  vigia: {
    id: 'vigia',
    nome: 'Vigia',
    papel: 'Equilibrado',
    descricao: 'Espada e coragem. Sem pontos fracos, bom para aprender.',
    alcance: 1,
    mult: { vida: 1, ataque: 1, velocidade: 1 },
    bonus: { critico: 0, reducao: 0, poder: 0 },
  },
  guardiao: {
    id: 'guardiao',
    nome: 'Guardião',
    papel: 'Tanque',
    descricao: 'Muita vida e armadura. Bate devagar, mas quase não cai.',
    alcance: 1,
    mult: { vida: 1.35, ataque: 0.85, velocidade: 0.95 },
    bonus: { critico: 0, reducao: 0.08, poder: 0.05 },
  },
  arcanista: {
    id: 'arcanista',
    nome: 'Arcanista',
    papel: 'Magia à distância',
    descricao: 'Ataca de 3 tiles e tem habilidades fortes. Pouca vida.',
    alcance: 3,
    mult: { vida: 0.8, ataque: 0.9, velocidade: 1 },
    bonus: { critico: 0, reducao: 0, poder: 0.35 },
  },
  lamina: {
    id: 'lamina',
    nome: 'Lâmina Sombria',
    papel: 'Assassina',
    descricao: 'Rápida e certeira: críticos frequentes e venenos.',
    alcance: 1,
    mult: { vida: 0.9, ataque: 1.08, velocidade: 1.12 },
    bonus: { critico: 0.1, reducao: 0, poder: 0 },
  },
  atiradora: {
    id: 'atiradora',
    nome: 'Atiradora',
    papel: 'Arco à distância',
    descricao: 'Acerta de 4 tiles. Mantenha distância e cubra a área de flechas.',
    alcance: 4,
    mult: { vida: 0.85, ataque: 0.95, velocidade: 1.05 },
    bonus: { critico: 0.05, reducao: 0, poder: 0.1 },
  },
};
