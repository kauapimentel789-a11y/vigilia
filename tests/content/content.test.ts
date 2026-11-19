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

  it('9 habilidades comuns + 4 por classe, com recarga positiva', () => {
    const lista = Object.values(C.habilidades);
    expect(lista.filter((h) => !h.classe)).toHaveLength(9);
    for (const c of Object.keys(C.classes))
      expect(lista.filter((h) => h.classe === c)).toHaveLength(4);
    for (const h of lista) {
      expect(h.recarga).toBeGreaterThan(0);
      expect(h.desbloqueio).toBeLessThanOrEqual(C.progressao.levelMax);
      checkEffects(h.efeitos);
    }
    expect(lista.filter((h) => h.desbloqueio <= 1).length).toBeGreaterThanOrEqual(1);
  });

  it('inimigos com ações válidas, ids de ação únicos e fases coerentes', () => {
    const lista = Object.values(C.inimigos);
    expect(lista.length).toBeGreaterThanOrEqual(18);
    for (const i of lista) {
      expect(i.acoes.length).toBeGreaterThan(0);
      expect(new Set(i.acoes.map((a) => a.id)).size).toBe(i.acoes.length);
      for (const a of i.acoes) checkEffects(a.efeitos);
      if (i.especial) checkEffects(i.especial.efeitos);
      let antes = Infinity;
      for (const f of i.fases ?? []) {
        expect(f.abaixoDe).toBeLessThan(antes);
        antes = f.abaixoDe;
        checkEffects(f.efeitos ?? []);
        for (const id of f.invocar ?? []) expect(C.inimigos[id]).toBeDefined();
        for (const id of f.acoes ?? []) expect(i.acoes.some((a) => a.id === id)).toBe(true);
      }
    }
  });

  it('portais alcançáveis em sequência, só com inimigos existentes', () => {
    expect(C.ordemPortais).toHaveLength(11);
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

  it('Selos e Exame de Rank apontam para conteúdo existente', () => {
    for (const p of Object.values(C.portais)) {
      if (p.selo) expect(C.selos[p.selo]).toBeDefined();
      if (p.promove) expect(C.ranks[p.promove]).toBeDefined();
      expect(C.ranks[p.rank]).toBeDefined();
    }
    const exames = Object.values(C.portais).filter((p) => p.promove === 'brasa');
    expect(exames).toHaveLength(1);
    for (const p of Object.values(C.portais).filter((x) => x.rank === 'brasa'))
      expect(p.levelRecomendado).toBeGreaterThan(exames[0]!.levelRecomendado);
  });
});

describe('mapas', () => {
  it('todos os mapas carregam, com monstros, portais e portões válidos', async () => {
    const { CONTEUDO } = await import('../../src/content/index.ts');
    const { createWorld } = await import('../../src/engine/realtime/world.ts');
    const { buildProfile } = await import('../../src/engine/hunter/stats.ts');
    const { createHunter } = await import('../../src/engine/hunter/hunter.ts');
    const perfil = buildProfile(createHunter(CONTEUDO), CONTEUDO);
    for (const m of Object.values(CONTEUDO.mapas)) {
      const w = createWorld(CONTEUDO, m.id, perfil, 1);
      expect(w.atores.length).toBeGreaterThan(m.tipo === 'portal' ? 5 : 0);
      if (m.portal) expect(CONTEUDO.portais[m.portal]).toBeDefined();
      for (const g of Object.values(m.legenda.portoes ?? {}))
        expect(CONTEUDO.mapas[g.destino]).toBeDefined();
      if (m.tipo === 'portal') expect(w.atores.filter((a) => a.chefe)).toHaveLength(1);
      // Do início dá para chegar a todos os monstros e portões.
      const { loadMap } = await import('../../src/engine/realtime/world.ts');
      const { canStep, DIRECOES } = await import('../../src/engine/world/path.ts');
      const mapa = loadMap(m);
      const visto = new Set([mapa.inicio.y * mapa.largura + mapa.inicio.x]);
      const fila = [[mapa.inicio.x, mapa.inicio.y] as [number, number]];
      while (fila.length > 0) {
        const [x, y] = fila.pop()!;
        for (const [dx, dy] of DIRECOES) {
          const i = (y + dy) * mapa.largura + x + dx;
          if (visto.has(i) || !canStep(mapa, x, y, dx, dy, () => false)) continue;
          visto.add(i);
          fila.push([x + dx, y + dy]);
        }
      }
      for (const a of w.atores)
        expect(visto.has(a.y * mapa.largura + a.x), `${m.id} ${a.nome}`).toBe(true);
      for (const k of Object.keys(mapa.portoes))
        expect(visto.has(Number(k)), `${m.id} portão`).toBe(true);
    }
    expect(CONTEUDO.mapas[CONTEUDO.mapaInicial]?.tipo).toBe('posto');
  });

  it('todo portal tem mapa e tabela de saque', async () => {
    const { CONTEUDO } = await import('../../src/content/index.ts');
    for (const id of CONTEUDO.ordemPortais) {
      expect(Object.values(CONTEUDO.mapas).some((m) => m.portal === id)).toBe(true);
      const faixas = CONTEUDO.itens.saquePorPortal[id] ?? [];
      expect(Object.values(CONTEUDO.itens.bases).some((b) => faixas.includes(b.nivel))).toBe(true);
    }
  });
});
