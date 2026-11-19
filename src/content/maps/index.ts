import type { MapDef } from '../../engine/definitions.ts';
import { CINZA1 } from './cinza1.ts';
import { POSTO } from './posto.ts';

export const MAPAS: Record<string, MapDef> = Object.fromEntries(
  [POSTO, CINZA1].map((m) => [m.id, m]),
);
