/**
 * Inimigos e aliado do protótipo (Etapa 1).
 */
import type { AllyDef, EnemyDef } from '../engine/combat/index.ts';

export const ENEMIES: EnemyDef[] = [
  {
    id: 'carnical-faminto',
    nome: 'Carniçal Faminto',
    vidaMax: 38,
    descricao: 'Morde duas vezes e então uiva, ficando mais forte a cada ciclo.',
    acoes: [
      {
        id: 'morder',
        nome: 'Morder',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 8, alvo: 'jogador' }],
      },
      {
        id: 'uivo',
        nome: 'Uivo',
        tipos: ['buff'],
        efeitos: [{ tipo: 'status', status: 'forca', valor: 2, alvo: 'proprio' }],
      },
    ],
    padrao: { tipo: 'sequencia', ordem: ['morder', 'morder', 'uivo'] },
  },
  {
    id: 'tecela-palida',
    nome: 'Tecelã Pálida',
    vidaMax: 30,
    descricao: 'Envenena, enfraquece e se esconde num casulo.',
    acoes: [
      {
        id: 'picada',
        nome: 'Picada',
        tipos: ['ataque', 'debuff'],
        efeitos: [
          { tipo: 'dano', valor: 5, alvo: 'jogador' },
          { tipo: 'status', status: 'veneno', valor: 2, alvo: 'jogador' },
        ],
      },
      {
        id: 'teia',
        nome: 'Teia',
        tipos: ['debuff'],
        efeitos: [{ tipo: 'status', status: 'fraco', valor: 2, alvo: 'jogador' }],
      },
      {
        id: 'casulo',
        nome: 'Casulo',
        tipos: ['defesa'],
        efeitos: [{ tipo: 'bloqueio', valor: 8, alvo: 'proprio' }],
      },
    ],
    padrao: {
      tipo: 'pesos',
      pesos: [
        { acao: 'picada', peso: 2 },
        { acao: 'teia', peso: 1 },
        { acao: 'casulo', peso: 1 },
      ],
      maxRepeticoes: 2,
    },
  },
  {
    id: 'cavaleiro-oco',
    nome: 'Cavaleiro Oco',
    vidaMax: 80,
    descricao:
      'Prepara uma Execução devastadora a cada quatro turnos. Abaixo de 50% de vida, fica mais forte.',
    acoes: [
      {
        id: 'golpe-pesado',
        nome: 'Golpe Pesado',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 11, alvo: 'jogador' }],
      },
      {
        id: 'varredura',
        nome: 'Varredura',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 6, alvo: 'jogadorEAliado' }],
      },
      {
        id: 'preparar-execucao',
        nome: 'Preparar Execução',
        tipos: ['defesa', 'preparar'],
        efeitos: [{ tipo: 'bloqueio', valor: 10, alvo: 'proprio' }],
        aviso: 'Próximo turno: Execução',
      },
      {
        id: 'execucao',
        nome: 'Execução',
        tipos: ['ataque'],
        efeitos: [{ tipo: 'dano', valor: 24, alvo: 'jogador' }],
      },
    ],
    padrao: {
      tipo: 'sequencia',
      ordem: ['golpe-pesado', 'varredura', 'preparar-execucao', 'execucao'],
    },
    especiais: [
      {
        id: 'furia',
        gatilho: { tipo: 'vidaAbaixo', fracao: 0.5 },
        efeitos: [{ tipo: 'status', status: 'forca', valor: 2, alvo: 'proprio' }],
        anuncio: 'O Cavaleiro Oco se enfurece: +2 de Força!',
      },
    ],
  },
];

export const ALLIES: AllyDef[] = [
  {
    id: 'sentinela-ossuda',
    nome: 'Sentinela Ossuda',
    vidaMax: 14,
    descricao: 'Protege você quando um inimigo vai atacar. Caso contrário, ataca.',
    quandoInimigoAtaca: {
      id: 'proteger',
      nome: 'Proteger',
      tipos: ['defesa'],
      efeitos: [{ tipo: 'bloqueio', valor: 5, alvo: 'jogador' }],
    },
    casoContrario: {
      id: 'golpe-de-osso',
      nome: 'Golpe de Osso',
      tipos: ['ataque'],
      efeitos: [{ tipo: 'dano', valor: 4, alvo: 'inimigoEsquerda' }],
    },
  },
];
