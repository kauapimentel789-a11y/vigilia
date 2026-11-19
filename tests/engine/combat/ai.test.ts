import { describe, expect, it } from 'vitest';
import { allyIntent, endTurn, playCard, previewIntent } from '../../../src/engine/combat/index.ts';
import { TEST_CONTENT as C, enemyUid, inHand, setup } from './helpers.ts';

const filler = ['escudo', 'escudo', 'escudo', 'escudo', 'escudo'];

describe('intenções dos inimigos', () => {
  it('a ação executada é sempre a intenção que estava visível', () => {
    let s = setup(filler, ['ciclico', 'sorteado'], 42);
    for (let t = 0; t < 12 && !s.resultado; t++) {
      // Mantém o jogador vivo para observar muitos turnos.
      s = { ...s, jogador: { ...s.jogador, vida: 50 } };
      const visiveis = s.inimigos.map((i) => i.intencao);
      const r = endTurn(s, C);
      const executadas = r.eventos.flatMap((e) => (e.tipo === 'inimigoAgiu' ? [e.acao] : []));
      expect(executadas).toEqual(visiveis);
      s = r.estado;
    }
  });

  it('sequência segue a ordem definida', () => {
    let s = setup(filler, ['ciclico']);
    const vistas: (string | null)[] = [];
    for (let t = 0; t < 6; t++) {
      vistas.push(s.inimigos[0]!.intencao);
      s = endTurn(s, C).estado;
    }
    expect(vistas).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
  });

  it('pesos respeitam o máximo de repetições seguidas', () => {
    let s = setup(filler, ['sorteado'], 3);
    for (let t = 0; t < 30; t++)
      s = { ...endTurn(s, C).estado, jogador: { ...s.jogador, vida: 50 } };
    const hist = s.inimigos[0]!.ia.historico;
    for (let i = 2; i < hist.length; i++) {
      expect(hist[i] === hist[i - 1] && hist[i] === hist[i - 2]).toBe(false);
    }
  });

  it('o valor exibido acompanha Força, Fraco e Vulnerável', () => {
    let s = setup(filler, ['boneco']);
    expect(previewIntent(s, C, s.inimigos[0]!)?.danoJogador).toBe(6);
    s = { ...s, jogador: { ...s.jogador, status: { vulneravel: 1 } } };
    expect(previewIntent(s, C, s.inimigos[0]!)?.danoJogador).toBe(9);
  });
});

describe('regras especiais', () => {
  it('disparam uma única vez ao cruzar o limite, são anunciadas e não trocam a ação', () => {
    let s = setup(['golpe', 'golpe', 'golpe', 'golpe', 'golpe'], ['furioso']);
    s = { ...s, inimigos: s.inimigos.map((i) => ({ ...i, vida: 22 })) };
    const antes = s.inimigos[0]!.intencao;
    const r = playCard(s, C, { carta: inHand(s, 'golpe'), alvo: enemyUid(s) });
    expect(r.eventos).toContainEqual({
      tipo: 'especialAtivado',
      inimigo: enemyUid(s),
      anuncio: 'Fúria!',
    });
    s = r.estado;
    expect(s.inimigos[0]!.intencao).toBe(antes);
    expect(previewIntent(s, C, s.inimigos[0]!)?.danoJogador).toBe(12);
    const r2 = playCard(s, C, { carta: inHand(s, 'golpe'), alvo: enemyUid(s) });
    expect(r2.eventos.some((e) => e.tipo === 'especialAtivado')).toBe(false);
    expect(r2.estado.inimigos[0]!.status.forca).toBe(2);
  });
});

describe('aliado', () => {
  it('protege quando algum inimigo vai atacar, e o bloqueio soma ao do jogador', () => {
    let s = setup(['invocar', 'escudo', 'escudo', 'escudo', 'escudo'], ['boneco']);
    s = playCard(s, C, { carta: inHand(s, 'invocar') }).estado;
    s = playCard(s, C, { carta: inHand(s, 'escudo') }).estado;
    expect(allyIntent(s, C)?.id).toBe('proteger');
    const r = endTurn(s, C);
    expect(r.eventos).toContainEqual({ tipo: 'bloqueio', alvo: 'jogador', valor: 5 });
    // 5 do escudo + 5 do aliado = 10 de bloqueio contra 6 de dano.
    expect(r.estado.jogador.vida).toBe(50);
  });

  it('ataca o inimigo mais à esquerda quando nenhum vai atacar', () => {
    let s = setup(['invocar', ...filler], ['passivo', 'passivo']);
    s = playCard(s, C, { carta: inHand(s, 'invocar') }).estado;
    expect(allyIntent(s, C)?.id).toBe('atacar');
    s = endTurn(s, C).estado;
    expect(s.inimigos.map((i) => i.vida)).toEqual([26, 30]);
  });

  it('age na hora com uma ordem, e pode ser atingido e destruído', () => {
    let s = setup(['invocar', 'ordem', 'escudo', 'escudo', 'escudo'], ['ciclico']);
    s = playCard(s, C, { carta: inHand(s, 'invocar') }).estado;
    s = playCard(s, C, { carta: inHand(s, 'ordem') }).estado;
    expect(s.jogador.bloqueio).toBe(5);
    s = endTurn(s, C).estado; // a
    s = endTurn(s, C).estado; // b (+2 Força)
    s = { ...s, aliado: s.aliado ? { ...s.aliado, vida: 5 } : null };
    const r = endTurn(s, C); // c: 6 no jogador e no aliado
    expect(r.estado.aliado).toBeNull();
    expect(r.eventos.some((e) => e.tipo === 'derrotado' && e.alvo.startsWith('a'))).toBe(true);
  });

  it('invocar de novo recupera a vida do aliado em campo', () => {
    let s = setup(['invocar', 'invocar', 'escudo', 'escudo', 'escudo'], ['passivo']);
    s = playCard(s, C, { carta: s.mao.find((c) => c.defId === 'invocar')!.uid }).estado;
    s = { ...s, aliado: { ...s.aliado!, vida: 1 } };
    const r = playCard(s, C, { carta: inHand(s, 'invocar') });
    expect(r.estado.aliado?.vida).toBe(10);
    expect(r.eventos).toContainEqual({
      tipo: 'aliadoInvocado',
      aliado: 'guardiao',
      renovado: true,
    });
  });
});
