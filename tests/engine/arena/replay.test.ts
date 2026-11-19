import { describe, expect, it } from 'vitest';
import {
  createMatch,
  endRound,
  myRetrato,
  replayMatch,
  sanitizeRetrato,
} from '../../../src/engine/arena/index.ts';
import type { ArenaRetrato } from '../../../src/engine/arena/index.ts';
import type { GameState } from '../../../src/engine/game/game.ts';
import { arenaAction, playArenaRound, startArenaMatch } from '../../../src/engine/game/arena.ts';
import { newGame } from '../../../src/engine/game/game.ts';
import { TEST_CONTENT as C } from '../../helpers.ts';

/** Joga uma partida inteira só por comandos (como a tela faz). */
function jogar(rivais: ArenaRetrato[] = []): GameState {
  let e = startArenaMatch(newGame(C, 11, 0), C, rivais, 'Teste').estado!;
  for (let guarda = 0; guarda < 40 && !e.arena.partida!.fim; guarda++) {
    const m = e.arena.partida!;
    const eu = m.jogadores[0]!;
    for (let slot = 0; slot < eu.loja.length; slot++) {
      const r = arenaAction(e, C, { t: 'comprar', slot });
      if (r.estado) e = r.estado;
    }
    const agora = e.arena.partida!.jogadores[0]!;
    for (const u of agora.banco) {
      if (!u) continue;
      const livre = e.arena.partida!.jogadores[0]!.tabuleiro.indexOf(null);
      if (livre < 0) break;
      const r = arenaAction(e, C, {
        t: 'mover',
        uid: u.uid,
        destino: { onde: 'tabuleiro', i: livre },
      });
      if (r.estado) e = r.estado;
    }
    e = playArenaRound(e, C).estado!;
  }
  return e;
}

describe('registro e reprodução da partida', () => {
  it('refazer os comandos chega à mesma colocação e ao mesmo time', () => {
    const e = jogar();
    const m = e.arena.partida!;
    expect(m.fim).toBe(true);
    const reg = e.arena.registro!;
    expect(reg.comandos.filter((c) => c.t === 'lutar')).toHaveLength(m.rodada);
    const r = replayMatch(C, reg.inicio, reg.comandos);
    expect(r.erro).toBeUndefined();
    expect(r.erro === undefined && r.partida).toEqual(m);
    expect(r.erro === undefined && r.retrato).toEqual(myRetrato(m));
  });

  it('comandos adulterados não passam', () => {
    const reg = jogar().arena.registro!;
    const extra = replayMatch(C, reg.inicio, [...reg.comandos, { t: 'lutar' }]);
    expect(extra.erro).toMatch(/depois do fim/);
    const curto = replayMatch(C, reg.inicio, reg.comandos.slice(0, -1));
    expect(curto.erro).toMatch(/não terminou/);
    const falso = replayMatch(C, reg.inicio, [{ t: 'vender', uid: 'u999' }, ...reg.comandos]);
    expect(falso.erro).toMatch(/recusado/);
  });
});

describe('rivais de outros jogadores', () => {
  it('a sombra luta com o time gravado de cada rodada', () => {
    const retrato = myRetrato(jogar().arena.partida!)!;
    expect(retrato.times.length).toBeGreaterThan(0);
    const m = createMatch(C, 3, 'vigia', 'Eu', [retrato]);
    const sombra = m.jogadores[1]!;
    expect(sombra.nome).toBe('Teste');
    expect(sombra.sombra).toBeDefined();
    const r = endRound(m, C);
    const tab = r.partida!.jogadores[1]!.tabuleiro.map((u) => u && [u.def, u.estrelas]);
    expect(tab).toEqual(retrato.times[0]!.map((u) => u && [u.def, u.estrelas]));
    // Os outros rivais seguem controlados pelo jogo.
    expect(m.jogadores[2]!.sombra).toBeUndefined();
  });

  it('retratos estranhos são recusados', () => {
    const bom = { nome: 'A', heroi: 'vigia', times: [[{ uid: 'x', def: 'x', estrelas: 1 }]] };
    expect(sanitizeRetrato(C, bom)).toBeNull(); // unidade que não existe
    const def = Object.keys(C.arena.unidades)[0]!;
    const ok = { nome: 'A', heroi: 'vigia', times: [[{ uid: 'q', def, estrelas: 2 }, null]] };
    expect(sanitizeRetrato(C, ok)?.times[0]![0]).toEqual({ uid: 'x', def, estrelas: 2 });
    expect(sanitizeRetrato(C, { ...ok, heroi: 'ninguem' })).toBeNull();
    expect(sanitizeRetrato(C, { ...ok, times: [[{ def, estrelas: 4 }]] })).toBeNull();
    const muitos = new Array(C.arena.regras.nivelMax + 1).fill({ def, estrelas: 1 });
    expect(sanitizeRetrato(C, { ...ok, times: [muitos] })).toBeNull();
  });
});
