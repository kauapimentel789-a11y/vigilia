import { describe, expect, it } from 'vitest';
import { createRng } from '../../../src/engine/core/index.ts';
import { equipmentStats, itemStats, rollItem } from '../../../src/engine/items/items.ts';
import type { ItemInstance } from '../../../src/engine/items/items.ts';
import {
  discardItem,
  equipItem,
  newGame,
  pickUp,
  unequipItem,
} from '../../../src/engine/game/game.ts';
import { deriveStats } from '../../../src/engine/hunter/stats.ts';
import { TEST_CONTENT as C, hunter } from '../../helpers.ts';

const espada: ItemInstance = { uid: 'x', base: 'laminaDeCinza', raridade: 'comum', afixos: [] };

describe('sorteio de itens', () => {
  it('é determinístico pela semente', () => {
    const a = rollItem(C, 'treino', createRng(9), 'a');
    const b = rollItem(C, 'treino', createRng(9), 'a');
    expect(a).toEqual(b);
  });

  it('respeita a faixa do portal, a raridade mínima e o número de afixos', () => {
    const rng = createRng(1);
    for (let i = 0; i < 300; i++) {
      const it = rollItem(C, 'treino', rng, `i${i}`, 'incomum') as ItemInstance;
      expect(C.itens.bases[it.base]?.nivel).toBe(1);
      expect(it.raridade).not.toBe('comum');
      expect(it.afixos).toHaveLength(C.itens.raridades[it.raridade].afixos);
      expect(new Set(it.afixos.map((a) => a.id)).size).toBe(it.afixos.length);
    }
  });

  it('portal sem tabela não dá item', () => {
    expect(rollItem(C, 'nenhum', createRng(1), 'x')).toBeUndefined();
  });
});

describe('stats dos itens', () => {
  it('raridade multiplica a base e afixos somam', () => {
    const rara: ItemInstance = { ...espada, raridade: 'rara', afixos: [{ id: 'forca', valor: 2 }] };
    expect(itemStats(C, espada).ataque).toBe(2);
    expect(itemStats(C, rara)).toMatchObject({ ataque: 2, forca: 2 });
  });

  it('o equipamento entra nos números do caçador', () => {
    const sem = deriveStats(hunter(), C);
    const com = deriveStats(
      hunter({ equipamento: { arma: { ...espada, afixos: [{ id: 'vigor', valor: 2 }] } } }),
      C,
    );
    expect(com.ataque).toBeGreaterThan(sem.ataque);
    expect(com.vidaMax).toBe(sem.vidaMax + 2 * C.progressao.stats.vidaPorVigor);
    expect(equipmentStats(C, {})).toEqual({});
  });
});

describe('mochila', () => {
  it('guarda com id novo e recusa quando cheia', () => {
    let e = newGame(C, 1, 0);
    for (let i = 0; i < C.itens.capacidadeMochila; i++) {
      const r = pickUp(e, C, espada);
      expect(r.erro).toBeUndefined();
      e = r.estado!;
    }
    expect(new Set(e.mochila.map((i) => i.uid)).size).toBe(C.itens.capacidadeMochila);
    expect(pickUp(e, C, espada).erro).toBe('Mochila cheia.');
  });

  it('vestir troca com o que estava vestido; tirar e jogar fora', () => {
    let e = pickUp(newGame(C, 1, 0), C, espada).estado!;
    e = pickUp(e, C, { ...espada, raridade: 'rara' }).estado!;
    const [a, b] = e.mochila;
    e = equipItem(e, C, a!.uid).estado!;
    expect(e.cacador.equipamento.arma?.uid).toBe(a!.uid);
    e = equipItem(e, C, b!.uid).estado!;
    expect(e.cacador.equipamento.arma?.uid).toBe(b!.uid);
    expect(e.mochila.map((i) => i.uid)).toEqual([a!.uid]);
    e = unequipItem(e, C, 'arma').estado!;
    expect(e.cacador.equipamento.arma).toBeUndefined();
    e = discardItem(e, a!.uid).estado!;
    expect(e.mochila.map((i) => i.uid)).toEqual([b!.uid]);
  });
});

describe('Posto', () => {
  it('vender, comprar poções, baú e morte', async () => {
    const g = await import('../../../src/engine/game/game.ts');
    let e = g.pickUp(newGame(C, 1, 0), C, espada).estado!;
    e = g.pickUp(e, C, { ...espada, raridade: 'rara' }).estado!;
    const [a, b] = e.mochila;
    const v = g.sellItems(e, C, [a!.uid]);
    expect(v.ouro).toBe(C.itens.bases.laminaDeCinza!.valor);
    e = v.estado!;
    expect(g.buyPotions({ ...e, ouro: 100 }, C, 1).estado?.pocoes).toBe(e.pocoes + 1);
    expect(g.buyPotions({ ...e, ouro: 0 }, C, 1).erro).toBe('Ouro insuficiente.');
    e = g.storeItem(e, C, b!.uid).estado!;
    expect(e.bau).toHaveLength(1);
    e = g.pickUp(e, C, espada).estado!;
    const morto = g.dieInMap(e);
    expect(morto.perdidos).toBe(1);
    expect(morto.estado!.mochila).toEqual([]);
    expect(morto.estado!.bau).toHaveLength(1);
    e = g.retrieveItem(morto.estado!, C, b!.uid).estado!;
    expect(e.mochila.map((i) => i.uid)).toEqual([b!.uid]);
    expect(g.consumePotion({ ...e, pocoes: 0 }).erro).toBeDefined();
  });
});
