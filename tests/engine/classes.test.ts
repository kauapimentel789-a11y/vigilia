import { describe, expect, it } from 'vitest';
import { CONTEUDO as C } from '../../src/content/index.ts';
import { chooseClass, createHunter, gainXp } from '../../src/engine/hunter/hunter.ts';
import { isUnlocked, setEquipped } from '../../src/engine/hunter/abilities.ts';
import { buildProfile, deriveStats } from '../../src/engine/hunter/stats.ts';

describe('classes', () => {
  it('caçador novo é Vigia, com alcance 1', () => {
    const c = createHunter(C);
    expect(c.classe).toBe('vigia');
    expect(deriveStats(c, C).alcance).toBe(1);
  });

  it('a classe muda os números e o alcance', () => {
    const base = createHunter(C);
    const guardiao = chooseClass(base, C, 'guardiao').cacador!;
    const arcanista = chooseClass(base, C, 'arcanista').cacador!;
    expect(deriveStats(guardiao, C).vidaMax).toBeGreaterThan(deriveStats(base, C).vidaMax);
    expect(deriveStats(arcanista, C).alcance).toBe(3);
    expect(deriveStats(arcanista, C).poder).toBeGreaterThan(deriveStats(base, C).poder);
  });

  it('habilidade exclusiva só vale para a própria classe', () => {
    const base = gainXp(createHunter(C), C, 1_000_000).cacador;
    const seta = C.habilidades.setaArcana!;
    expect(isUnlocked(base, seta)).toBe(false);
    expect(setEquipped(base, C, ['setaArcana']).erro).toMatch(/outra classe/);
    const arc = chooseClass(base, C, 'arcanista').cacador!;
    expect(isUnlocked(arc, seta)).toBe(true);
    expect(arc.equipadas).toContain('setaArcana');
    expect(arc.equipadas.length).toBeLessThanOrEqual(C.progressao.espacosDeHabilidade);
  });

  it('trocar de classe tira as exclusivas da classe antiga', () => {
    const base = gainXp(createHunter(C), C, 1_000_000).cacador;
    const lamina = chooseClass(base, C, 'lamina').cacador!;
    const vigia = chooseClass(lamina, C, 'vigia').cacador!;
    for (const id of vigia.equipadas) expect(C.habilidades[id]!.classe ?? 'vigia').toBe('vigia');
    expect(
      buildProfile(vigia, C).habilidades.every((h) => !h.def.classe || h.def.classe === 'vigia'),
    ).toBe(true);
  });
});
