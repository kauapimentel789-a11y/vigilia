import { describe, expect, it } from 'vitest';
import { simulatePortal } from '../../../src/engine/autobattle/simulate.ts';
import type { BattleEvent } from '../../../src/engine/autobattle/state.ts';
import { computeHit } from '../../../src/engine/autobattle/damage.ts';
import type { BattleUnit } from '../../../src/engine/autobattle/state.ts';
import { TEST_CONTENT as C, profile } from '../../helpers.ts';

const run = (portal: string, mods = {}, semente = 1) =>
  simulatePortal({
    perfil: profile(mods),
    portal: C.portais[portal]!,
    content: C,
    semente,
    registrar: true,
  });

const of = <T extends BattleEvent['tipo']>(ev: BattleEvent[], tipo: T) =>
  ev.filter((e): e is Extract<BattleEvent, { tipo: T }> => e.tipo === tipo);

describe('combate automático', () => {
  it('vence o boneco e registra eventos em ordem de tempo', () => {
    const r = run('treino');
    expect(r.resultado).toBe('vitoria');
    expect(r.eventos.at(-1)).toMatchObject({ tipo: 'fim', resultado: 'vitoria' });
    for (let i = 1; i < r.eventos.length; i++) {
      expect(r.eventos[i]!.t).toBeGreaterThanOrEqual(r.eventos[i - 1]!.t);
    }
    expect(r.quadros.length).toBe(r.duracaoMs / C.progressao.combate.tickMs + 1);
  });

  it('passa pelas ondas sem recuperar a vida', () => {
    const r = run('caos', {}, 3);
    const ondas = of(r.eventos, 'onda');
    expect(ondas.map((o) => o.onda)).toEqual(
      r.resultado === 'vitoria' ? [1, 2] : ondas.map((o) => o.onda),
    );
    expect(ondas[0]!.total).toBe(2);
    // A vida do caçador no início da onda 2 é a mesma do fim da onda 1.
    if (ondas[1]) {
      const quadro = r.quadros.find((q) => q.onda === 2)!;
      expect(quadro.unidades[0]!.vida).toBeLessThan(quadro.unidades[0]!.vidaMax);
    }
  });

  it('derrota por tempo esgotado no limite', () => {
    const r = run('eterno');
    expect(r.resultado).toBe('derrota');
    expect(r.motivo).toBe('tempoEsgotado');
    expect(r.duracaoMs).toBe(C.progressao.combate.limiteS * 1000);
  });

  it('usa habilidades por prioridade e o ataque básico quando nada está pronto', () => {
    const r = run('treino', { equipadas: ['corteRapido'] });
    const acoes = of(r.eventos, 'acao').filter((a) => a.ator === 'cacador');
    expect(acoes[0]!.acao).toBe('corteRapido');
    expect(acoes[1]!.acao).toBe('basico');
    // Entre dois usos do Corte Rápido passa pelo menos a recarga.
    const usos = acoes.filter((a) => a.acao === 'corteRapido').map((a) => a.t);
    const recarga = profile({ equipadas: ['corteRapido'] }).habilidades[0]!.recargaMs;
    for (let i = 1; i < usos.length; i++)
      expect(usos[i]! - usos[i - 1]!).toBeGreaterThanOrEqual(recarga);
  });

  it('Guarda "contra golpe forte" só é usada quando um golpe forte está anunciado', () => {
    const r = run('bruto', {
      level: 10,
      equipadas: ['guardaCinzenta'],
      comportamento: { alvo: 'menorVida', curaAbaixoPct: 50, defesa: 'contraGolpeForte' },
    });
    const guardas = of(r.eventos, 'acao').filter((a) => a.acao === 'guardaCinzenta');
    expect(guardas.length).toBeGreaterThan(0);
    for (const g of guardas) {
      const ultimaIntencao = of(r.eventos, 'intencao')
        .filter((i) => i.t <= g.t)
        .at(-1);
      expect(ultimaIntencao?.forte).toBe(true);
    }
  });

  it('cura só abaixo do percentual escolhido', () => {
    const r = run('bruto', {
      level: 10,
      equipadas: ['folegoDaVigilia'],
      comportamento: { alvo: 'menorVida', curaAbaixoPct: 40, defesa: 'pronta' },
    });
    const curas = of(r.eventos, 'acao').filter((a) => a.acao === 'folegoDaVigilia');
    expect(curas.length).toBeGreaterThan(0);
    for (const c of curas) {
      const quadro = [...r.quadros].reverse().find((q) => q.t < c.t)!;
      const h = quadro.unidades[0]!;
      expect((h.vida / h.vidaMax) * 100).toBeLessThan(40);
    }
  });

  it('veneno tira vida a cada segundo e diminui 1 por segundo', () => {
    const r = run('treino', { level: 3, equipadas: ['laminaVenenosa'] });
    const perdas = of(r.eventos, 'perdaDeVida').filter((p) => p.motivo === 'veneno');
    expect(perdas.length).toBeGreaterThan(1);
    expect(perdas.every((p) => p.t % 1000 === 0)).toBe(true);
    expect(perdas[1]!.valor).toBe(perdas[0]!.valor - 1);
  });

  it('o especial dispara uma vez, abaixo do limite de vida', () => {
    for (let s = 1; s <= 10; s++) {
      const r = run('caos', { level: 8 }, s);
      const especiais = of(r.eventos, 'especial');
      const porInimigo = new Set(especiais.map((e) => e.inimigo));
      expect(porInimigo.size).toBe(especiais.length);
    }
  });

  it('a intenção anunciada é sempre a ação executada', () => {
    for (let s = 1; s <= 20; s++) {
      const r = run('caos', { level: 6 }, s);
      const anunciada = new Map<string, string>();
      for (const e of r.eventos) {
        if (e.tipo === 'intencao') anunciada.set(e.inimigo, e.acao);
        if (e.tipo === 'acao' && e.ator !== 'cacador') expect(e.acao).toBe(anunciada.get(e.ator));
      }
    }
  });
});

describe('fórmula de dano', () => {
  const unidade = (mods: Partial<BattleUnit> = {}): BattleUnit => ({
    uid: 'u',
    defId: 'u',
    nome: 'u',
    lado: 'inimigo',
    vida: 100,
    vidaMax: 100,
    bloqueio: 0,
    status: {},
    ataque: 10,
    velocidade: 100,
    reducao: 0,
    critico: 0,
    danoCritico: 2,
    carga: 0,
    intencao: null,
    cicloIndice: 0,
    especialUsado: false,
    ...mods,
  });

  it('aplica Força, Fraco, Marca, Vulnerável, crítico e redução', () => {
    expect(computeHit(unidade(), unidade(), 1.5, false)).toBe(15);
    expect(computeHit(unidade({ status: { forca: 2 } }), unidade(), 1, false)).toBe(12);
    expect(computeHit(unidade({ status: { fraco: 1 } }), unidade(), 1, false)).toBe(8);
    expect(computeHit(unidade(), unidade({ status: { vulneravel: 1 } }), 1, false)).toBe(15);
    expect(computeHit(unidade(), unidade({ status: { marca: 2 } }), 1, false)).toBe(12);
    expect(computeHit(unidade(), unidade(), 1, true)).toBe(20);
    expect(computeHit(unidade(), unidade({ reducao: 0.3 }), 1, false)).toBe(7);
  });
});
