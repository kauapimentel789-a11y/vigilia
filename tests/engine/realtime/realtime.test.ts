import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld } from '../../../src/engine/realtime/world.ts';
import type { RtEvent, RtInput, WorldState } from '../../../src/engine/realtime/state.ts';
import { heroOf } from '../../../src/engine/realtime/state.ts';
import { TEST_CONTENT as C, profile } from '../../helpers.ts';

const PERFIL = profile({ level: 10 });

function run(w: WorldState, passos: number, input: (i: number) => RtInput = () => ({})): RtEvent[] {
  const ev: RtEvent[] = [];
  for (let i = 0; i < passos; i++) ev.push(...stepWorld(w, C, PERFIL, input(i)));
  return ev;
}

const monstro = (w: WorldState) => w.atores.find((a) => a.lado === 'inimigo');

describe('mundo em tempo real', () => {
  it('cria o caçador no início e o monstro escalado pelo portal', () => {
    const w = createWorld(C, 'arena', PERFIL, 1);
    expect(heroOf(w)).toMatchObject({ x: 2, y: 1, vida: PERFIL.stats.vidaMax });
    const m = monstro(w);
    expect(m).toMatchObject({ defId: 'brutamontes', x: 7, y: 3 });
  });

  it('anda com a direção segurada e respeita paredes', () => {
    const w = createWorld(C, 'arena', PERFIL, 1);
    run(w, 20, () => ({ dir: [0, -1] }));
    expect(heroOf(w).y).toBe(1);
    run(w, 40, () => ({ dir: [0, 1] }));
    expect(heroOf(w).y).toBe(4);
  });

  it('emite o evento de portão ao pisar nele', () => {
    const w = createWorld(C, 'base', PERFIL, 1);
    const ev = run(w, 60, () => ({ dir: [1, 0] }));
    expect(ev.find((e) => e.tipo === 'portao')).toMatchObject({ destino: 'arena' });
  });

  it('o monstro nota o caçador e vem atacar', () => {
    const w = createWorld(C, 'arena', PERFIL, 1);
    const ev = run(w, 200);
    expect(monstro(w)?.agressivo).toBe(true);
    expect(ev.some((e) => e.tipo === 'dano' && e.alvo === 'heroi')).toBe(true);
  });

  it('com alvo, o caçador persegue, ataca e abate', () => {
    const forte = { ...PERFIL, stats: { ...PERFIL.stats, ataque: 150 } };
    const w = createWorld(C, 'arena', forte, 7);
    const id = monstro(w)?.uid as string;
    const ev: RtEvent[] = [];
    for (let i = 0; i < 600; i++) ev.push(...stepWorld(w, C, forte, i === 0 ? { alvo: id } : {}));
    expect(w.heroiCaido).toBe(false);
    const abate = ev.find((e) => e.tipo === 'abate');
    expect(abate).toMatchObject({ alvo: id, defId: 'brutamontes' });
    expect(w.atores.find((a) => a.uid === id)?.renascer).toBeGreaterThan(0);
  });

  it('é determinístico: mesma semente e comandos, mesmo resultado', () => {
    const roteiro = (i: number): RtInput =>
      i === 0 ? { alvo: 'm1' } : i % 50 === 0 ? { habilidade: 0 } : {};
    const a = createWorld(C, 'arena', PERFIL, 42);
    const b = createWorld(C, 'arena', PERFIL, 42);
    const ea = run(a, 600, roteiro);
    const eb = run(b, 600, roteiro);
    expect(ea).toEqual(eb);
    expect(a).toEqual(b);
  });

  it('o caçador cai e o mundo para', () => {
    const fraco = profile({ level: 1 });
    const w = createWorld(C, 'arena', fraco, 3, 5);
    const ev: RtEvent[] = [];
    for (let i = 0; i < 2000 && !w.heroiCaido; i++) ev.push(...stepWorld(w, C, fraco, {}));
    expect(w.heroiCaido).toBe(true);
    expect(ev.filter((e) => e.tipo === 'heroiCaiu')).toHaveLength(1);
    expect(stepWorld(w, C, fraco, {})).toEqual([]);
  });

  it('habilidade sem alvo avisa e não gasta a recarga', () => {
    const w = createWorld(C, 'arena', PERFIL, 1);
    const ev = stepWorld(w, C, PERFIL, { habilidade: 0 });
    expect(ev.some((e) => e.tipo === 'aviso')).toBe(true);
    const id = PERFIL.habilidades[0]?.def.id as string;
    expect(w.recargas[id]).toBe(0);
  });
});
