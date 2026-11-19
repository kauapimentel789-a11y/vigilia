/**
 * Inimigos. Vida e ataque são os valores base: cada portal aplica a sua escala.
 * Velocidade 100 = uma ação por segundo.
 */
import type { EnemyDef } from '../engine/definitions.ts';

const lista: EnemyDef[] = [
  {
    id: 'carnical',
    nome: 'Carniçal Faminto',
    descricao: 'Lento e insistente. A cada três ataques, rasga com força.',
    vidaMax: 60,
    ataque: 6,
    velocidade: 80,
    padrao: 'ciclo',
    acoes: [
      { id: 'morder', nome: 'Morder', efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }] },
      { id: 'morder2', nome: 'Morder', efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }] },
      { id: 'rasgar', nome: 'Rasgar', efeitos: [{ tipo: 'dano', mult: 1.6, alvo: 'alvo' }] },
    ],
  },
  {
    id: 'ratoDeCinza',
    nome: 'Rato de Cinza',
    descricao: 'Pouca vida, muito rápido. Vem em bando.',
    vidaMax: 24,
    ataque: 3,
    velocidade: 160,
    padrao: 'ciclo',
    acoes: [
      { id: 'mordiscar', nome: 'Mordiscar', efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }] },
    ],
  },
  {
    id: 'tecela',
    nome: 'Tecelã Pálida',
    descricao: 'Envenena e enfraquece. Mate-a antes que o veneno acumule.',
    vidaMax: 50,
    ataque: 4,
    velocidade: 70,
    padrao: 'ciclo',
    acoes: [
      {
        id: 'picada',
        nome: 'Picada',
        efeitos: [
          { tipo: 'dano', mult: 1, alvo: 'alvo' },
          { tipo: 'status', status: 'veneno', valor: 3, alvo: 'alvo' },
        ],
      },
      {
        id: 'teia',
        nome: 'Teia',
        efeitos: [{ tipo: 'status', status: 'fraco', valor: 4, alvo: 'alvo' }],
      },
    ],
  },
  {
    id: 'sentinela',
    nome: 'Sentinela de Osso',
    descricao: 'Protege o aliado mais ferido com bloqueio. Sozinha, só golpeia.',
    vidaMax: 80,
    ataque: 4,
    velocidade: 60,
    padrao: 'ciclo',
    acoes: [
      {
        id: 'proteger',
        nome: 'Proteger',
        requerAliados: true,
        efeitos: [{ tipo: 'bloqueio', valor: 14, alvo: 'aliadoMaisFerido' }],
      },
      {
        id: 'golpeDeOsso',
        nome: 'Golpe de Osso',
        efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }],
      },
    ],
  },
  {
    id: 'arqueiro',
    nome: 'Arqueiro Oco',
    descricao: 'Fica atrás e mira. O Tiro Certeiro dói muito.',
    vidaMax: 34,
    ataque: 8,
    velocidade: 70,
    padrao: 'ciclo',
    acoes: [
      { id: 'flecha', nome: 'Flecha', efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }] },
      { id: 'flecha2', nome: 'Flecha', efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }] },
      {
        id: 'tiroCerteiro',
        nome: 'Tiro Certeiro',
        forte: true,
        efeitos: [{ tipo: 'dano', mult: 2.4, alvo: 'alvo' }],
      },
    ],
  },
  {
    id: 'cavaleiro',
    nome: 'Cavaleiro Oco',
    descricao:
      'Mini-chefe. Anuncia a Execução antes de usá-la. Abaixo de 50% de vida, entra em fúria.',
    vidaMax: 520,
    ataque: 10,
    velocidade: 55,
    padrao: 'ciclo',
    acoes: [
      {
        id: 'golpePesado',
        nome: 'Golpe Pesado',
        efeitos: [{ tipo: 'dano', mult: 1.4, alvo: 'alvo' }],
      },
      { id: 'varredura', nome: 'Varredura', efeitos: [{ tipo: 'dano', mult: 1, alvo: 'alvo' }] },
      {
        id: 'execucao',
        nome: 'Execução',
        forte: true,
        efeitos: [{ tipo: 'dano', mult: 3.2, alvo: 'alvo' }],
      },
    ],
    especial: {
      abaixoDe: 0.5,
      anuncio: 'O Cavaleiro Oco entra em fúria! (+4 de Força)',
      efeitos: [{ tipo: 'status', status: 'forca', valor: 4, alvo: 'proprio' }],
    },
  },
];

export const INIMIGOS: Record<string, EnemyDef> = Object.fromEntries(lista.map((i) => [i.id, i]));
