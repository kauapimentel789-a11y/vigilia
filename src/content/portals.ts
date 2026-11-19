/**
 * Portais da região "Periferia Apagada" (rank Cinza).
 * Cada portal abre quando o anterior é fechado pela primeira vez.
 */
import type { PortalDef } from '../engine/definitions.ts';

const lista: PortalDef[] = [
  {
    id: 'cinza1',
    levelRecomendado: 1,
    nome: 'Cinza I',
    rank: 'cinza',
    descricao: 'Carniçais vagando perto da entrada. O caçador vence sozinho.',
    ondas: [['carnical'], ['carnical', 'carnical']],
    escala: { vida: 1, ataque: 1 },
    recompensa: { xp: 12, ouro: 5 },
    primeiraVitoria: { xp: 30, ouro: 20 },
  },
  {
    id: 'cinza2',
    levelRecomendado: 6,
    nome: 'Cinza II',
    rank: 'cinza',
    descricao: 'Bandos de ratos rápidos. Ataques em área ajudam.',
    ondas: [['ratoDeCinza', 'ratoDeCinza', 'ratoDeCinza'], ['carnical', 'ratoDeCinza', 'ratoDeCinza'], ['carnical', 'carnical']],
    escala: { vida: 1.3, ataque: 1.3 },
    recompensa: { xp: 25, ouro: 10 },
    primeiraVitoria: { xp: 75, ouro: 40 },
    requer: 'cinza1',
  },
  {
    id: 'cinza3',
    levelRecomendado: 9,
    nome: 'Cinza III',
    rank: 'cinza',
    descricao: 'Tecelãs envenenam e enfraquecem. Escolha bem o alvo e a cura.',
    ondas: [['tecela', 'carnical'], ['tecela', 'tecela'], ['tecela', 'carnical', 'carnical']],
    escala: { vida: 1.8, ataque: 1.7 },
    recompensa: { xp: 45, ouro: 18 },
    primeiraVitoria: { xp: 135, ouro: 70 },
    requer: 'cinza2',
  },
  {
    id: 'cinza4',
    levelRecomendado: 11,
    nome: 'Cinza IV',
    rank: 'cinza',
    descricao: 'Sentinelas protegem arqueiros. Derrube quem bate forte primeiro.',
    ondas: [['sentinela', 'arqueiro'], ['arqueiro', 'arqueiro', 'carnical'], ['sentinela', 'arqueiro', 'arqueiro']],
    escala: { vida: 2.7, ataque: 2.4 },
    recompensa: { xp: 75, ouro: 30 },
    primeiraVitoria: { xp: 225, ouro: 120 },
    requer: 'cinza3',
  },
  {
    id: 'cinza5',
    levelRecomendado: 16,
    nome: 'Cinza V',
    rank: 'cinza',
    descricao: 'O Cavaleiro Oco guarda o fim da região. Prepare a guarda contra a Execução.',
    ondas: [['carnical', 'tecela'], ['sentinela', 'arqueiro'], ['cavaleiro']],
    escala: { vida: 3, ataque: 2.6 },
    recompensa: { xp: 130, ouro: 50 },
    primeiraVitoria: { xp: 400, ouro: 200 },
    requer: 'cinza4',
    chefe: true,
  },
];

export const PORTAIS: Record<string, PortalDef> = Object.fromEntries(lista.map((p) => [p.id, p]));
export const ORDEM_PORTAIS: string[] = lista.map((p) => p.id);
