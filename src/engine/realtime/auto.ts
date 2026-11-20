/**
 * Auto-caçar: escolhe os comandos do caçador a cada passo, como um jogador
 * cuidadoso. Usa o comportamento da Etapa 2 (quando curar, quando defender).
 *
 * É uma função pura: lê o mundo e devolve um RtInput. A interface só a usa em
 * portais já fechados; o simulador usa para medir ritmo.
 */
import type { GameContent } from '../definitions.ts';
import type { HunterProfile } from '../hunter/stats.ts';
import { actorEnemyDef, loadMap } from './world.ts';
import type { RtActor, RtInput, WorldState } from './state.ts';
import { HEROI } from './state.ts';
import { DIRECOES, canStep } from '../world/path.ts';
import type { WorldMap } from '../world/map.ts';
import { chebyshev } from '../world/map.ts';
import { hasLineOfSight } from '../world/los.ts';

export interface AutoOptions {
  /** Poções disponíveis. */
  pocoes: number;
  /** Bebe poção abaixo desta fração da vida. */
  pocaoAbaixo?: number;
  /** Mochila cheia: não adianta ir atrás de itens. */
  mochilaCheia?: boolean;
}

const vivo = (a: RtActor) => a.vida > 0;

/** Primeiro passo do caminho mais curto até um tile fora de `perigo`. */
function escapeStep(
  m: WorldMap,
  x0: number,
  y0: number,
  perigo: ReadonlySet<number>,
  ocupado: (x: number, y: number) => boolean,
): readonly [number, number] | undefined {
  const primeiro = new Map<number, readonly [number, number]>();
  let fronteira: Array<[number, number]> = [[x0, y0]];
  const visto = new Set([y0 * m.largura + x0]);
  for (let passo = 0; passo < 9 && fronteira.length > 0; passo++) {
    const proxima: Array<[number, number]> = [];
    for (const [x, y] of fronteira) {
      for (const d of DIRECOES) {
        const nx = x + d[0];
        const ny = y + d[1];
        const i = ny * m.largura + nx;
        if (visto.has(i) || !canStep(m, x, y, d[0], d[1], ocupado)) continue;
        visto.add(i);
        const dir =
          passo === 0 ? d : (primeiro.get(y * m.largura + x) as readonly [number, number]);
        primeiro.set(i, dir);
        if (!perigo.has(i)) return dir;
        proxima.push([nx, ny]);
      }
    }
    fronteira = proxima;
  }
  return undefined;
}

export function autoHuntInput(
  w: WorldState,
  content: GameContent,
  perfil: HunterProfile,
  opts: AutoOptions,
): RtInput {
  const h = w.atores.find((a) => a.uid === HEROI);
  if (!h || !vivo(h) || w.heroiCaido) return {};
  const m = loadMap(content.mapas[w.mapa]!);
  const vidaPct = h.vida / h.vidaMax;
  const monstros = w.atores.filter((a) => a.lado === 'inimigo' && vivo(a));

  // 1. Sair de uma área de golpe forte: o tile seguro mais perto (até 9 passos).
  const perigo = monstros.filter((a) => a.preparo?.tiles.some(([x, y]) => x === h.x && y === h.y));
  if (perigo.length > 0 && h.moverRestante <= 0) {
    const tiles = new Set(
      monstros.flatMap((a) => a.preparo?.tiles ?? []).map(([x, y]) => y * m.largura + x),
    );
    const ocupado = (x: number, y: number) =>
      w.atores.some((a) => a !== h && vivo(a) && a.x === x && a.y === y);
    const fuga = escapeStep(m, h.x, h.y, tiles, ocupado);
    if (fuga) return { dir: fuga };
  }

  // Fora da área, mas com golpe forte em preparo: espera parado em vez de voltar para ela.
  const preparando = monstros.some((a) => a.preparo);
  if (preparando && h.alvo) {
    const perigosos = monstros.flatMap((a) => a.preparo?.tiles ?? []);
    const alvoAtual = monstros.find((a) => a.uid === h.alvo);
    const ficaria = alvoAtual && chebyshev(alvoAtual.x, alvoAtual.y, h.x, h.y) > h.alcance;
    if (ficaria && perigosos.length > 0) return { alvo: null };
  }

  // 2. Poção.
  const pocao = content.itens.pocao;
  if (
    opts.pocoes > 0 &&
    w.recargaPocao <= 0 &&
    vidaPct < (opts.pocaoAbaixo ?? 0.4) &&
    h.vidaMax - h.vida >= h.vidaMax * pocao.curaPct * 0.6
  ) {
    return { pocao: true };
  }

  // 3. Alvo: o atual, ou o monstro mais perto (o caçador anda até ele sozinho).
  let alvo = monstros.find((a) => a.uid === h.alvo);
  if (!alvo) {
    if (preparando) return {};
    // Sem luta por perto: pega os itens do chão primeiro.
    const brigando = monstros.some((a) => a.agressivo && chebyshev(a.x, a.y, h.x, h.y) <= 3);
    if (!brigando && !opts.mochilaCheia && w.chao.length > 0) {
      if (h.caminho.length > 0 || h.moverRestante > 0) return {};
      const item = [...w.chao].sort(
        (a, b) => chebyshev(a.x, a.y, h.x, h.y) - chebyshev(b.x, b.y, h.x, h.y),
      )[0]!;
      if (item.x !== h.x || item.y !== h.y) return { irPara: [item.x, item.y] };
    }
    alvo = monstros
      .filter((a) => a.agressivo)
      .sort((a, b) => chebyshev(a.x, a.y, h.x, h.y) - chebyshev(b.x, b.y, h.x, h.y))[0];
    alvo ??= monstros.sort(
      (a, b) => chebyshev(a.x, a.y, h.x, h.y) - chebyshev(b.x, b.y, h.x, h.y),
    )[0];
    if (alvo) return { alvo: alvo.uid };
    return {};
  }

  // O alvo está longe e alguém já está batendo no caçador: cuida de quem está perto.
  if (chebyshev(alvo.x, alvo.y, h.x, h.y) > h.alcance) {
    const encostado = monstros.find(
      (a) => a.agressivo && chebyshev(a.x, a.y, h.x, h.y) <= h.alcance,
    );
    if (encostado) return { alvo: encostado.uid };
  }

  // Contra um chefe, derruba primeiro os ajudantes que ele chamou e estão por perto.
  if (alvo.chefe) {
    const ajudante = monstros
      .filter((a) => a.invocado && a.agressivo && chebyshev(a.x, a.y, h.x, h.y) <= 3)
      .sort((a, b) => a.vida - b.vida)[0];
    if (ajudante) return { alvo: ajudante.uid };
    // Chefe blindado: o dano para no escudo, então vai atrás de qualquer ajudante vivo.
    if (alvo.blindado) {
      const qualquer = monstros
        .filter((a) => a.invocado)
        .sort((a, b) => chebyshev(a.x, a.y, h.x, h.y) - chebyshev(b.x, b.y, h.x, h.y))[0];
      if (qualquer) return { alvo: qualquer.uid };
    }
  }

  // 4. Habilidades, na ordem de prioridade.
  const c = perfil.comportamento;
  const perto =
    chebyshev(alvo.x, alvo.y, h.x, h.y) <= h.alcance && hasLineOfSight(m, h.x, h.y, alvo.x, alvo.y);
  const forteVindo = monstros.some(
    (a) =>
      a.preparo ||
      (a.intencao &&
        actorEnemyDef(content, a).acoes.find((x) => x.id === a.intencao)?.forte &&
        chebyshev(a.x, a.y, h.x, h.y) <= a.alcance + 1),
  );
  for (let i = 0; i < perfil.habilidades.length; i++) {
    const hab = perfil.habilidades[i]!;
    if ((w.recargas[hab.def.id] ?? 0) > 0) continue;
    const cat = hab.def.categoria;
    if (cat === 'cura' && vidaPct * 100 >= c.curaAbaixoPct) continue;
    if (cat === 'defesa' && c.defesa === 'contraGolpeForte' && !forteVindo) continue;
    if (cat === 'defesa' && h.bloqueio > 0) continue;
    if (cat === 'ataque') {
      const usaAlvo = hab.def.efeitos.some((e) => e.alvo === 'alvo');
      const area = hab.def.efeitos.some((e) => e.alvo === 'inimigos');
      if (usaAlvo && !perto) continue;
      if (area && !monstros.some((a) => chebyshev(a.x, a.y, h.x, h.y) <= (hab.def.raio ?? 1)))
        continue;
    }
    return { habilidade: i };
  }
  return {};
}
