import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/engine/core/index.ts';
import { simulatePortal } from '../../../src/engine/autobattle/simulate.ts';
import { CONTEUDO } from '../../../src/content/index.ts';
import { buildProfile } from '../../../src/engine/hunter/stats.ts';
import { createHunter, gainXp } from '../../../src/engine/hunter/hunter.ts';

describe('determinismo', () => {
  it('100 lutas aleatórias se repetem evento por evento com a mesma semente', () => {
    const rng = createRng(2026);
    for (let i = 0; i < 100; i++) {
      const portal = CONTEUDO.portais[rng.pick(CONTEUDO.ordemPortais)]!;
      const cacador = gainXp(createHunter(CONTEUDO), CONTEUDO, rng.int(0, 20000)).cacador;
      const perfil = buildProfile(cacador, CONTEUDO);
      const semente = rng.int(0, 2 ** 31);
      const a = simulatePortal({ perfil, portal, content: CONTEUDO, semente, registrar: true });
      const b = simulatePortal({ perfil, portal, content: CONTEUDO, semente, registrar: true });
      expect(b.eventos).toEqual(a.eventos);
      expect(b.resultado).toBe(a.resultado);
      // Com o registro desligado (Expedição), o resultado é o mesmo.
      const c = simulatePortal({ perfil, portal, content: CONTEUDO, semente });
      expect(c.resultado).toBe(a.resultado);
      expect(c.duracaoMs).toBe(a.duracaoMs);
      expect(c.eventos).toEqual([]);
    }
  });
});
