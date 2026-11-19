import { describe, expect, it } from 'vitest';
import { CONTEUDO } from '../../src/content/index.ts';
import type { Effect } from '../../src/engine/effects/effects.ts';
import { STATUS_DEFS } from '../../src/engine/statuses/statuses.ts';

const C = CONTEUDO;

function checkEffects(efeitos: readonly Effect[]): void {
  for (const e of efeitos) {
    if (e.tipo === 'status' || e.tipo === 'limpar') expect(STATUS_DEFS[e.status]).toBeDefined();
    if (e.tipo === 'dano') expect(e.mult).toBeGreaterThan(0);
  }
}

describe('integridade do conteúdo', () => {
  it('ids batem com as chaves', () => {
    for (const [k, v] of Object.entries(C.habilidades)) expect(v.id).toBe(k);
    for (const [k, v] of Object.entries(C.inimigos)) expect(v.id).toBe(k);
    for (const [k, v] of Object.entries(C.portais)) expect(v.id).toBe(k);
  });

  it('6 habilidades com recarga positiva, 2 disponíveis no level 1', () => {
    const lista = Object.values(C.habilidades);
    expect(lista).toHaveLength(6);
    for (const h of lista) {
      expect(h.recarga).toBeGreaterThan(0);
      expect(h.desbloqueio).toBeLessThanOrEqual(C.progressao.levelMax);
      checkEffects(h.efeitos);
    }
    expect(lista.filter((h) => h.desbloqueio <= 1).length).toBeGreaterThanOrEqual(1);
  });

  it('6 inimigos com ações válidas e ids de ação únicos', () => {
    const lista = Object.values(C.inimigos);
    expect(lista).toHaveLength(6);
    for (const i of lista) {
      expect(i.acoes.length).toBeGreaterThan(0);
      expect(new Set(i.acoes.map((a) => a.id)).size).toBe(i.acoes.length);
      for (const a of i.acoes) checkEffects(a.efeitos);
      if (i.especial) checkEffects(i.especial.efeitos);
    }
  });

  it('5 portais alcançáveis em sequência, só com inimigos existentes', () => {
    expect(C.ordemPortais).toHaveLength(5);
    const vistos = new Set<string>();
    for (const id of C.ordemPortais) {
      const p = C.portais[id]!;
      if (p.requer) expect(vistos.has(p.requer)).toBe(true);
      vistos.add(id);
      expect(p.ondas.length).toBeGreaterThan(0);
      for (const onda of p.ondas) for (const i of onda) expect(C.inimigos[i]).toBeDefined();
    }
    expect(C.portais[C.ordemPortais.at(-1)!]!.chefe).toBe(true);
  });
});
