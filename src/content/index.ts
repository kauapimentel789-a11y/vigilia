import type { GameContent } from '../engine/definitions.ts';
import { HABILIDADES } from './abilities.ts';
import { INIMIGOS } from './enemies.ts';
import { ORDEM_PORTAIS, PORTAIS } from './portals.ts';
import { PROGRESSAO } from './progression.ts';

/** Todo o conteúdo do jogo, no formato que o motor recebe. */
export const CONTEUDO: GameContent = {
  progressao: PROGRESSAO,
  habilidades: HABILIDADES,
  inimigos: INIMIGOS,
  portais: PORTAIS,
  ordemPortais: ORDEM_PORTAIS,
};
