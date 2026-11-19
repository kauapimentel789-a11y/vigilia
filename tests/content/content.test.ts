import { describe, expect, it } from 'vitest';
import { CARDS, TEST_DECK } from '../../src/content/cards.ts';
import { ALLIES, ENEMIES } from '../../src/content/units.ts';
import { CONTENT, ENCOUNTERS } from '../../src/content/encounters.ts';
import type { Effect } from '../../src/engine/combat/index.ts';

const unique = (ids: string[]) => new Set(ids).size === ids.length;

function walk(efeitos: readonly Effect[], visit: (e: Effect) => void): void {
  for (const e of efeitos) {
    visit(e);
    if (e.tipo === 'ritual') walk(e.efeitos, visit);
  }
}

describe('integridade do conteúdo', () => {
  it('ids únicos', () => {
    expect(unique(CARDS.map((c) => c.id))).toBe(true);
    expect(unique(ENEMIES.map((e) => e.id))).toBe(true);
    expect(unique(ALLIES.map((a) => a.id))).toBe(true);
    expect(unique(ENCOUNTERS.map((e) => e.id))).toBe(true);
  });

  it('o deck de teste tem 15 cartas e só cartas existentes', () => {
    expect(TEST_DECK).toHaveLength(15);
    for (const id of TEST_DECK) expect(CONTENT.cartas[id]).toBeDefined();
    expect(new Set(TEST_DECK).size).toBe(CARDS.length);
  });

  it('cartas têm custos válidos e alvo coerente com os efeitos', () => {
    for (const carta of CARDS) {
      expect(carta.custo).toBeGreaterThanOrEqual(0);
      if (carta.avivar) expect(carta.avivar.custo).toBeGreaterThan(0);
      const efeitos = [...carta.efeitos, ...(carta.avivar?.efeitos ?? [])];
      let usaEscolhido = false;
      walk(efeitos, (e) => {
        if ('alvo' in e && e.alvo === 'escolhido') usaEscolhido = true;
        if (e.tipo === 'invocar') expect(CONTENT.aliados[e.aliado]).toBeDefined();
      });
      expect(usaEscolhido, carta.id).toBe(carta.alvo === 'inimigo');
    }
  });

  it('inimigos: padrões referenciam ações existentes', () => {
    for (const inimigo of ENEMIES) {
      const acoes = new Set(inimigo.acoes.map((a) => a.id));
      const usadas =
        inimigo.padrao.tipo === 'sequencia'
          ? inimigo.padrao.ordem
          : inimigo.padrao.pesos.map((p) => p.acao);
      for (const id of usadas) expect(acoes.has(id), `${inimigo.id}:${id}`).toBe(true);
      for (const acao of inimigo.acoes) {
        const ataca = acao.efeitos.some((e) => e.tipo === 'dano');
        expect(acao.tipos.includes('ataque'), `${inimigo.id}:${acao.id}`).toBe(ataca);
      }
    }
  });

  it('encontros referenciam inimigos existentes', () => {
    for (const encontro of ENCOUNTERS) {
      for (const id of encontro.inimigos) expect(CONTENT.inimigos[id]).toBeDefined();
    }
  });
});
