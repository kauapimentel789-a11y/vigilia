import type { MapDef } from '../../engine/definitions.ts';
import { CINZA1 } from './cinza1.ts';
import { CINZA2 } from './cinza2.ts';
import { CINZA3 } from './cinza3.ts';
import { CINZA4 } from './cinza4.ts';
import { CINZA5 } from './cinza5.ts';
import { POSTO } from './posto.ts';

export const MAPAS: Record<string, MapDef> = Object.fromEntries(
  [POSTO, CINZA1, CINZA2, CINZA3, CINZA4, CINZA5].map((m) => [m.id, m]),
);
