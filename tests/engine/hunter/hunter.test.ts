import { describe, expect, it } from 'vitest';
import {
  changeAttribute,
  gainXp,
  resetAttributes,
  xpParaProximo,
} from '../../../src/engine/hunter/hunter.ts';
import { setEquipped, upgradeAbility, upgradeCost } from '../../../src/engine/hunter/abilities.ts';
import { buildProfile, deriveStats } from '../../../src/engine/hunter/stats.ts';
import { TEST_CONTENT as C, hunter } from '../../helpers.ts';

const P = C.progressao;

describe('level e XP', () => {
  it('segue a curva round(xpBase × n^expoente)', () => {
    expect(xpParaProximo(P, 1)).toBe(Math.round(P.xpBase));
    expect(xpParaProximo(P, 10)).toBe(Math.round(P.xpBase * Math.pow(10, P.xpExpoente)));
  });

  it('sobe vários levels de uma vez e dá pontos por level', () => {
    const xp = xpParaProximo(P, 1) + xpParaProximo(P, 2) + xpParaProximo(P, 3) + 5;
    const r = gainXp(hunter(), C, xp);
    expect(r.levelsGanhos).toBe(3);
    expect(r.cacador.level).toBe(4);
    expect(r.cacador.xp).toBe(5);
    expect(r.cacador.pontosLivres).toBe(3 * P.pontosPorLevel);
  });

  it('para no level máximo e zera o XP', () => {
    const r = gainXp(hunter(), C, 1e9);
    expect(r.cacador.level).toBe(P.levelMax);
    expect(r.cacador.xp).toBe(0);
    expect(gainXp(r.cacador, C, 1000).levelsGanhos).toBe(0);
  });

  it('equipa sozinho a habilidade desbloqueada se houver espaço', () => {
    const r = gainXp(hunter(), C, xpParaProximo(P, 1) + xpParaProximo(P, 2));
    expect(r.cacador.level).toBe(3);
    expect(r.cacador.equipadas).toContain('laminaVenenosa');
  });

  it('não altera o estado recebido', () => {
    const h = hunter();
    const copia = structuredClone(h);
    gainXp(h, C, 500);
    expect(h).toEqual(copia);
  });
});

describe('atributos', () => {
  it('gasta e devolve pontos, sem passar do valor inicial', () => {
    const h = hunter({ pontosLivres: 2 });
    const r = changeAttribute(h, C, 'forca', 2);
    expect(r.cacador?.atributos.forca).toBe(P.atributoInicial + 2);
    expect(r.cacador?.pontosLivres).toBe(0);
    expect(changeAttribute(h, C, 'forca', 3).erro).toBeDefined();
    expect(changeAttribute(h, C, 'vigor', -1).erro).toBeDefined();
  });

  it('redistribuir devolve todos os pontos', () => {
    const h = hunter({ pontosLivres: 0, atributos: { forca: 9, agilidade: 5, vigor: 7, percepcao: 5, vontade: 5 } });
    const r = resetAttributes(h, C);
    expect(r.pontosLivres).toBe(6);
    expect(Object.values(r.atributos).every((v) => v === P.atributoInicial)).toBe(true);
  });
});

describe('números derivados', () => {
  it('Vigor aumenta vida e redução; Agilidade aumenta velocidade', () => {
    const base = deriveStats(hunter(), C);
    const forte = deriveStats(hunter({ atributos: { forca: 5, agilidade: 15, vigor: 15, percepcao: 5, vontade: 5 } }), C);
    expect(forte.vidaMax - base.vidaMax).toBe(10 * P.stats.vidaPorVigor);
    expect(forte.velocidade).toBeGreaterThan(base.velocidade);
    expect(forte.reducao).toBeGreaterThan(base.reducao);
  });

  it('respeita os tetos de velocidade, crítico, redução e recarga', () => {
    const s = deriveStats(hunter({ atributos: { forca: 5, agilidade: 999, vigor: 999, percepcao: 999, vontade: 999 } }), C);
    expect(s.velocidade).toBeCloseTo(P.stats.velocidadeBase * (1 + P.stats.velocidadeBonusMax));
    expect(s.critico).toBe(P.stats.criticoMax);
    expect(s.reducao).toBe(P.stats.reducaoMax);
    expect(s.recargaMult).toBeCloseTo(1 - P.stats.recargaReducaoMax);
  });

  it('o perfil aplica poder, nível e recarga às habilidades', () => {
    const h = hunter({ niveisHabilidade: { corteRapido: 3 } });
    const perfil = buildProfile(h, C);
    const corte = perfil.habilidades.find((x) => x.def.id === 'corteRapido');
    expect(corte?.nivel).toBe(3);
    expect(corte?.escala).toBeCloseTo(perfil.stats.poder * (1 + 2 * P.escalaPorNivelDeHabilidade));
    expect(corte?.recargaMs).toBe(Math.round(3000 * perfil.stats.recargaMult));
  });
});

describe('habilidades', () => {
  it('recusa equipar bloqueadas, repetidas ou além dos espaços', () => {
    const h = hunter();
    expect(setEquipped(h, C, ['marcaDoCacador']).erro).toBeDefined();
    expect(setEquipped(h, C, ['corteRapido', 'corteRapido']).erro).toBeDefined();
    const alto = hunter({ level: 30 });
    expect(setEquipped(alto, C, Object.keys(C.habilidades)).erro).toBeDefined();
    expect(setEquipped(alto, C, ['marcaDoCacador', 'corteRapido']).cacador?.equipadas).toEqual([
      'marcaDoCacador',
      'corteRapido',
    ]);
  });

  it('melhorar custa ouro crescente e para no nível máximo', () => {
    const h = hunter();
    expect(upgradeCost(C, 1)).toBeLessThan(upgradeCost(C, 2));
    expect(upgradeAbility(h, C, 'corteRapido', upgradeCost(C, 1) - 1)).toHaveProperty('erro');
    const r = upgradeAbility(h, C, 'corteRapido', 1e9);
    expect('custo' in r && r.custo).toBe(upgradeCost(C, 1));
    const max = hunter({ niveisHabilidade: { corteRapido: P.habilidadeNivelMax } });
    expect(upgradeAbility(max, C, 'corteRapido', 1e9)).toHaveProperty('erro');
  });
});
