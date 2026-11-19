import type { MapDef } from '../../engine/definitions.ts';
import { BRASA1 } from './brasa1.ts';
import { BRASA2 } from './brasa2.ts';
import { BRASA3 } from './brasa3.ts';
import { BRASA4 } from './brasa4.ts';
import { BRASA5 } from './brasa5.ts';
import { CINZA1 } from './cinza1.ts';
import { CINZA2 } from './cinza2.ts';
import { CINZA3 } from './cinza3.ts';
import { CINZA4 } from './cinza4.ts';
import { CINZA5 } from './cinza5.ts';
import { EXAME_BRASA } from './exameBrasa.ts';
import { POSTO } from './posto.ts';

export const MAPAS: Record<string, MapDef> = Object.fromEntries(
  [
    POSTO,
    CINZA1,
    CINZA2,
    CINZA3,
    CINZA4,
    CINZA5,
    EXAME_BRASA,
    BRASA1,
    BRASA2,
    BRASA3,
    BRASA4,
    BRASA5,
  ].map((m) => [m.id, m]),
);
