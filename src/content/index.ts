import type { GameContent } from '../engine/definitions.ts';
import { HABILIDADES } from './abilities.ts';
import { INIMIGOS } from './enemies.ts';
import { ORDEM_PORTAIS, PORTAIS } from './portals.ts';
import { MAPAS } from './maps/index.ts';
import { PROGRESSAO } from './progression.ts';
import { MUNDO } from './world.ts';

/** Todo o conteúdo do jogo, no formato que o motor recebe. */
export const CONTEUDO: GameContent = {
  progressao: PROGRESSAO,
  habilidades: HABILIDADES,
  inimigos: INIMIGOS,
  portais: PORTAIS,
  ordemPortais: ORDEM_PORTAIS,
  mundo: MUNDO,
  mapas: MAPAS,
  mapaInicial: 'posto',
};
