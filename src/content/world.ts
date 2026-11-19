/** Números do mundo jogável (mapas em tempo real). */
import type { WorldDef } from '../engine/definitions.ts';

export const MUNDO: WorldDef = {
  tickMs: 50,
  passoMsCacador: 300,
  passoMsMinimo: 160,
  visaoMonstro: 6,
  coleira: 14,
  renascerS: 90,
  raioRevelado: 7,
};
