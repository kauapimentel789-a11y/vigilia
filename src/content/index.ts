import type { GameContent } from '../engine/definitions.ts';
import { HABILIDADES } from './abilities.ts';
import { ARENA } from './arena.ts';
import { CLASSES } from './classes.ts';
import { INIMIGOS } from './enemies.ts';
import { ITENS } from './items.ts';
import { ORDEM_PORTAIS, PORTAIS } from './portals.ts';
import { MAPAS } from './maps/index.ts';
import { PROGRESSAO } from './progression.ts';
import { RANKS, SELOS } from './ranks.ts';
import { MUNDO } from './world.ts';

/** Todo o conteúdo do jogo, no formato que o motor recebe. */
export const CONTEUDO: GameContent = {
  progressao: PROGRESSAO,
  classes: CLASSES,
  habilidades: HABILIDADES,
  inimigos: INIMIGOS,
  portais: PORTAIS,
  ordemPortais: ORDEM_PORTAIS,
  mundo: MUNDO,
  mapas: MAPAS,
  itens: ITENS,
  ranks: RANKS,
  selos: SELOS,
  arena: ARENA,
  mapaInicial: 'posto',
};
