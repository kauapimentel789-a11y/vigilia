/**
 * Itens: bases por espaço e faixa, afixos, raridades e o que cai em cada portal.
 * Nomes e números provisórios; o equilíbrio vem do teste de quem joga.
 */
import type { AffixDef, ItemBaseDef, ItemStats, ItemsDef, SlotId } from '../engine/definitions.ts';

function item(
  id: string,
  nome: string,
  slot: SlotId,
  nivel: number,
  stats: ItemStats,
  valor: number,
): ItemBaseDef {
  return { id, nome, slot, nivel, stats, valor };
}

const BASES: ItemBaseDef[] = [
  item('laminaDeCinza', 'Lâmina de Cinza', 'arma', 1, { ataque: 2 }, 6),
  item('machadoDoVigia', 'Machado do Vigia', 'arma', 6, { ataque: 4 }, 14),
  item('espadaDoJuramento', 'Espada do Juramento', 'arma', 11, { ataque: 6 }, 25),
  item('gumeDaVigiliaFunda', 'Gume da Vigília Funda', 'arma', 16, { ataque: 8 }, 40),
  item('capuzDeEstopa', 'Capuz de Estopa', 'cabeca', 1, { vida: 8, reducao: 0.01 }, 6),
  item('elmoDoVigia', 'Elmo do Vigia', 'cabeca', 6, { vida: 16, reducao: 0.015 }, 14),
  item(
    'elmoDeOssosPolidos',
    'Elmo de Ossos Polidos',
    'cabeca',
    11,
    { vida: 24, reducao: 0.02 },
    25,
  ),
  item('coroaDoSentinela', 'Coroa do Sentinela', 'cabeca', 16, { vida: 32, reducao: 0.025 }, 40),
  item('gibaoRemendado', 'Gibão Remendado', 'peito', 1, { vida: 15, reducao: 0.02 }, 6),
  item('cotaDoVigia', 'Cota do Vigia', 'peito', 6, { vida: 30, reducao: 0.03 }, 14),
  item(
    'couracaDeFerroPalido',
    'Couraça de Ferro Pálido',
    'peito',
    11,
    { vida: 45, reducao: 0.04 },
    25,
  ),
  item(
    'peitoralDoJuramento',
    'Peitoral do Juramento',
    'peito',
    16,
    { vida: 60, reducao: 0.05 },
    40,
  ),
  item('luvasDeCouroCru', 'Luvas de Couro Cru', 'maos', 1, { ataque: 1, critico: 0.02 }, 6),
  item('manoplasDoVigia', 'Manoplas do Vigia', 'maos', 6, { ataque: 2, critico: 0.03 }, 14),
  item('garrasDeFerro', 'Garras de Ferro', 'maos', 11, { ataque: 3, critico: 0.04 }, 25),
  item('punhosDaVigilia', 'Punhos da Vigília', 'maos', 16, { ataque: 4, critico: 0.05 }, 40),
  item('botasDeAndarilho', 'Botas de Andarilho', 'pes', 1, { velocidade: 3, vida: 5 }, 6),
  item('grevasDoVigia', 'Grevas do Vigia', 'pes', 6, { velocidade: 5, vida: 10 }, 14),
  item('botasDeCinzaLeve', 'Botas de Cinza Leve', 'pes', 11, { velocidade: 7, vida: 15 }, 25),
  item('passosDoJuramento', 'Passos do Juramento', 'pes', 16, { velocidade: 9, vida: 20 }, 40),
  item('pingenteDeOsso', 'Pingente de Osso', 'amuleto', 1, { poder: 0.03, danoCritico: 0.05 }, 6),
  item('medalhaoDoVigia', 'Medalhão do Vigia', 'amuleto', 6, { poder: 0.06, danoCritico: 0.1 }, 14),
  item('olhoDeAmbar', 'Olho de Âmbar', 'amuleto', 11, { poder: 0.09, danoCritico: 0.15 }, 25),
  item(
    'relicarioDoJuramento',
    'Relicário do Juramento',
    'amuleto',
    16,
    { poder: 0.12, danoCritico: 0.2 },
    40,
  ),
];

const AFIXOS: AffixDef[] = [
  { id: 'forca', nome: 'da Força', stat: 'forca', min: 1, max: 2, porNivel: 0.25 },
  { id: 'agilidade', nome: 'da Agilidade', stat: 'agilidade', min: 1, max: 2, porNivel: 0.25 },
  { id: 'vigor', nome: 'do Vigor', stat: 'vigor', min: 1, max: 2, porNivel: 0.25 },
  { id: 'percepcao', nome: 'da Percepção', stat: 'percepcao', min: 1, max: 2, porNivel: 0.25 },
  { id: 'vontade', nome: 'da Vontade', stat: 'vontade', min: 1, max: 2, porNivel: 0.25 },
  {
    id: 'robustez',
    nome: 'da Robustez',
    stat: 'vida',
    min: 5,
    max: 10,
    porNivel: 1.5,
    slots: ['cabeca', 'peito', 'pes', 'amuleto'],
  },
  {
    id: 'olhoAtento',
    nome: 'do Olho Atento',
    stat: 'critico',
    min: 0.01,
    max: 0.02,
    porNivel: 0.001,
  },
  {
    id: 'pressa',
    nome: 'da Pressa',
    stat: 'velocidade',
    min: 2,
    max: 4,
    porNivel: 0.3,
    slots: ['maos', 'pes', 'amuleto'],
  },
  {
    id: 'sanguessuga',
    nome: 'da Sanguessuga',
    stat: 'rouboVida',
    min: 0.02,
    max: 0.03,
    porNivel: 0.001,
    slots: ['arma', 'amuleto'],
  },
  {
    id: 'peconha',
    nome: 'da Peçonha',
    stat: 'venenoAoAcertar',
    min: 1,
    max: 2,
    porNivel: 0.15,
    slots: ['arma', 'maos'],
  },
];

export const ITENS: ItemsDef = {
  bases: Object.fromEntries(BASES.map((b) => [b.id, b])),
  afixos: Object.fromEntries(AFIXOS.map((a) => [a.id, a])),
  raridades: {
    comum: { peso: 70, multBase: 1, afixos: 0, multValor: 1 },
    incomum: { peso: 25, multBase: 1.1, afixos: 1, multValor: 2 },
    rara: { peso: 5, multBase: 1.2, afixos: 2, multValor: 5 },
  },
  chanceDeSaque: 0.12,
  saquePorPortal: {
    cinza1: [1],
    cinza2: [1, 6],
    cinza3: [6],
    cinza4: [6, 11],
    cinza5: [11, 16],
  },
  capacidadeMochila: 20,
  capacidadeBau: 60,
  expedicao: { fator: 0.5, maximo: 15 },
  pocao: { preco: 12, curaPct: 0.3, recargaS: 10, maximo: 10 },
};
