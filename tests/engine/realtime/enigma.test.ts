import { describe, expect, it } from 'vitest';
import { CONTEUDO } from '../../../src/content/index.ts';
import { createWorld, loadMap, stepWorld } from '../../../src/engine/realtime/world.ts';
import type { RtEvent, RtInput, WorldState } from '../../../src/engine/realtime/state.ts';
import { heroOf } from '../../../src/engine/realtime/state.ts';
import { buildProfile } from '../../../src/engine/hunter/stats.ts';
import { createHunter } from '../../../src/engine/hunter/hunter.ts';

const C = CONTEUDO;
const PERFIL = buildProfile({ ...createHunter(C), level: 10 }, C);

function passo(w: WorldState, input: RtInput = {}): RtEvent[] {
  return stepWorld(w, C, PERFIL, input);
}

/** Põe o caçador ao lado do tile e dá um passo para cima dele. */
function pisar(w: WorldState, x: number, y: number): RtEvent[] {
  const h = heroOf(w);
  h.x = h.deX = x - 1;
  h.y = h.deY = y;
  h.moverRestante = 0;
  h.caminho = [];
  const ev: RtEvent[] = [];
  for (let i = 0; i < 30 && (h.x !== x || h.y !== y); i++) ev.push(...passo(w, { dir: [1, 0] }));
  ev.push(...passo(w));
  return ev;
}

function preparar() {
  const w = createWorld(C, 'cinza1', PERFIL, 5);
  // Sem monstros por perto atrapalhando.
  for (const a of w.atores) if (a.lado === 'inimigo') a.vida = 0;
  const m = loadMap(C.mapas.cinza1!);
  const idx = Number(Object.keys(m.objetos).find((k) => m.objetos[Number(k)] === 'relicario'));
  const rx = idx % m.largura;
  const ry = (idx - rx) / m.largura;
  const runas = Object.entries(m.runas).map(([i, r]) => {
    const x = Number(i) % m.largura;
    return { r, x, y: (Number(i) - x) / m.largura };
  });
  const h = heroOf(w);
  h.x = h.deX = rx + 1;
  h.y = h.deY = ry + 1;
  const ev = passo(w, { interagir: [rx, ry] });
  ev.push(...passo(w));
  return { w, runas, ev };
}

describe('enigma do relicário', () => {
  it('todo mapa de portal (menos os exames) tem relicário com runas', () => {
    for (const def of Object.values(C.mapas)) {
      if (def.tipo !== 'portal' || def.id.startsWith('exame')) continue;
      const m = loadMap(def);
      expect(Object.values(m.objetos), def.id).toContain('relicario');
      expect(new Set(Object.values(m.runas)).size, def.id).toBe(4);
    }
  });

  it('pisar na ordem certa abre o relicário e solta uma peça rara', () => {
    const { w, runas, ev } = preparar();
    expect(ev.some((e) => e.tipo === 'enigma')).toBe(true);
    const seq = w.enigma!.sequencia;
    expect(seq.length).toBe(3);
    const todos: RtEvent[] = [];
    for (const r of seq) {
      const alvo = runas.find((x) => x.r === r)!;
      todos.push(...pisar(w, alvo.x, alvo.y));
    }
    expect(todos.some((e) => e.tipo === 'enigmaResolvido')).toBe(true);
    expect(w.enigma!.resolvido).toBe(true);
    expect(w.chao.some((c) => c.item.raridade === 'rara')).toBe(true);
  });

  it('errar a runa chama guardiões e tira vida; dá para tentar de novo', () => {
    const { w, runas } = preparar();
    const errada = runas.find((x) => x.r !== w.enigma!.sequencia[0])!;
    const vida = heroOf(w).vida;
    const ev = pisar(w, errada.x, errada.y);
    expect(ev.some((e) => e.tipo === 'enigmaFalhou')).toBe(true);
    expect(ev.filter((e) => e.tipo === 'invocado').length).toBeGreaterThan(0);
    expect(heroOf(w).vida).toBeLessThan(vida);
    expect(w.enigma!.ativo).toBe(false);
  });

  it('o tempo acaba se o caçador demorar', () => {
    const { w } = preparar();
    const ev: RtEvent[] = [];
    for (let i = 0; i < 400 && w.enigma!.ativo; i++) ev.push(...passo(w));
    expect(ev.some((e) => e.tipo === 'enigmaFalhou' && e.motivo === 'tempo')).toBe(true);
  });
});
