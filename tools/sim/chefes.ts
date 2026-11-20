/**
 * Lutas de chefe nos mapas jogáveis, com auto-caçar: quanto tempo dura a luta
 * (do chefe notar o caçador até cair), a vida mais baixa do caçador e as poções
 * gastas. Uso: node tools/sim/chefes.ts [classe]
 *
 * Os números são indicadores, não metas: a mecânica vem primeiro.
 */
import { CONTEUDO } from '../../src/content/index.ts';
import type { AtributoId, GameContent } from '../../src/engine/definitions.ts';
import type { GameState } from '../../src/engine/game/game.ts';
import { equip, newGame, spendPoint, upgrade } from '../../src/engine/game/game.ts';
import { abilityLevel, isUnlocked, upgradeCost } from '../../src/engine/hunter/abilities.ts';
import { chooseClass, gainXp } from '../../src/engine/hunter/hunter.ts';
import type { ClasseId } from '../../src/engine/definitions.ts';
import { buildProfile } from '../../src/engine/hunter/stats.ts';
import { createWorld, stepWorld } from '../../src/engine/realtime/world.ts';
import { autoHuntInput } from '../../src/engine/realtime/auto.ts';

const C: GameContent = CONTEUDO;
const ORDEM_EQUILIBRADA: AtributoId[] = [
  'forca',
  'vigor',
  'agilidade',
  'forca',
  'vigor',
  'vontade',
  'percepcao',
  'agilidade',
  'forca',
];

function must<T extends { erro?: string | undefined }>(r: T): Exclude<T, { erro: string }> {
  if (r.erro) throw new Error(r.erro);
  return r as Exclude<T, { erro: string }>;
}

function spendAll(e: GameState, ordem: AtributoId[]): GameState {
  let i = 0;
  while (e.cacador.pontosLivres > 0) {
    e = must(spendPoint(e, C, ordem[i % ordem.length] as AtributoId, 1)).estado;
    i++;
  }
  return e;
}

function bestLoadout(e: GameState): string[] {
  const pref = [
    'folegoDaVigilia',
    'baluarte',
    'laminaDaBrasa',
    'tormentaDeCinzas',
    'guardaCinzenta',
    'marcaDoCacador',
    'golpeRasgante',
    'corteRapido',
    'laminaVenenosa',
  ];
  const daClasse = Object.values(C.habilidades)
    .filter((h) => h.classe && isUnlocked(e.cacador, h))
    .sort((a, b) => b.desbloqueio - a.desbloqueio)
    .map((h) => h.id)
    .slice(0, 2);
  return [...daClasse, ...pref.filter((id) => isUnlocked(e.cacador, C.habilidades[id]!))].slice(
    0,
    4,
  );
}

function upgradeAll(e: GameState): GameState {
  for (;;) {
    const opcoes = e.cacador.equipadas
      .map((id) => ({ id, nivel: abilityLevel(e.cacador, id) }))
      .filter((o) => o.nivel < C.progressao.habilidadeNivelMax)
      .sort((a, b) => a.nivel - b.nivel);
    const o = opcoes[0];
    if (!o || upgradeCost(C, o.nivel) > e.ouro) return e;
    e = must(upgrade(e, C, o.id)).estado;
  }
}

function prepare(e: GameState): GameState {
  const classe = process.argv[2] as ClasseId | undefined;
  if (classe) e = { ...e, cacador: chooseClass(e.cacador, C, classe).cacador! };
  e = spendAll(e, ORDEM_EQUILIBRADA);
  e = must(equip(e, C, bestLoadout(e))).estado;
  return upgradeAll(e);
}

function levelUpTo(level: number): GameState {
  const e = newGame(C, 1, 0);
  const alvo = Math.min(level, C.progressao.levelMax);
  while (e.cacador.level < alvo) {
    const falta =
      Math.round(C.progressao.xpBase * Math.pow(e.cacador.level, C.progressao.xpExpoente)) -
      e.cacador.xp;
    e.cacador = gainXp(e.cacador, C, falta).cacador;
  }
  return prepare(e);
}

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5);

console.log(
  `\nLutas de chefe (${process.argv[2] ?? 'vigia'}, auto-caçar, 5 poções, 3 sementes por linha)`,
);
console.log('  mapa           level | venceu  luta média  vida mínima  poções  caiu na luta');
for (const portal of C.ordemPortais) {
  const mapa = Object.values(C.mapas).find((m) => m.portal === portal)!;
  const rec = C.portais[portal]!.levelRecomendado;
  for (const lv of [...new Set([rec, Math.min(rec + 3, C.progressao.levelMax)])]) {
    const perfil = buildProfile(prepare(levelUpTo(lv)).cacador, C);
    let vitorias = 0;
    let quedas = 0;
    let duracao = 0;
    let vidaMin = 1;
    let pocoesLuta = 0;
    for (const semente of [11, 22, 33]) {
      const w = createWorld(C, mapa.id, perfil, semente + lv);
      let pocoes = 5;
      let inicio = -1;
      const chefe = w.atores.find((a) => a.chefe);
      const passos = (10 * 60 * 1000) / C.mundo.tickMs;
      for (let i = 0; i < passos && !w.heroiCaido && !w.chefeDerrotado; i++) {
        const ev = stepWorld(w, C, perfil, autoHuntInput(w, C, perfil, { pocoes }));
        const h = w.atores[0]!;
        if (inicio < 0 && chefe?.agressivo) inicio = w.t;
        if (inicio >= 0) vidaMin = Math.min(vidaMin, h.vida / h.vidaMax);
        for (const e of ev) {
          if (e.tipo === 'pocao') {
            pocoes--;
            if (inicio >= 0) pocoesLuta++;
          }
        }
      }
      if (w.chefeDerrotado) {
        vitorias++;
        duracao += w.t - inicio;
      } else if (w.heroiCaido && inicio >= 0) quedas++;
    }
    console.log(
      `  ${mapa.nome.padEnd(14)} ${String(lv).padStart(5)} | ${`${vitorias}/3`.padStart(6)} ${(vitorias ? `${Math.round(duracao / vitorias / 1000)} s` : '-').padStart(11)} ${pct(vidaMin).padStart(12)} ${String(pocoesLuta).padStart(7)}  ${quedas}/3`,
    );
  }
}
console.log('');
