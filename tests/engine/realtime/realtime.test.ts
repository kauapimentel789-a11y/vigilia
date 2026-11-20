import { describe, expect, it } from 'vitest';
import { createWorld, stepWorld, strikeTiles } from '../../../src/engine/realtime/world.ts';
import { loadMap } from '../../../src/engine/realtime/world.ts';
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

describe('golpe forte com aviso no chão', () => {
  // O brutamontes alterna Soco e Esmagar (forte, ×3).
  const tanque = { ...PERFIL, stats: { ...PERFIL.stats, vidaMax: 5000, ataque: 1 } };

  function ateOPreparo(w: WorldState): RtEvent | undefined {
    for (let i = 0; i < 2000; i++) {
      const ev = stepWorld(w, C, tanque, {}).find((e) => e.tipo === 'preparo');
      if (ev) return ev;
    }
    return undefined;
  }

  it('avisa a área antes e acerta quem ficou nela', () => {
    const w = createWorld(C, 'arena', tanque, 5);
    const aviso = ateOPreparo(w);
    expect(aviso).toMatchObject({ tipo: 'preparo', nome: 'Esmagar' });
    const h = heroOf(w);
    expect(aviso?.tipo === 'preparo' && aviso.tiles).toContainEqual([h.x, h.y]);
    const antes = h.vida;
    const ev: RtEvent[] = [];
    for (let i = 0; i < 25; i++) ev.push(...stepWorld(w, C, tanque, {}));
    expect(ev.some((e) => e.tipo === 'esquiva')).toBe(false);
    expect(antes - heroOf(w).vida).toBeGreaterThanOrEqual(25);
  });

  it('sair da área evita o golpe', () => {
    const w = createWorld(C, 'arena', tanque, 5);
    ateOPreparo(w);
    const antes = heroOf(w).vida;
    const ev: RtEvent[] = [];
    for (let i = 0; i < 25; i++) ev.push(...stepWorld(w, C, tanque, { dir: [-1, 1] }));
    expect(ev.some((e) => e.tipo === 'esquiva')).toBe(true);
    expect(heroOf(w).vida).toBe(antes);
  });
});

describe('grupos', () => {
  it('quem é visto chama os vizinhos, mesmo atrás da parede', () => {
    const w = createWorld(C, 'grupo', PERFIL, 1);
    stepWorld(w, C, PERFIL, {});
    const [perto, longe] = w.atores.filter((a) => a.lado === 'inimigo');
    expect(perto?.agressivo).toBe(true);
    expect(longe?.agressivo).toBe(true);
  });
});

describe('objetos e poção', () => {
  it('ir até o baú de tesouro abre uma vez e deixa um item para pegar', () => {
    const w = createWorld(C, 'tesouro', PERFIL, 3);
    const ev = run(w, 60, (i) => (i === 0 ? { interagir: [5, 1] } : {}));
    expect(ev.find((e) => e.tipo === 'interagir')).toMatchObject({ objeto: 'tesouro' });
    expect(ev.some((e) => e.tipo === 'itemNoChao')).toBe(true);
    expect(w.chao).toHaveLength(1);
    expect(w.chao[0]?.item.raridade).not.toBe('comum');
    const de_novo = run(w, 5, (i) => (i === 0 ? { interagir: [5, 1] } : {}));
    expect(de_novo.some((e) => e.tipo === 'aviso')).toBe(true);
    expect(w.chao).toHaveLength(1);
  });

  it('a poção cura e entra em recarga', () => {
    const w = createWorld(C, 'arena', PERFIL, 1, 10);
    const ev = stepWorld(w, C, PERFIL, { pocao: true });
    expect(ev.find((e) => e.tipo === 'pocao')).toBeDefined();
    expect(heroOf(w).vida).toBe(10 + Math.round(PERFIL.stats.vidaMax * C.itens.pocao.curaPct));
    expect(stepWorld(w, C, PERFIL, { pocao: true }).some((e) => e.tipo === 'aviso')).toBe(true);
  });
});

describe('auto-caçar', () => {
  it('escolhe alvo, luta sozinho e vence o brutamontes', async () => {
    const { autoHuntInput } = await import('../../../src/engine/realtime/auto.ts');
    const forte = { ...PERFIL, stats: { ...PERFIL.stats, ataque: 60 } };
    const w = createWorld(C, 'arena', forte, 11);
    const ev: RtEvent[] = [];
    let pocoes = 3;
    for (let i = 0; i < 3000 && !w.chefeDerrotado && !ev.some((e) => e.tipo === 'abate'); i++) {
      const out = stepWorld(w, C, forte, autoHuntInput(w, C, forte, { pocoes }));
      if (out.some((e) => e.tipo === 'pocao')) pocoes--;
      ev.push(...out);
    }
    expect(ev.some((e) => e.tipo === 'abate')).toBe(true);
    expect(w.heroiCaido).toBe(false);
  });

  it('sai da área do golpe forte', async () => {
    const { autoHuntInput } = await import('../../../src/engine/realtime/auto.ts');
    const tanque = { ...PERFIL, stats: { ...PERFIL.stats, vidaMax: 5000, ataque: 1 } };
    const w = createWorld(C, 'arena', tanque, 5);
    const ev: RtEvent[] = [];
    for (let i = 0; i < 2000 && !ev.some((e) => e.tipo === 'esquiva'); i++)
      ev.push(...stepWorld(w, C, tanque, autoHuntInput(w, C, tanque, { pocoes: 0 })));
    expect(ev.some((e) => e.tipo === 'esquiva')).toBe(true);
  });
});

describe('chefes com mecânicas', () => {
  it('ao cair abaixo da fase, anuncia, invoca ajudantes e troca de golpes', () => {
    const w = createWorld(C, 'covil', PERFIL, 1);
    const chefe = w.atores.find((a) => a.chefe)!;
    chefe.vida = Math.round(chefe.vidaMax * 0.55);
    chefe.agressivo = true;
    const ev = run(w, 2);
    expect(ev.find((e) => e.tipo === 'especial')).toMatchObject({ anuncio: 'Chama ajuda' });
    const invocados = w.atores.filter((a) => a.invocado);
    expect(invocados).toHaveLength(2);
    expect(invocados.every((a) => a.agressivo && a.renascer < 0)).toBe(true);
    expect(chefe.acoesFase).toEqual(['anel']);
    expect(chefe.intencao).toBe('anel');
    // A fase não se repete.
    run(w, 5);
    expect(w.atores.filter((a) => a.invocado)).toHaveLength(2);
  });

  it('quando o chefe cai, os invocados se desfazem sem recompensa', () => {
    const w = createWorld(C, 'covil', PERFIL, 1);
    const chefe = w.atores.find((a) => a.chefe)!;
    chefe.vida = Math.round(chefe.vidaMax * 0.55);
    chefe.agressivo = true;
    run(w, 2);
    chefe.vida = 1;
    heroOf(w).alvo = chefe.uid;
    const ev = run(w, 400, () => ({ dir: [1, 1] }));
    expect(ev.some((e) => e.tipo === 'abate' && e.chefe)).toBe(true);
    expect(ev.filter((e) => e.tipo === 'desfeito')).toHaveLength(2);
    expect(w.atores.filter((a) => a.invocado && a.vida > 0)).toHaveLength(0);
  });

  it('formas de área: anel poupa quem encosta, cruz segue as linhas, em volta cerca o chefe', () => {
    const m = loadMap(C.mapas.covil!);
    const chefe = { x: 5, y: 3 };
    const heroi = { x: 2, y: 1 };
    const base = { id: 'x', nome: 'x', forte: true, efeitos: [] };
    const anel = strikeTiles(m, chefe, heroi, { ...base, forma: 'anel', area: 3 });
    expect(anel.some(([x, y]) => x === 4 && y === 3)).toBe(false);
    expect(anel.some(([x, y]) => x === 2 && y === 3)).toBe(true);
    const cruz = strikeTiles(m, chefe, heroi, { ...base, forma: 'cruz', area: 9 });
    expect(cruz.every(([x, y]) => x === 5 || y === 3)).toBe(true);
    expect(cruz.some(([x, y]) => x === 1 && y === 3)).toBe(true);
    expect(cruz.some(([x]) => x === 0)).toBe(false);
    const volta = strikeTiles(m, chefe, heroi, { ...base, forma: 'emVolta', area: 1 });
    expect(volta).toHaveLength(8);
    const alvo = strikeTiles(m, chefe, heroi, { ...base, area: 0 });
    expect(alvo).toEqual([[2, 1]]);
  });

  it('formas novas: X nas diagonais, faixa na direção do caçador, chuva sorteada e anel com raio mínimo', () => {
    const m = loadMap(C.mapas.covil!);
    const chefe = { x: 4, y: 2 };
    const heroi = { x: 6, y: 2 };
    const base = { id: 'x', nome: 'x', forte: true, efeitos: [] };
    const xis = strikeTiles(m, chefe, heroi, { ...base, forma: 'xis', area: 9 });
    expect(xis.every(([x, y]) => Math.abs(x - 4) === Math.abs(y - 2))).toBe(true);
    expect(xis.some(([x, y]) => x === 5 && y === 3)).toBe(true);
    const linha = strikeTiles(m, chefe, heroi, { ...base, forma: 'linha', area: 3 });
    expect(linha.every(([x]) => x > 4)).toBe(true);
    expect(linha.some(([x, y]) => x === 6 && y === 2)).toBe(true);
    expect(linha.some(([x, y]) => x === 5 && y === 1)).toBe(true);
    let n = 0;
    const rng = { next: () => ((n = (n * 9301 + 49297) % 233280), n / 233280) };
    const chuva = strikeTiles(
      m,
      chefe,
      heroi,
      { ...base, forma: 'chuva', area: 2, quantidade: 3 },
      rng,
    );
    expect(chuva.some(([x, y]) => x === 6 && y === 2)).toBe(true);
    expect(new Set(chuva.map(([x, y]) => `${x},${y}`)).size).toBe(chuva.length);
    const anel = strikeTiles(m, chefe, heroi, { ...base, forma: 'anel', area: 3, raioMin: 3 });
    expect(anel.every(([x, y]) => Math.max(Math.abs(x - 4), Math.abs(y - 2)) === 3)).toBe(true);
  });

  it('golpe encadeado prepara o seguinte, e o escudo dos ajudantes segura o dano', () => {
    const senhor = C.inimigos.senhor!;
    const conteudo = {
      ...C,
      inimigos: {
        ...C.inimigos,
        senhor: {
          ...senhor,
          acoes: [
            {
              id: 'onda1',
              nome: 'Onda',
              forte: true,
              forma: 'emVolta' as const,
              area: 1,
              seguinte: 'onda2',
              efeitos: [],
            },
            {
              id: 'onda2',
              nome: 'Onda 2',
              forte: true,
              soEncadeada: true,
              forma: 'anel' as const,
              raioMin: 2,
              area: 3,
              efeitos: [],
            },
          ],
          fases: [{ abaixoDe: 0.6, anuncio: 'Escudo', invocar: ['boneco'], escudoAjudantes: true }],
        },
      },
    };
    const w = createWorld(conteudo, 'covil', PERFIL, 1);
    const chefe = w.atores.find((a) => a.chefe)!;
    const ev: RtEvent[] = [];
    for (let i = 0; i < 400; i++) ev.push(...stepWorld(w, conteudo, PERFIL, {}));
    const preparos = ev
      .filter((e) => e.tipo === 'preparo')
      .map((e) => e.tipo === 'preparo' && e.nome);
    expect(preparos.slice(0, 2)).toEqual(['Onda', 'Onda 2']);
    expect(ev.some((e) => e.tipo === 'impacto')).toBe(true);
    // Fase com escudo: dano no chefe para no escudo enquanto o boneco vive.
    chefe.vida = Math.round(chefe.vidaMax * 0.5);
    for (let i = 0; i < 3; i++) stepWorld(w, conteudo, PERFIL, {});
    expect(chefe.blindado).toBe(true);
    const antes = chefe.vida;
    heroOf(w).alvo = chefe.uid;
    heroOf(w).x = chefe.x - 1;
    heroOf(w).y = chefe.y;
    for (let i = 0; i < 60; i++) stepWorld(w, conteudo, PERFIL, {});
    expect(chefe.vida).toBe(antes);
    for (const o of w.atores) if (o.invocado) o.vida = 0;
    for (let i = 0; i < 3; i++) stepWorld(w, conteudo, PERFIL, {});
    expect(chefe.blindado).toBe(false);
  });
});
