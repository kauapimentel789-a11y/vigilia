import { describe, expect, it } from 'vitest';
import type { ExpeditionState } from '../../../src/engine/expedition/expedition.ts';
import {
  accruedGains,
  calculateRate,
  rewardMultiplier,
} from '../../../src/engine/expedition/expedition.ts';
import { TEST_CONTENT as C, hunter, profile } from '../../helpers.ts';

const H = 3_600_000;
const exp = (mods: Partial<ExpeditionState['taxa']> = {}): ExpeditionState => ({
  portal: 'treino',
  inicio: 0,
  ultimaColeta: 0,
  taxa: {
    portal: 'treino',
    vitoria: 1,
    duracaoMediaS: 10,
    lutasPorHora: 100,
    xpPorHora: 1000,
    ouroPorHora: 400,
    ...mods,
  },
});

describe('taxa da expedição', () => {
  it('vem de lutas reais: vitória total no boneco, zero no imortal', () => {
    const facil = calculateRate(profile(), C.portais.treino!, C, 1);
    expect(facil.vitoria).toBe(1);
    expect(facil.xpPorHora).toBeCloseTo(facil.lutasPorHora * C.portais.treino!.recompensa.xp);
    const impossivel = calculateRate(profile(), C.portais.eterno!, C, 1);
    expect(impossivel.vitoria).toBe(0);
    expect(impossivel.xpPorHora).toBe(0);
  });

  it('é determinística para a mesma semente', () => {
    expect(calculateRate(profile(), C.portais.caos!, C, 9)).toEqual(
      calculateRate(profile(), C.portais.caos!, C, 9),
    );
  });
});

describe('ganho por tempo', () => {
  it('é proporcional ao tempo decorrido', () => {
    const g1 = accruedGains(exp(), H, C, hunter());
    const g2 = accruedGains(exp(), 2 * H, C, hunter());
    expect(g1.xp).toBe(1000);
    expect(g1.ouro).toBe(400);
    expect(g2.xp).toBe(2000);
    expect(g1.lutas).toBe(100);
  });

  it('para no teto de horas', () => {
    const teto = C.progressao.expedicao.tetoHoras;
    const g = accruedGains(exp(), (teto + 5) * H, C, hunter());
    expect(g.noTeto).toBe(true);
    expect(g.tempoMs).toBe(teto * H);
  });

  it('relógio voltando no tempo não rende nada', () => {
    const g = accruedGains({ ...exp(), ultimaColeta: 10 * H }, 9 * H, C, hunter());
    expect(g.relogioVoltou).toBe(true);
    expect(g.xp + g.ouro + g.lutas).toBe(0);
  });

  it('derrotas reduzem o ganho', () => {
    const g = accruedGains(exp({ vitoria: 0.5, xpPorHora: 500 }), H, C, hunter());
    expect(g.vitorias).toBe(50);
    expect(g.xp).toBe(500);
  });

  it('portais fáceis demais rendem menos conforme o caçador passa do level recomendado', () => {
    const p = C.portais.treino!;
    const r = C.progressao.xpAcimaDoRecomendado;
    expect(rewardMultiplier(C, p, p.levelRecomendado + r.tolerancia)).toBe(1);
    expect(rewardMultiplier(C, p, p.levelRecomendado + r.tolerancia + 1)).toBeCloseTo(
      1 - r.quedaPorLevel,
    );
    expect(rewardMultiplier(C, p, 30)).toBe(r.minimo);
    const alto = accruedGains(exp(), H, C, hunter({ level: 30 }));
    expect(alto.xp).toBe(Math.floor(1000 * r.minimo));
    expect(alto.ouro).toBe(Math.floor(400 * r.minimo));
  });
});
