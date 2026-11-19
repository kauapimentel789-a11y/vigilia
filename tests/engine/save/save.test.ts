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
