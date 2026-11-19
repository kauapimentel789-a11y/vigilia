import { describe, expect, it } from 'vitest';
import { endTurn, playCard } from '../../../src/engine/combat/index.ts';
import { TEST_CONTENT as C, enemyUid, inHand, setup } from './helpers.ts';

const deck = [
  'golpe',
  'golpe',
  'golpe',
  'golpe',
  'golpe',
  'golpe',
  'golpe',
  'golpe',
  'golpe',
  'golpe',
];

describe('Brasa', () => {
  it('energia que sobra no fim do turno vira Brasa', () => {
    let s = setup(deck, ['passivo']);
    s = playCard(s, C, { carta: inHand(s, 'golpe'), alvo: enemyUid(s) }).estado;
    s = endTurn(s, C).estado;
    expect(s.brasa).toBe(2);
  });

  it('nunca passa de 3, e o excedente é anunciado', () => {
    let s = setup(deck, ['passivo']);
    s = endTurn(s, C).estado;
    expect(s.brasa).toBe(3);
    const r = endTurn(s, C);
    expect(r.estado.brasa).toBe(3);
    expect(r.eventos).toContainEqual({ tipo: 'brasa', delta: 0, total: 3, excedente: 3 });
  });
});

describe('Avivar', () => {
  it('sem Avivar, a carta não gasta Brasa mesmo havendo Brasa', () => {
    let s = setup(['avivavel'], ['passivo']);
    s = { ...s, brasa: 3 };
    s = playCard(s, C, { carta: inHand(s, 'avivavel'), alvo: enemyUid(s) }).estado;
    expect(s.brasa).toBe(3);
    expect(s.inimigos[0]?.vida).toBe(26);
  });

  it('com Avivar, gasta a Brasa e usa os efeitos avivados (modo substitui)', () => {
    let s = setup(['avivavel'], ['passivo']);
    s = { ...s, brasa: 3 };
    s = playCard(s, C, { carta: inHand(s, 'avivavel'), alvo: enemyUid(s), avivar: true }).estado;
    expect(s.brasa).toBe(1);
    expect(s.inimigos[0]?.vida).toBe(20);
    expect(s.stats.brasaGasta).toBe(2);
  });

  it('modo adiciona executa os efeitos normais e os avivados', () => {
    let s = setup(['adiciona'], ['passivo']);
    s = { ...s, brasa: 1 };
    s = playCard(s, C, { carta: inHand(s, 'adiciona'), avivar: true }).estado;
    expect(s.jogador.bloqueio).toBe(9);
    expect(s.brasa).toBe(0);
  });

  it('recusa Avivar sem Brasa suficiente; a carta pode ser jogada normalmente', () => {
    const s = { ...setup(['avivavel'], ['passivo']), brasa: 1 };
    const recusado = playCard(s, C, {
      carta: inHand(s, 'avivavel'),
      alvo: enemyUid(s),
      avivar: true,
    });
    expect(recusado.erro).toMatch(/2 Brasa/);
    expect(recusado.estado).toBe(s);
    const normal = playCard(s, C, { carta: inHand(s, 'avivavel'), alvo: enemyUid(s) });
    expect(normal.erro).toBeUndefined();
    expect(normal.estado.brasa).toBe(1);
  });

  it('recusa Avivar em carta que não tem Avivar', () => {
    const s = { ...setup(['golpe'], ['passivo']), brasa: 3 };
    expect(
      playCard(s, C, { carta: inHand(s, 'golpe'), alvo: enemyUid(s), avivar: true }).erro,
    ).toBeDefined();
  });

  it('danoPorBrasa consome toda a Brasa, inclusive 0', () => {
    let s = { ...setup(['devorar', 'devorar'], ['passivo']), brasa: 3 };
    s = playCard(s, C, { carta: s.mao[0]!.uid, alvo: enemyUid(s) }).estado;
    expect(s.brasa).toBe(0);
    expect(s.inimigos[0]?.vida).toBe(30 - 26);
    s = { ...s, inimigos: s.inimigos.map((i) => ({ ...i, vida: 30 })) };
    s = playCard(s, C, { carta: s.mao[0]!.uid, alvo: enemyUid(s) }).estado;
    expect(s.inimigos[0]?.vida).toBe(22);
  });
});

describe('rituais', () => {
  it('disparam a partir do próximo turno, antes da compra, e duram até o fim', () => {
    let s = setup(['ritual', 'golpe', 'golpe', 'golpe', 'golpe', 'golpe'], ['passivo']);
    s = playCard(s, C, { carta: inHand(s, 'ritual') }).estado;
    expect(s.rituais).toHaveLength(1);
    expect(s.brasa).toBe(0); // não dispara no mesmo turno
    // Gasta a energia restante para isolar o ganho do ritual.
    s = { ...s, energia: 0 };
    let r = endTurn(s, C);
    expect(r.estado.brasa).toBe(1);
    const ordem = r.eventos.map((e) => e.tipo);
    expect(ordem.indexOf('ritualDisparado')).toBeLessThan(ordem.indexOf('cartasCompradas'));
    r = endTurn({ ...r.estado, energia: 0 }, C);
    expect(r.estado.brasa).toBe(2);
  });
});
