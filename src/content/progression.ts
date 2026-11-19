/**
 * Números de progressão: curva de XP, atributos, custos e regras de tempo.
 * Ajuste aqui para mudar o ritmo do jogo sem tocar nas regras.
 */
import type { ProgressionDef } from '../engine/definitions.ts';

export const PROGRESSAO: ProgressionDef = {
  levelMax: 30,
  xpBase: 20,
  xpExpoente: 1.6,
  pontosPorLevel: 3,
  atributoInicial: 5,
  stats: {
    vidaBase: 80,
    vidaPorLevel: 4,
    vidaPorVigor: 8,
    ataqueBase: 8,
    ataquePorLevel: 0.6,
    ataquePorForca: 1,
    danoPctPorForca: 0.02,
    velocidadeBase: 100,
    velocidadePctPorAgilidade: 0.015,
    velocidadeBonusMax: 0.75,
    reducaoPorVigor: 0.005,
    reducaoMax: 0.3,
    criticoBase: 0.05,
    criticoPorPercepcao: 0.01,
    criticoMax: 0.5,
    danoCriticoBase: 1.5,
    danoCriticoPorPercepcao: 0.01,
    poderPorVontade: 0.02,
    recargaPorVontade: 0.01,
    recargaReducaoMax: 0.3,
  },
  espacosDeHabilidade: 4,
  habilidadeNivelMax: 5,
  escalaPorNivelDeHabilidade: 0.15,
  custoMelhoriaBase: 50,
  ataqueBasico: { nome: 'Golpe', mult: 1 },
  combate: {
    tickMs: 100,
    cargaParaAgir: 1000,
    limiteS: 90,
    decaimentoBloqueio: 0.2,
  },
  expedicao: {
    lutasAmostra: 20,
    pausaEntreLutasS: 3,
    tetoHoras: 8,
  },
  xpAcimaDoRecomendado: { tolerancia: 1, quedaPorLevel: 0.25, minimo: 0.1 },
};
