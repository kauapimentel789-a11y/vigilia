import { describe, expect, it } from 'vitest';
import {
  advanceTime,
  collectExpedition,
  fightPortal,
  isPortalOpen,
  newGame,
  respec,
  rewardKill,
  spendPoint,
  startExpedition,
  upgrade,
} from '../../../src/engine/game/game.ts';
import { TEST_CONTENT as C } from '../../helpers.ts';

const H = 3_600_000;
const jogo = () => newGame(C, 42, 0);

describe('portais', () => {
  it('só abrem depois de fechar o anterior', () => {
    const e = jogo();
    expect(isPortalOpen(e, C, 'treino')).toBe(true);
    expect(isPortalOpen(e, C, 'ondas')).toBe(false);
    expect(fightPortal(e, C, 'ondas').erro).toBeDefined();
  });

  it('a primeira vitória fecha o portal e dá o bônus; repetir dá só a recompensa', () => {
    const r1 = fightPortal(jogo(), C, 'treino');
    expect(r1.batalha?.resultado).toBe('vitoria');
    expect(r1.recompensa?.primeiraVitoria).toBe(true);
    expect(r1.estado?.portaisFechados).toEqual(['treino']);
    expect(r1.estado?.ouro).toBe(14);
    const r2 = fightPortal(r1.estado!, C, 'treino');
    expect(r2.recompensa?.primeiraVitoria).toBe(false);
    expect(r2.recompensa?.ouro).toBe(4);
    expect(isPortalOpen(r1.estado!, C, 'ondas')).toBe(true);
  });

  it('derrota não rende nada', () => {
    const r = fightPortal(jogo(), C, 'eterno');
    expect(r.batalha?.resultado).toBe('derrota');
    expect(r.estado?.ouro).toBe(0);
    expect(r.estado?.portaisFechados).toEqual([]);
  });

  it('cada luta usa uma semente nova', () => {
    const r1 = fightPortal(jogo(), C, 'treino');
    expect(r1.estado?.proximaSemente).not.toBe(jogo().proximaSemente);
  });
});

describe('expedição no jogo', () => {
  const fechado = () => fightPortal(jogo(), C, 'treino').estado!;

  it('só vai a portal fechado, uma por vez, e bloqueia lutas', () => {
    expect(startExpedition(jogo(), C, 'treino', 0).erro).toBeDefined();
    const e = startExpedition(fechado(), C, 'treino', 0).estado!;
    expect(startExpedition(e, C, 'treino', 0).erro).toBeDefined();
    expect(fightPortal(e, C, 'treino').erro).toBeDefined();
  });

  it('coletar soma o ganho, recalcula a taxa e continua; chamar de volta encerra', () => {
    let e = startExpedition(fechado(), C, 'treino', 0).estado!;
    const ouroAntes = e.ouro;
    const r = collectExpedition(e, C, H);
    expect(r.ganhos!.ouro).toBeGreaterThan(0);
    expect(r.estado!.ouro).toBe(ouroAntes + r.ganhos!.ouro);
    expect(r.estado!.expedicao?.ultimaColeta).toBe(H);
    e = collectExpedition(r.estado!, C, 2 * H, true).estado!;
    expect(e.expedicao).toBeNull();
  });

  it('avançar o tempo (painel de teste) envelhece a expedição', () => {
    const e = startExpedition(fechado(), C, 'treino', 1000).estado!;
    expect(advanceTime(e, H).expedicao?.ultimaColeta).toBe(1000 - H);
  });
});

describe('caçador no jogo', () => {
  it('pontos, redistribuição e melhoria com ouro', () => {
    let e = jogo();
    e.cacador.pontosLivres = 3;
    e = spendPoint(e, C, 'forca', 3).estado!;
    expect(e.cacador.atributos.forca).toBe(8);
    e = respec(e, C).estado!;
    expect(e.cacador.pontosLivres).toBe(3);
    expect(upgrade(e, C, 'corteRapido').erro).toBeDefined();
    e.ouro = 1000;
    const u = upgrade(e, C, 'corteRapido').estado!;
    expect(u.cacador.niveisHabilidade.corteRapido).toBe(2);
    expect(u.ouro).toBeLessThan(1000);
  });

  it('comandos não alteram o estado recebido', () => {
    const e = fightPortal(jogo(), C, 'treino').estado!;
    const copia = structuredClone(e);
    fightPortal(e, C, 'treino');
    startExpedition(e, C, 'treino', 0);
    expect(e).toEqual(copia);
  });
});

describe('abates no mapa', () => {
  it('paga XP e ouro do monstro sem alterar o estado antigo', () => {
    const e = jogo();
    const r = rewardKill(e, C, 'treino', { xp: 10, ouro: 4, chefe: false });
    expect(r.recompensa).toMatchObject({ xp: 10, ouro: 4, primeiraVitoria: false });
    expect(r.estado?.ouro).toBe(4);
    expect(e.ouro).toBe(0);
    expect(r.estado?.portaisFechados).toEqual([]);
  });

  it('o chefe fecha o portal e dá o bônus só na primeira vez', () => {
    const r1 = rewardKill(jogo(), C, 'treino', { xp: 10, ouro: 4, chefe: true });
    expect(r1.recompensa?.primeiraVitoria).toBe(true);
    expect(r1.estado?.portaisFechados).toContain('treino');
    expect(isPortalOpen(r1.estado!, C, 'ondas')).toBe(true);
    const r2 = rewardKill(r1.estado!, C, 'treino', { xp: 10, ouro: 4, chefe: true });
    expect(r2.recompensa?.primeiraVitoria).toBe(false);
    expect(r2.recompensa?.xp).toBeLessThan(r1.recompensa!.xp);
  });
});
