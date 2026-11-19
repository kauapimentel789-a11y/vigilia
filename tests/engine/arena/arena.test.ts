import { describe, expect, it } from 'vitest';
import {
  activeMarcas,
  autoTurn,
  buyUnit,
  buyXp,
  countMarcas,
  createMatch,
  endRound,
  moveUnit,
  placement,
  rerollShop,
  sellUnit,
  simulateArenaBattle,
} from '../../../src/engine/arena/index.ts';
import type { ArenaMatch, ArenaUnitInst } from '../../../src/engine/arena/index.ts';
import {
  chooseArenaHero,
  isHeroUnlocked,
  playArenaRound,
  spendGloria,
  startArenaMatch,
} from '../../../src/engine/game/arena.ts';
import { newGame } from '../../../src/engine/game/game.ts';
import { TEST_CONTENT as C } from '../../helpers.ts';

const u = (def: string, estrelas = 1, uid = def): ArenaUnitInst => ({ uid, def, estrelas });
const vazio = (): Array<ArenaUnitInst | null> => new Array(8).fill(null);

function board(lista: Array<[number, ArenaUnitInst]>): Array<ArenaUnitInst | null> {
  const t = vazio();
  for (const [i, x] of lista) t[i] = x;
  return t;
}

/** Partida com a loja do jogador trocada por unidades conhecidas. */
function comLoja(m: ArenaMatch, loja: Array<string | null>, ouro = 50): ArenaMatch {
  const n = structuredClone(m);
  n.jogadores[0]!.loja = loja;
  n.jogadores[0]!.ouro = ouro;
  return n;
}

describe('combate da Arena', () => {
  it('é determinístico e o lado mais forte vence', () => {
    const forte = {
      tabuleiro: board([
        [0, u('cavaleiroOco', 2)],
        [5, u('arqueiroOco', 2)],
      ]),
      heroi: 'vigia',
    };
    const fraco = { tabuleiro: board([[0, u('ratoDeBrasa')]]), heroi: 'vigia' };
    const r1 = simulateArenaBattle(C, forte, fraco, 7, true);
    const r2 = simulateArenaBattle(C, forte, fraco, 7, true);
    expect(r1.vencedor).toBe(0);
    expect(r1.vivas[0]).toBe(2);
    expect(r1.eventos).toEqual(r2.eventos);
    expect(r1.quadros.length).toBeGreaterThan(1);
  });

  it('ataca primeiro a fileira da frente', () => {
    const a = { tabuleiro: board([[4, u('arqueiroOco')]]), heroi: 'vigia' };
    const b = {
      tabuleiro: board([
        [1, u('vigiaDeCinza')],
        [4, u('acolitaPalida')],
      ]),
      heroi: 'vigia',
    };
    const r = simulateArenaBattle(C, a, b, 1, true);
    const primeiro = r.eventos.find((e) => e.tipo === 'ataque' && e.origem.startsWith('0:'));
    expect(primeiro).toMatchObject({ alvo: '1:vigiaDeCinza' });
  });

  it('corpo a corpo atrás de um aliado espera a frente da coluna cair', () => {
    const a = {
      tabuleiro: board([
        [0, u('vigiaDeCinza', 3, 'tanque')],
        [4, u('ratoDeBrasa', 1, 'rato')],
      ]),
      heroi: 'vigia',
    };
    const b = { tabuleiro: board([[0, u('acolitaPalida')]]), heroi: 'vigia' };
    const r = simulateArenaBattle(C, a, b, 1, true);
    expect(r.eventos.some((e) => e.tipo === 'ataque' && e.origem === '0:rato')).toBe(false);
  });

  it('marcas contam unidades diferentes e ativam bônus', () => {
    const t = board([
      [0, u('vigiaDeCinza', 1, 'a')],
      [1, u('vigiaDeCinza', 1, 'b')],
      [2, u('fagulha')],
    ]);
    expect(countMarcas(C.arena, t).cinzas).toBe(2);
    expect(activeMarcas(C.arena, t).cinzas).toBe(0);
    expect(activeMarcas(C.arena, t).ossos).toBe(-1);
    const r = simulateArenaBattle(
      C,
      { tabuleiro: t, heroi: 'vigia' },
      { tabuleiro: vazio(), heroi: 'vigia' },
      1,
    );
    expect(r.vencedor).toBe(0);
  });
});

describe('partida da Arena', () => {
  const nova = () => createMatch(C, 3, 'vigia', 'Você');

  it('começa com 4 jogadores, vida, ouro e loja cheia', () => {
    const m = nova();
    expect(m.jogadores).toHaveLength(C.arena.regras.jogadores);
    const eu = m.jogadores[0]!;
    expect(eu.bot).toBe(false);
    expect(eu.vida).toBe(C.arena.regras.vidaJogador);
    expect(eu.ouro).toBe(C.arena.regras.renda[0]! + 3);
    expect(eu.loja.filter(Boolean)).toHaveLength(C.arena.regras.tamanhoLoja);
  });

  it('comprar tira ouro e estoque; vender devolve', () => {
    const m = comLoja(nova(), ['fagulha', null, null, null, null], 10);
    const estoque = m.estoque.fagulha!;
    const r = buyUnit(m, C, 0);
    const eu = r.partida!.jogadores[0]!;
    expect(eu.ouro).toBe(9);
    expect(eu.banco[0]?.def).toBe('fagulha');
    const v = sellUnit(r.partida!, C, eu.banco[0]!.uid);
    expect(v.partida!.jogadores[0]!.ouro).toBe(10);
    expect(v.partida!.estoque.fagulha).toBe(estoque + 1);
    expect(buyUnit(comLoja(nova(), ['cavaleiroOco'], 1), C, 0).erro).toMatch(/Ouro/);
  });

  it('três cópias iguais viram uma de 2 estrelas', () => {
    let m = comLoja(nova(), ['carnical', 'carnical', 'carnical', null, null]);
    for (const i of [0, 1, 2]) m = buyUnit(m, C, i).partida!;
    const todas = [...m.jogadores[0]!.banco, ...m.jogadores[0]!.tabuleiro].filter(Boolean);
    expect(todas).toHaveLength(1);
    expect(todas[0]).toMatchObject({ def: 'carnical', estrelas: 2 });
  });

  it('o tabuleiro aceita no máximo o nível em unidades', () => {
    let m = comLoja(nova(), ['carnical', 'fagulha', 'ratoDeBrasa', null, null]);
    for (const i of [0, 1, 2]) m = buyUnit(m, C, i).partida!;
    const banco = m.jogadores[0]!.banco.filter(Boolean) as ArenaUnitInst[];
    m = moveUnit(m, C, banco[0]!.uid, { onde: 'tabuleiro', i: 0 }).partida!;
    m = moveUnit(m, C, banco[1]!.uid, { onde: 'tabuleiro', i: 1 }).partida!;
    expect(moveUnit(m, C, banco[2]!.uid, { onde: 'tabuleiro', i: 2 }).erro).toMatch(/nível/);
    // Trocar de lugar com quem já está no tabuleiro é permitido.
    expect(moveUnit(m, C, banco[2]!.uid, { onde: 'tabuleiro', i: 0 }).erro).toBeUndefined();
  });

  it('rolar custa ouro e comprar XP sobe de nível', () => {
    const m = comLoja(nova(), ['carnical'], 10);
    expect(rerollShop(m, C).partida!.jogadores[0]!.ouro).toBe(8);
    const x = buyXp(m, C).partida!.jogadores[0]!;
    expect(x.nivel).toBe(C.arena.regras.nivelInicial + 1);
  });

  it('uma partida inteira jogada no automático termina com colocação de 1 a 4', () => {
    let m = nova();
    let rodadas = 0;
    while (!m.fim && rodadas < 50) {
      m = autoTurn(m, C);
      const r = endRound(m, C);
      expect(r.erro).toBeUndefined();
      expect(r.relatorio!.lutas.length).toBeGreaterThan(0);
      m = r.partida!;
      rodadas++;
    }
    expect(m.fim).toBe(true);
    expect(placement(m)).toBeGreaterThanOrEqual(1);
    expect(placement(m)).toBeLessThanOrEqual(4);
  });
});

describe('Arena no estado do jogo', () => {
  it('heróis pedem o Selo certo', () => {
    const e = newGame(C, 1, 0);
    expect(isHeroUnlocked(e, C, 'vigia')).toBe(true);
    expect(isHeroUnlocked(e, C, 'juramento')).toBe(false);
    expect(chooseArenaHero(e, C, 'juramento').erro).toBeDefined();
    e.selos.seloCavaleiro = 1;
    expect(chooseArenaHero(e, C, 'juramento').estado?.arena.heroi).toBe('juramento');
  });

  it('terminar a partida dá Glória pela colocação; Glória compra poção', () => {
    let e = startArenaMatch(newGame(C, 1, 0), C).estado!;
    let fim = null;
    for (let i = 0; i < 50 && !fim; i++) {
      e.arena.partida = autoTurn(e.arena.partida!, C);
      const r = playArenaRound(e, C);
      e = r.estado!;
      fim = r.resultado!.fim;
    }
    expect(fim).not.toBeNull();
    expect(e.arena.gloria).toBe(C.arena.regras.gloria[fim!.lugar - 1]);
    expect(e.arena.partidas).toBe(1);
    e.arena.gloria = 10;
    const antes = e.pocoes;
    const r = spendGloria(e, C, 'pocao');
    expect(r.estado?.pocoes).toBe(antes + 1);
  });
});
