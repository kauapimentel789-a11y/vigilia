import { describe, expect, it } from 'vitest';
import type { CombatState } from '../../../src/engine/combat/index.ts';
import { cannotPlay, endTurn, playCard } from '../../../src/engine/combat/index.ts';
import { createRng } from '../../../src/engine/core/index.ts';
import { TEST_CONTENT as C, enemyUid, inHand, setup } from './helpers.ts';

describe('fim de combate', () => {
  it('vitória no meio de uma carta: os golpes seguintes não acontecem', () => {
    let s = setup(['duplo'], ['passivo']);
    s = { ...s, inimigos: s.inimigos.map((i) => ({ ...i, vida: 2 })) };
    const r = playCard(s, C, { carta: inHand(s, 'duplo'), alvo: enemyUid(s) });
    expect(r.estado.resultado).toBe('vitoria');
    expect(r.eventos.filter((e) => e.tipo === 'dano')).toHaveLength(1);
  });

  it('derrota quando a vida do jogador chega a 0', () => {
    let s = setup(['escudo'], ['boneco']);
    s = { ...s, jogador: { ...s.jogador, vida: 5 } };
    const r = endTurn(s, C);
    expect(r.estado.resultado).toBe('derrota');
    expect(r.estado.jogador.vida).toBe(0);
  });

  it('nenhum comando é aceito depois do fim', () => {
    let s = setup(['escudo'], ['boneco']);
    s = { ...s, jogador: { ...s.jogador, vida: 1 } };
    s = endTurn(s, C).estado;
    expect(endTurn(s, C).erro).toBeDefined();
  });

  it('termina em empate depois do limite de turnos', () => {
    let s = setup(['escudo'], ['passivo']);
    for (let t = 0; t < 45 && !s.resultado; t++) s = endTurn(s, C).estado;
    expect(s.resultado).toBe('empate');
  });
});

/** Joga uma partida inteira com escolhas aleatórias (de outra semente). */
function randomPlaythrough(semente: number): CombatState {
  const deck = [
    'golpe',
    'golpe',
    'duplo',
    'escudo',
    'escudo',
    'avivavel',
    'invocar',
    'ordem',
    'veneno',
    'ritual',
    'devorar',
  ];
  let s = setup(deck, ['ciclico', 'sorteado'], semente);
  const escolhas = createRng(semente * 31 + 7);
  for (let passo = 0; passo < 500 && !s.resultado; passo++) {
    const vivos = s.inimigos.filter((i) => i.vida > 0);
    const jogaveis = s.mao.filter((c) => !cannotPlay(s, C, { carta: c.uid, alvo: vivos[0]?.uid }));
    if (jogaveis.length === 0 || escolhas.next() < 0.25) {
      s = endTurn(s, C).estado;
      continue;
    }
    const carta = escolhas.pick(jogaveis);
    const alvo = escolhas.pick(vivos).uid;
    const avivar = escolhas.next() < 0.5;
    const r = playCard(s, C, { carta: carta.uid, alvo, avivar });
    s = r.erro ? playCard(s, C, { carta: carta.uid, alvo }).estado : r.estado;
  }
  return s;
}

describe('determinismo', () => {
  it('mesma semente e mesmas jogadas produzem exatamente o mesmo combate', () => {
    for (let semente = 1; semente <= 100; semente++) {
      expect(randomPlaythrough(semente)).toEqual(randomPlaythrough(semente));
    }
  });

  it('sementes diferentes produzem combates diferentes', () => {
    expect(randomPlaythrough(1)).not.toEqual(randomPlaythrough(2));
  });
});
