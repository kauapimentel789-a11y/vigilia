import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../../../src/engine/save/save.ts';
import { fightPortal, newGame, startExpedition } from '../../../src/engine/game/game.ts';
import { TEST_CONTENT as C } from '../../helpers.ts';

const jogoComProgresso = () => {
  const e = fightPortal(newGame(C, 7, 0), C, 'treino').estado!;
  return startExpedition(e, C, 'treino', 5000).estado!;
};

describe('save', () => {
  it('ida e volta devolve o mesmo estado', () => {
    const e = jogoComProgresso();
    const r = deserialize(serialize(e, 123), C);
    expect(r.estado).toEqual(e);
    expect(r.salvoEm).toBe(123);
  });

  it('recusa texto que não é JSON ou sem formato', () => {
    expect(deserialize('{oops', C).erro).toBeDefined();
    expect(deserialize('{"a":1}', C).erro).toBeDefined();
  });

  it('recusa save corrompido', () => {
    const arquivo = JSON.parse(serialize(jogoComProgresso(), 1));
    arquivo.estado.cacador.level = -3;
    expect(deserialize(JSON.stringify(arquivo), C).erro).toMatch(/corrompido/);
    const outro = JSON.parse(serialize(jogoComProgresso(), 1));
    outro.estado.ouro = 'muito';
    expect(deserialize(JSON.stringify(outro), C).erro).toMatch(/corrompido/);
  });

  it('recusa save de versão mais nova', () => {
    const arquivo = JSON.parse(serialize(jogoComProgresso(), 1));
    arquivo.v = 99;
    expect(deserialize(JSON.stringify(arquivo), C).erro).toMatch(/mais nova/);
  });

  it('descarta referências a conteúdo que não existe mais', () => {
    const arquivo = JSON.parse(serialize(jogoComProgresso(), 1));
    arquivo.estado.cacador.equipadas.push('habilidadeQueSumiu');
    arquivo.estado.portaisFechados.push('portalQueSumiu');
    const r = deserialize(JSON.stringify(arquivo), C);
    expect(r.estado?.cacador.equipadas).not.toContain('habilidadeQueSumiu');
    expect(r.estado?.portaisFechados).toEqual(['treino']);
  });
});

describe('migrações', () => {
  it('um save da Etapa 2 abre com mochila vazia e nada vestido', () => {
    const atual = newGame(C, 7, 0);
    const estado: Record<string, unknown> = { ...atual, versao: 1 };
    delete estado.mochila;
    delete estado.proximoItem;
    delete estado.rank;
    delete estado.selos;
    const cacador: Record<string, unknown> = { ...atual.cacador };
    delete cacador.equipamento;
    const v1 = { v: 1, salvoEm: 5, estado: { ...estado, cacador } };
    const r = deserialize(JSON.stringify(v1), C);
    expect(r.erro).toBeUndefined();
    expect(r.estado?.versao).toBe(4);
    expect(r.estado?.mochila).toEqual([]);
    expect(r.estado?.cacador.equipamento).toEqual({});
    expect(r.estado?.rank).toBe('cinza');
  });

  it('um save da Etapa 3 abre no rank Cinza, sem Selos', () => {
    const atual = newGame(C, 7, 0);
    const estado: Record<string, unknown> = { ...atual, versao: 2 };
    delete estado.rank;
    delete estado.selos;
    const r = deserialize(JSON.stringify({ v: 2, salvoEm: 5, estado }), C);
    expect(r.erro).toBeUndefined();
    expect(r.estado?.rank).toBe('cinza');
    expect(r.estado?.selos).toEqual({});
  });

  it('um save da Etapa 4 ganha a Arena zerada', () => {
    const atual = newGame(C, 7, 0);
    const estado: Record<string, unknown> = { ...atual, versao: 3 };
    delete estado.arena;
    const r = deserialize(JSON.stringify({ v: 3, salvoEm: 5, estado }), C);
    expect(r.erro).toBeUndefined();
    expect(r.estado?.arena).toMatchObject({ gloria: 0, heroi: 'vigia', partida: null });
  });

  it('partida da Arena estragada é descartada ao carregar', () => {
    const e = newGame(C, 7, 0) as unknown as Record<string, unknown>;
    e.arena = { gloria: 3, heroi: 'vigia', partida: { rodada: 'x' }, partidas: 1, melhorLugar: 2 };
    const r = deserialize(JSON.stringify({ v: 4, salvoEm: 1, estado: e }), C);
    expect(r.estado?.arena.partida).toBeNull();
    expect(r.estado?.arena.gloria).toBe(3);
  });

  it('rank inválido é recusado', () => {
    const e = { ...newGame(C, 7, 0), rank: 'sol' };
    expect(deserialize(JSON.stringify({ v: 4, salvoEm: 1, estado: e }), C).erro).toMatch(/rank/);
  });

  it('itens de base desconhecida somem ao carregar', () => {
    const e = newGame(C, 7, 0);
    e.mochila.push({ uid: 'a', base: 'naoExiste', raridade: 'comum', afixos: [] });
    e.mochila.push({
      uid: 'b',
      base: 'laminaDeCinza',
      raridade: 'comum',
      afixos: [{ id: 'sumiu', valor: 1 }],
    });
    const r = deserialize(serialize(e, 1), C);
    expect(r.estado?.mochila).toEqual([
      { uid: 'b', base: 'laminaDeCinza', raridade: 'comum', afixos: [] },
    ]);
  });
});
