import { describe, expect, it } from 'vitest';
import { endTurn, playCard } from '../../../src/engine/combat/index.ts';
import { TEST_CONTENT as C, enemyUid, inHand, setup } from './helpers.ts';

const deck10 = [
  'golpe',
  'golpe',
  'golpe',
  'golpe',
  'golpe',
  'escudo',
  'escudo',
  'escudo',
  'escudo',
  'escudo',
];

describe('início do combate', () => {
  it('começa no turno 1 com 3 de energia, 5 cartas na mão e intenções visíveis', () => {
    const s = setup(deck10);
    expect(s.turno).toBe(1);
    expect(s.energia).toBe(3);
    expect(s.mao).toHaveLength(5);
    expect(s.compra).toHaveLength(5);
    expect(s.inimigos[0]?.intencao).toBe('bater');
  });
});

describe('pilhas', () => {
  it('reembaralha o descarte quando a pilha de compra acaba', () => {
    let s = setup(
      ['escudo', 'escudo', 'escudo', 'escudo', 'escudo', 'escudo', 'escudo'],
      ['passivo'],
    );
    expect(s.compra).toHaveLength(2);
    const r = endTurn(s, C);
    s = r.estado;
    expect(r.eventos.some((e) => e.tipo === 'descarteReembaralhado')).toBe(true);
    expect(s.mao).toHaveLength(5);
    expect(s.mao.length + s.compra.length + s.descarte.length).toBe(7);
  });

  it('não compra nada se compra e descarte estão vazios', () => {
    let s = setup(['gratis'], ['passivo']);
    expect(s.mao).toHaveLength(1);
    s = playCard(s, C, { carta: inHand(s, 'gratis') }).estado;
    // A própria carta só vai para o descarte depois de resolvida, então não há o que comprar.
    expect(s.mao).toHaveLength(0);
    expect(s.descarte).toHaveLength(1);
  });

  it('com a mão cheia, a carta comprada vai para o descarte', () => {
    const deck = ['compra3', ...Array.from({ length: 14 }, () => 'escudo')];
    let s = setup(deck, ['passivo']);
    // Monta uma mão com 10 cartas, incluindo a que compra 3.
    const todas = [...s.mao, ...s.compra];
    const compra3 = todas.find((c) => c.defId === 'compra3')!;
    const outras = todas.filter((c) => c !== compra3);
    s = { ...s, mao: [compra3, ...outras.slice(0, 9)], compra: outras.slice(9) };
    const r = playCard(s, C, { carta: compra3.uid });
    // Ao jogar, a mão fica com 9: compra 1 (vai a 10) e as outras 2 vão para o descarte.
    expect(r.estado.mao).toHaveLength(10);
    expect(r.eventos.filter((e) => e.tipo === 'maoCheia')).toHaveLength(2);
    expect(r.estado.descarte.map((c) => c.defId)).toEqual(['escudo', 'escudo', 'compra3']);
  });

  it('cartas jogadas vão para o descarte e cartas com Consumir saem do combate', () => {
    let s = setup(['golpe', 'ritual'], ['passivo']);
    s = playCard(s, C, { carta: inHand(s, 'golpe'), alvo: enemyUid(s) }).estado;
    s = playCard(s, C, { carta: inHand(s, 'ritual') }).estado;
    expect(s.descarte.map((c) => c.defId)).toEqual(['golpe']);
    expect(s.consumidas.map((c) => c.defId)).toEqual(['ritual']);
  });
});

describe('fim do turno', () => {
  it('descarta a mão, zera o bloqueio no turno seguinte e compra 5 novas', () => {
    let s = setup(deck10, ['passivo']);
    s = playCard(s, C, { carta: inHand(s, 'escudo') }).estado;
    expect(s.jogador.bloqueio).toBe(5);
    s = endTurn(s, C).estado;
    expect(s.turno).toBe(2);
    expect(s.jogador.bloqueio).toBe(0);
    expect(s.mao).toHaveLength(5);
    expect(s.energia).toBe(3);
  });

  it('o bloqueio do inimigo dura durante o turno do jogador e zera no turno dele', () => {
    let s = setup(deck10, ['passivo']);
    s = endTurn(s, C).estado;
    expect(s.inimigos[0]?.bloqueio).toBe(3);
    s = endTurn(s, C).estado;
    expect(s.inimigos[0]?.bloqueio).toBe(3); // zerou e ganhou de novo
  });
});

describe('energia e comandos inválidos', () => {
  it('recusa carta sem energia suficiente, sem alterar o estado', () => {
    let s = setup(['caro', 'golpe'], ['passivo']);
    s = playCard(s, C, { carta: inHand(s, 'golpe'), alvo: enemyUid(s) }).estado;
    const r = playCard(s, C, { carta: inHand(s, 'caro') });
    expect(r.erro).toMatch(/energia/);
    expect(r.estado).toBe(s);
  });

  it('recusa carta de ataque sem alvo válido', () => {
    const s = setup(['golpe'], ['passivo']);
    expect(playCard(s, C, { carta: inHand(s, 'golpe') }).erro).toMatch(/alvo/);
  });

  it('nunca altera o estado recebido', () => {
    const s = setup(deck10);
    const antes = structuredClone(s);
    playCard(s, C, { carta: inHand(s, 'golpe'), alvo: enemyUid(s) });
    endTurn(s, C);
    expect(s).toEqual(antes);
  });
});
