import { describe, expect, it } from 'vitest';
import { computeDamage, endTurn, playCard } from '../../../src/engine/combat/index.ts';
import { TEST_CONTENT as C, enemyUid, inHand, setup } from './helpers.ts';

describe('fórmula de dano', () => {
  it('soma Força e Marca antes de multiplicar', () => {
    expect(computeDamage(6, { forca: 2 }, { marca: 3 })).toBe(11);
  });

  it('Fraco reduz 25% e Vulnerável aumenta 50%, arredondando para baixo', () => {
    expect(computeDamage(7, { fraco: 1 }, {})).toBe(5); // 5,25
    expect(computeDamage(7, {}, { vulneravel: 1 })).toBe(10); // 10,5
    expect(computeDamage(10, { fraco: 1 }, { vulneravel: 1 })).toBe(11); // 11,25
  });

  it('nunca é negativo', () => {
    expect(computeDamage(0, { fraco: 1 }, {})).toBe(0);
  });
});

describe('bloqueio', () => {
  it('absorve o dano antes da vida', () => {
    let s = setup(['escudo', 'golpe'], ['boneco']);
    s = playCard(s, C, { carta: inHand(s, 'escudo') }).estado;
    s = endTurn(s, C).estado; // boneco bate 6
    expect(s.jogador.vida).toBe(49);
  });
});

describe('status', () => {
  it('Marca soma em cada golpe de um ataque com vários golpes', () => {
    let s = setup(['marca', 'duplo'], ['passivo']);
    s = playCard(s, C, { carta: inHand(s, 'marca'), alvo: enemyUid(s) }).estado;
    s = playCard(s, C, { carta: inHand(s, 'duplo'), alvo: enemyUid(s) }).estado;
    expect(s.inimigos[0]?.vida).toBe(30 - 12);
  });

  it('Vulnerável e Marca reduzem 1 no fim do turno de quem tem', () => {
    let s = setup(['vulneravel', 'marca'], ['passivo']);
    s = playCard(s, C, { carta: inHand(s, 'vulneravel'), alvo: enemyUid(s) }).estado;
    s = playCard(s, C, { carta: inHand(s, 'marca'), alvo: enemyUid(s) }).estado;
    s = endTurn(s, C).estado;
    expect(s.inimigos[0]?.status).toEqual({ vulneravel: 1, marca: 2 });
  });

  it('Veneno ignora bloqueio, age no início do turno de quem tem e reduz 1', () => {
    let s = setup(['veneno'], ['passivo']);
    s = playCard(s, C, { carta: inHand(s, 'veneno'), alvo: enemyUid(s) }).estado;
    s = { ...s, inimigos: s.inimigos.map((i) => ({ ...i, bloqueio: 50 })) };
    s = endTurn(s, C).estado;
    expect(s.inimigos[0]?.vida).toBe(27);
    expect(s.inimigos[0]?.status.veneno).toBe(2);
    expect(s.stats.danoPorFonte['veneno']).toBe(3);
  });

  it('Veneno pode derrotar o inimigo antes de ele agir', () => {
    let s = setup(['veneno'], ['boneco']);
    s = playCard(s, C, { carta: inHand(s, 'veneno'), alvo: enemyUid(s) }).estado;
    s = { ...s, inimigos: s.inimigos.map((i) => ({ ...i, vida: 2 })) };
    const r = endTurn(s, C);
    expect(r.estado.resultado).toBe('vitoria');
    expect(r.estado.jogador.vida).toBe(50);
  });
});
