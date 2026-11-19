/**
 * Simulador de ritmo da Caçada (`npm run sim`).
 *
 * 1. Matriz de vitória: level × portal, com um build equilibrado.
 * 2. Progressão de um jogador-robô do level 1 até fechar o Cinza V, usando
 *    expedições online entre as tentativas.
 * 3. Build ruim contra o mini-chefe.
 * 4. Rendimento de 8 h offline num portal intermediário.
 *
 * Os números são INDICADORES de equilíbrio, não regras: o seu teste vale mais.
 */
import { CONTEUDO } from '../../src/content/index.ts';
import type { AtributoId, GameContent } from '../../src/engine/definitions.ts';
import type { GameState } from '../../src/engine/game/game.ts';
import {
  advanceTime,
  collectExpedition,
  equip,
  fightPortal,
  newGame,
  spendPoint,
  startExpedition,
  upgrade,
} from '../../src/engine/game/game.ts';
import { calculateRate } from '../../src/engine/expedition/expedition.ts';
import { abilityLevel, isUnlocked, upgradeCost } from '../../src/engine/hunter/abilities.ts';
import { gainXp } from '../../src/engine/hunter/hunter.ts';
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
  return pref.filter((id) => isUnlocked(e.cacador, C.habilidades[id]!)).slice(0, 4);
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
  e = spendAll(e, ORDEM_EQUILIBRADA);
  e = must(equip(e, C, bestLoadout(e))).estado;
  return upgradeAll(e);
}

function levelUpTo(level: number): GameState {
  const e = newGame(C, 1, 0);
  while (e.cacador.level < level) {
    const falta =
      Math.round(C.progressao.xpBase * Math.pow(e.cacador.level, C.progressao.xpExpoente)) -
      e.cacador.xp;
    e.cacador = gainXp(e.cacador, C, falta).cacador;
  }
  return prepare(e);
}

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5);
const min = (s: number) => `${(s / 60).toFixed(0)} min`;

// 1. Matriz
console.log('\n1) Vitória por level (build equilibrado, habilidades nível 1)\n');
console.log(
  'level |' + C.ordemPortais.map((p) => C.portais[p]!.nome.slice(0, 8).padStart(9)).join(''),
);
for (const lv of [1, 5, 10, 15, 18, 20, 23, 26, 29, 32, 35]) {
  const e = levelUpTo(lv);
  const perfil = buildProfile(e.cacador, C);
  const linha = C.ordemPortais.map((p) =>
    pct(calculateRate(perfil, C.portais[p]!, C, 99).vitoria).padStart(9),
  );
  console.log(String(lv).padStart(5) + ' |' + linha.join(''));
}

// 2. Progressão
console.log(
  '\n2) Jogador-robô: entra num portal novo quando a chance passa de 60%; senão farma 5 min online\n',
);
let e = newGame(C, 12345, 0);
let t = 0;
const FARM_S = 300;
let ultimoFechado = 0;
let fechouCinza = 0;
for (let guarda = 0; guarda < 2000 && !e.portaisFechados.includes('brasa5'); guarda++) {
  e = prepare(e);
  const proximo = C.ordemPortais[e.portaisFechados.length]!;
  const chance = calculateRate(
    buildProfile(e.cacador, C),
    C.portais[proximo]!,
    C,
    guarda * 31,
  ).vitoria;
  if (chance >= 0.6 || e.portaisFechados.length === 0) {
    const r = must(fightPortal(e, C, proximo));
    e = r.estado;
    t += r.batalha.duracaoMs / 1000 / 4 + 10; // assistido em 4×, mais navegação
    if (r.batalha.resultado === 'vitoria') {
      console.log(
        `  ${min(t).padStart(7)}  fechou ${C.portais[proximo]!.nome.padEnd(9)} level ${e.cacador.level}  (chance estimada ${pct(chance)})`,
      );
      ultimoFechado = t;
      if (proximo === 'cinza5') fechouCinza = t;
      continue;
    }
  }
  const melhor = e.portaisFechados
    .map((p) => ({
      p,
      taxa: calculateRate(buildProfile(e.cacador, C), C.portais[p]!, C, 7).xpPorHora,
    }))
    .sort((a, b) => b.taxa - a.taxa)[0]!.p;
  e = must(startExpedition(e, C, melhor, 0)).estado;
  e = advanceTime(e, FARM_S * 1000);
  e = must(collectExpedition(e, C, 0, true)).estado;
  t += FARM_S;
}
console.log(
  `\n  Tempo até fechar o Cinza V: ${min(fechouCinza)}; até o Brasa V: ${min(ultimoFechado)}`,
);

// 3. Build ruim
console.log('\n3) Build ruim no Cinza V: tudo em Força, habilidades em ordem qualquer, sem cura');
for (const lv of [15, 18, 20]) {
  let r = levelUpTo(lv);
  r.cacador.atributos = { forca: 5, agilidade: 5, vigor: 5, percepcao: 5, vontade: 5 };
  r.cacador.pontosLivres = (lv - 1) * C.progressao.pontosPorLevel;
  r = spendAll(r, ['forca']);
  r = must(
    equip(r, C, ['corteRapido', 'laminaVenenosa', 'golpeRasgante', 'guardaCinzenta']),
  ).estado;
  r.cacador.comportamento = { alvo: 'primeiro', curaAbaixoPct: 0, defesa: 'pronta' };
  const boa = levelUpTo(lv);
  const v1 = calculateRate(buildProfile(r.cacador, C), C.portais.cinza5!, C, 5).vitoria;
  const v2 = calculateRate(buildProfile(boa.cacador, C), C.portais.cinza5!, C, 5).vitoria;
  console.log(`  level ${lv}: build ruim ${pct(v1)}  ·  build equilibrado ${pct(v2)}`);
}

// 4. Offline
console.log('\n4) 8 h offline (indicador: 2 a 5 levels num portal intermediário)');
for (const [lv, portal] of [
  [10, 'cinza3'],
  [13, 'cinza4'],
  [18, 'cinza5'],
  [24, 'brasa2'],
  [30, 'brasa4'],
] as const) {
  let o = levelUpTo(lv);
  o.portaisFechados = C.ordemPortais.slice(0, C.ordemPortais.indexOf(portal) + 1);
  o = must(startExpedition(o, C, portal, 0)).estado;
  const taxa = o.expedicao!.taxa;
  o = advanceTime(o, 10 * 3600 * 1000);
  const r = must(collectExpedition(o, C, 0, true));
  console.log(
    `  level ${lv} em ${C.portais[portal]!.nome}: vitória ${pct(taxa.vitoria)}, ${Math.round(taxa.lutasPorHora)} lutas/h → +${r.ganhos.xp} XP, +${r.ganhos.ouro} ouro, +${r.levelsGanhos} levels`,
  );
}

// 5. Mapas em tempo real com auto-caçar (sem itens vestidos, 5 poções).
console.log('\n5) Mapas jogáveis com auto-caçar: 10 min de jogo, sem equipamento, 5 poções');
console.log('  mapa       level | chefe        abates/h  itens/h  XP bruto/h  caiu');
for (const portal of C.ordemPortais) {
  const mapa = Object.values(C.mapas).find((m) => m.portal === portal)!;
  const rec = C.portais[portal]!.levelRecomendado;
  for (const lv of [rec, rec + 3]) {
    const perfil = buildProfile(prepare(levelUpTo(lv)).cacador, C);
    const w = createWorld(C, mapa.id, perfil, 1234 + lv);
    let pocoes = 5;
    let abates = 0;
    let xp = 0;
    let itens = 0;
    let chefeEm = -1;
    const passos = (10 * 60 * 1000) / C.mundo.tickMs;
    for (let i = 0; i < passos && !w.heroiCaido; i++) {
      const ev = stepWorld(w, C, perfil, autoHuntInput(w, C, perfil, { pocoes }));
      for (const e of ev) {
        if (e.tipo === 'pocao') pocoes--;
        if (e.tipo === 'saque') itens++;
        if (e.tipo === 'abate') {
          abates++;
          xp += e.xp;
          if (e.chefe && chefeEm < 0) chefeEm = w.t;
        }
      }
    }
    const horas = w.t / 3_600_000;
    console.log(
      `  ${mapa.nome.padEnd(10)} ${String(lv).padStart(5)} | ${(chefeEm >= 0 ? `em ${min(chefeEm / 1000)}` : 'não').padEnd(12)} ${String(Math.round(abates / horas)).padStart(8)} ${String(Math.round(itens / horas)).padStart(8)} ${String(Math.round(xp / horas)).padStart(11)}  ${w.heroiCaido ? `sim, ${min(w.t / 1000)}` : 'não'}`,
    );
  }
}
console.log('');
