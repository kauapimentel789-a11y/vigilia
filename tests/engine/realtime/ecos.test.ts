import { describe, expect, it } from 'vitest';
import { CONTEUDO } from '../../../src/content/index.ts';
import { createWorld, stepWorld } from '../../../src/engine/realtime/world.ts';
import type { RtActor, RtEvent, RtInput, WorldState } from '../../../src/engine/realtime/state.ts';
import { ECO, heroOf } from '../../../src/engine/realtime/state.ts';
import type { HunterProfile } from '../../../src/engine/hunter/stats.ts';
import { buildProfile } from '../../../src/engine/hunter/stats.ts';
import { createHunter } from '../../../src/engine/hunter/hunter.ts';
import { newGame } from '../../../src/engine/game/game.ts';
import {
  ECOS,
  activeEcoProfile,
  addEco,
  awakening,
  bindChance,
  buyCrystals,
  feedActiveEco,
  releaseEco,
  setActiveEco,
  spendCrystal,
  xpToNext,
} from '../../../src/engine/game/ecos.ts';
import { deserialize, serialize } from '../../../src/engine/save/save.ts';

const C = CONTEUDO;
const BASE = buildProfile({ ...createHunter(C), level: 10 }, C);

function passo(w: WorldState, perfil: HunterProfile, input: RtInput = {}): RtEvent[] {
  return stepWorld(w, C, perfil, input);
}

/** Mundo com um único monstro comum colado no caçador. */
function duelo(perfil: HunterProfile = BASE, semente = 3) {
  const w = createWorld(C, 'cinza1', perfil, semente);
  const h = heroOf(w);
  const monstros = w.atores.filter((a) => a.lado === 'inimigo');
  const m = monstros.find((a) => !a.chefe) as RtActor;
  for (const a of monstros) if (a !== m) a.vida = 0;
  m.x = m.deX = h.x + 1;
  m.y = m.deY = h.y;
  return { w, h, m };
}

describe('vínculo de criaturas', () => {
  it('só aceita monstro comum abaixo de 30% de vida e por perto', () => {
    const { w, h, m } = duelo();
    h.alvo = m.uid;
    let ev = passo(w, BASE, { vincular: true });
    expect(ev.some((e) => e.tipo === 'vinculo')).toBe(false);
    expect(ev.some((e) => e.tipo === 'aviso' && e.texto.includes('Enfraqueça'))).toBe(true);

    m.vida = Math.floor(m.vidaMax * 0.2);
    m.x = m.deX = h.x + 6;
    ev = passo(w, BASE, { vincular: true });
    expect(ev.some((e) => e.tipo === 'aviso' && e.texto.includes('perto'))).toBe(true);
  });

  it('chefes não aceitam vínculo', () => {
    const w = createWorld(C, 'cinza1', BASE, 3);
    const h = heroOf(w);
    const chefe = w.atores.find((a) => a.chefe) as RtActor;
    chefe.vida = 1;
    chefe.x = chefe.deX = h.x + 1;
    chefe.y = chefe.deY = h.y;
    h.alvo = chefe.uid;
    const ev = passo(w, BASE, { vincular: true });
    expect(ev.some((e) => e.tipo === 'vinculo')).toBe(false);
  });

  it('um vínculo que pega tira o monstro do mapa sem abate', () => {
    let pegou = false;
    for (let s = 1; s < 40 && !pegou; s++) {
      const { w, h, m } = duelo(BASE, s);
      m.vida = 1;
      h.alvo = m.uid;
      const ev = passo(w, BASE, { vincular: true });
      const v = ev.find((e) => e.tipo === 'vinculo');
      expect(v).toBeDefined();
      if (v?.tipo === 'vinculo' && v.sucesso) {
        pegou = true;
        expect(m.vida).toBe(0);
        expect(ev.some((e) => e.tipo === 'abate')).toBe(false);
        expect(h.alvo).toBeNull();
      }
    }
    expect(pegou).toBe(true);
  });

  it('a chance sobe quanto mais fraco o monstro', () => {
    expect(bindChance(0.3)).toBeCloseTo(0.3);
    expect(bindChance(0.05)).toBeGreaterThan(bindChance(0.25));
    expect(bindChance(0)).toBeLessThanOrEqual(0.95);
  });
});

describe('Eco companheiro', () => {
  const perfilComEco = (afinidade: 'cinza' | 'brasa' | 'veu' = 'cinza', nivel = 1) => {
    let g = newGame(C, 1, 0);
    const r = addEco(g, C, 'carnical', afinidade);
    g = r.estado!;
    g.ecos!.lista[0]!.nivel = nivel;
    const eco = activeEcoProfile(g.ecos, C)!;
    return { ...BASE, eco } satisfies HunterProfile;
  };

  it('segue o caçador e ataca o alvo dele', () => {
    const perfil = perfilComEco();
    const { w, h, m } = duelo(perfil);
    const eco = w.atores.find((a) => a.uid === ECO);
    expect(eco).toBeDefined();
    h.alvo = m.uid;
    const ev: RtEvent[] = [];
    for (let i = 0; i < 40; i++) ev.push(...passo(w, perfil));
    expect(ev.some((e) => e.tipo === 'dano' && e.origem === ECO)).toBe(true);
    // Monstros nunca miram o Eco.
    expect(ev.some((e) => e.tipo === 'dano' && e.alvo === ECO)).toBe(false);
  });

  it('não ocupa tile: o caçador pode passar por ele', () => {
    const perfil = perfilComEco();
    const { w, h } = duelo(perfil);
    const eco = w.atores.find((a) => a.uid === ECO)!;
    eco.x = eco.deX = h.x + 1;
    eco.y = eco.deY = h.y;
    for (const a of w.atores) if (a.lado === 'inimigo') a.vida = 0;
    const x0 = h.x;
    for (let i = 0; i < 10 && h.x === x0; i++) passo(w, perfil, { dir: [1, 0] });
    expect(h.x).toBe(x0 + 1);
  });

  it('some do mapa quando o perfil fica sem Eco', () => {
    const perfil = perfilComEco();
    const { w } = duelo(perfil);
    passo(w, BASE);
    expect(w.atores.some((a) => a.uid === ECO)).toBe(false);
  });

  it('o Eco desperto de Véu cura o caçador', () => {
    const perfil = perfilComEco('veu', 10);
    const { w, h } = duelo(perfil);
    for (const a of w.atores) if (a.lado === 'inimigo') a.vida = 0;
    h.vida = Math.round(h.vidaMax / 2);
    const ev: RtEvent[] = [];
    for (let i = 0; i < 100; i++) ev.push(...passo(w, perfil));
    expect(ev.some((e) => e.tipo === 'cura' && e.alvo === h.uid)).toBe(true);
  });
});

describe('coleção de Ecos', () => {
  it('cristais custam ouro e o vínculo gasta um', () => {
    let g = newGame(C, 1, 0);
    expect(buyCrystals(g, 1).erro).toBeDefined();
    g.ouro = 100;
    g = buyCrystals(g, 2).estado!;
    expect(g.ecos!.cristais).toBe(4);
    expect(g.ouro).toBe(100 - 2 * ECOS.precoCristal);
    g = spendCrystal(g).estado!;
    expect(g.ecos!.cristais).toBe(3);
  });

  it('o primeiro Eco fica ativo; trocar e libertar funcionam', () => {
    let g = newGame(C, 1, 0);
    g = addEco(g, C, 'carnical', 'cinza').estado!;
    g = addEco(g, C, 'carnical', 'brasa').estado!;
    const [a, b] = g.ecos!.lista;
    expect(g.ecos!.ativo).toBe(a!.uid);
    g = setActiveEco(g, b!.uid).estado!;
    expect(activeEcoProfile(g.ecos, C)?.afinidade).toBe('brasa');
    g = releaseEco(g, b!.uid).estado!;
    expect(g.ecos!.ativo).toBeNull();
    expect(g.ecos!.lista).toHaveLength(1);
  });

  it('XP sobe níveis e desperta no 10 e no 20', () => {
    let g = newGame(C, 1, 0);
    g = addEco(g, C, 'carnical', 'cinza').estado!;
    let total = 0;
    for (let n = 1; n < 20; n++) total += xpToNext(n);
    const r = feedActiveEco(g, total);
    const eco = r.estado.ecos!.lista[0]!;
    expect(eco.nivel).toBe(20);
    expect(awakening(eco.nivel)).toBe(2);
    expect(awakening(10)).toBe(1);
    expect(activeEcoProfile(r.estado.ecos, C)!.mult).toBeGreaterThan(
      activeEcoProfile(g.ecos, C)!.mult,
    );
  });

  it('o save guarda os Ecos e um save sem eles começa vazio', () => {
    let g = newGame(C, 1, 0);
    g = addEco(g, C, 'carnical', 'veu').estado!;
    const lido = deserialize(serialize(g, 0), C);
    expect(lido.estado?.ecos?.lista[0]?.afinidade).toBe('veu');
    const antigo = structuredClone(g);
    delete antigo.ecos;
    const lido2 = deserialize(serialize(antigo, 0), C);
    expect(lido2.estado?.ecos?.lista).toEqual([]);
  });
});
