/**
 * Auto-caçar: escolhe os comandos do caçador a cada passo, como um jogador
 * cuidadoso. Usa o comportamento da Etapa 2 (quando curar, quando defender).
 *
 * É uma função pura: lê o mundo e devolve um RtInput. A interface só a usa em
 * portais já fechados; o simulador usa para medir ritmo.
 */
import type { GameContent } from '../definitions.ts';
import type { HunterProfile } from '../hunter/stats.ts';
import { loadMap } from './world.ts';
import type { RtActor, RtInput, WorldState } from './state.ts';
import { HEROI } from './state.ts';
import { DIRECOES, canStep } from '../world/path.ts';
import { chebyshev } from '../world/map.ts';

export interface AutoOptions {
  /** Poções disponíveis. */
  pocoes: number;
  /** Bebe poção abaixo desta fração da vida. */
  pocaoAbaixo?: number;
  /** Mochila cheia: não adianta ir atrás de itens. */
  mochilaCheia?: boolean;
}

const vivo = (a: RtActor) => a.vida > 0;

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

  // 1. Sair de uma área de golpe forte.
  const perigo = monstros.filter((a) => a.preparo?.tiles.some(([x, y]) => x === h.x && y === h.y));
  if (perigo.length > 0 && h.moverRestante <= 0) {
    const tiles = perigo.flatMap((a) => a.preparo?.tiles ?? []);
    const ocupado = (x: number, y: number) =>
      w.atores.some((a) => a !== h && vivo(a) && a.x === x && a.y === y);
    const fuga = DIRECOES.find(
      ([dx, dy]) =>
        canStep(m, h.x, h.y, dx, dy, ocupado) &&
        !tiles.some(([x, y]) => x === h.x + dx && y === h.y + dy),
    );
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

  // 4. Habilidades, na ordem de prioridade.
  const c = perfil.comportamento;
  const perto = chebyshev(alvo.x, alvo.y, h.x, h.y) <= h.alcance;
  const forteVindo = monstros.some(
    (a) =>
      a.preparo ||
      (a.intencao &&
        content.inimigos[a.defId]?.acoes.find((x) => x.id === a.intencao)?.forte &&
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
      if (area && !monstros.some((a) => chebyshev(a.x, a.y, h.x, h.y) <= 1)) continue;
    }
    return { habilidade: i };
  }
  return {};
}
