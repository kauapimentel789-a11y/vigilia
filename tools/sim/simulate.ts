/**
 * Simulador de balanceamento da Etapa 1.
 *
 * Um robô "guloso" joga milhares de combates em cada encontro. Ele escolhe a
 * jogada de maior valor imediato e nunca planeja turnos à frente, então é
 * propositalmente mais fraco que um humano.
 *
 * As faixas são INDICADORES de balanceamento, não regras: servem para chamar
 * atenção para algo estranho, nunca para distorcer uma mecânica.
 *
 * Uso: npm run sim            (500 combates por encontro)
 *      npm run sim -- 2000    (quantidade personalizada)
 */
import { CONTENT, ENCOUNTERS, TEST_DECK } from '../../src/content/encounters.ts';
import type { CombatState, PlayCardInput } from '../../src/engine/combat/index.ts';
import {
  MAX_TURNOS,
  anyEnemyAttacking,
  cannotPlay,
  endTurn,
  playCard,
  previewIntent,
  startCombat,
} from '../../src/engine/combat/index.ts';

const C = CONTENT;

/** Valor de um estado do ponto de vista do jogador (maior é melhor). */
function evaluate(s: CombatState): number {
  if (s.resultado === 'vitoria') return 10_000 + s.jogador.vida;
  if (s.resultado === 'derrota') return -10_000;

  const vivos = s.inimigos.filter((i) => i.vida > 0);
  const vidaInimigos = vivos.reduce((t, i) => t + i.vida + i.bloqueio * 0.5, 0);
  const mortos = s.inimigos.length - vivos.length;

  const recebido = vivos.reduce((t, i) => t + (previewIntent(s, C, i)?.danoJogador ?? 0), 0);
  const protecao = s.aliado && anyEnemyAttacking(s, C) ? 5 : 0;
  const danoPrevisto = Math.max(0, recebido - s.jogador.bloqueio - protecao);

  let status = 0;
  for (const i of vivos) {
    const v = i.status.veneno ?? 0;
    status +=
      ((v * (v + 1)) / 2) * 0.8 + (i.status.vulneravel ?? 0) * 3 + (i.status.marca ?? 0) * 1.5;
  }
  status -= (s.jogador.status.fraco ?? 0) * 2;

  const aliado = s.aliado ? 6 + s.aliado.vida * 0.5 : 0;
  return (
    s.jogador.vida -
    danoPrevisto -
    vidaInimigos +
    mortos * 12 +
    status +
    aliado +
    s.brasa * 2 +
    s.rituais.length * 8 +
    s.mao.length * 1.5
  );
}

function options(s: CombatState): PlayCardInput[] {
  const alvos = s.inimigos.filter((i) => i.vida > 0).map((i) => i.uid);
  const out: PlayCardInput[] = [];
  for (const carta of s.mao) {
    const def = C.cartas[carta.defId];
    if (!def) continue;
    for (const alvo of def.alvo === 'inimigo' ? alvos : [undefined]) {
      for (const avivar of def.avivar ? [false, true] : [false]) {
        const input = { carta: carta.uid, alvo, avivar };
        if (!cannotPlay(s, C, input)) out.push(input);
      }
    }
  }
  return out;
}

function playTurn(s: CombatState): CombatState {
  for (let passo = 0; passo < 20 && !s.resultado; passo++) {
    // Jogar uma carta tira 1 da mão; compara com "passar" sem esse custo.
    const valorAtual = evaluate(s) - 1.5;
    let melhor: CombatState | null = null;
    let melhorValor = valorAtual;
    for (const input of options(s)) {
      const r = playCard(s, C, input);
      const valor = evaluate(r.estado);
      if (valor > melhorValor) {
        melhorValor = valor;
        melhor = r.estado;
      }
    }
    if (!melhor) break;
    s = melhor;
  }
  return s.resultado ? s : endTurn(s, C).estado;
}

interface Summary {
  vitorias: number;
  derrotas: number;
  empates: number;
  turnos: number[];
  vidaRestante: number[];
  danoPorFonte: Record<string, number>;
  danoTotal: number;
}

function runEncounter(id: string, n: number): Summary {
  const encontro = ENCOUNTERS.find((e) => e.id === id)!;
  const r: Summary = {
    vitorias: 0,
    derrotas: 0,
    empates: 0,
    turnos: [],
    vidaRestante: [],
    danoPorFonte: {},
    danoTotal: 0,
  };
  for (let semente = 1; semente <= n; semente++) {
    let s = startCombat(C, encontro, TEST_DECK, semente).estado;
    while (!s.resultado) s = playTurn(s);
    if (s.resultado === 'vitoria') {
      r.vitorias++;
      r.turnos.push(s.turno);
      r.vidaRestante.push(s.jogador.vida / s.jogador.vidaMax);
    } else if (s.resultado === 'derrota') r.derrotas++;
    else r.empates++;
    for (const [fonte, dano] of Object.entries(s.stats.danoPorFonte)) {
      r.danoPorFonte[fonte] = (r.danoPorFonte[fonte] ?? 0) + dano;
      r.danoTotal += dano;
    }
  }
  return r;
}

const INDICADORES: Record<
  string,
  { vitoria: [number, number]; turnos: [number, number]; vida: [number, number] }
> = {
  cacada: { vitoria: [0.9, 1], turnos: [3, 5], vida: [0.5, 1] },
  ninho: { vitoria: [0.65, 0.85], turnos: [4, 7], vida: [0.3, 0.6] },
  guardiao: { vitoria: [0.35, 0.6], turnos: [6, 10], vida: [0.2, 0.5] },
};

const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const marca = (v: number, [min, max]: [number, number]) =>
  v >= min && v <= max ? '  ok' : '  ⚠ fora da faixa';

const n = Number(process.argv[2] ?? 500);
console.log(`\nSimulador da Etapa 1 · ${n} combates por encontro · robô guloso\n`);
console.log('As faixas são indicadores, não regras. "⚠" pede atenção, não ajuste automático.\n');

for (const encontro of ENCOUNTERS) {
  const r = runEncounter(encontro.id, n);
  const ind = INDICADORES[encontro.id]!;
  const taxa = r.vitorias / n;
  const turnos = media(r.turnos);
  const vida = media(r.vidaRestante);
  console.log(`■ ${encontro.nome}`);
  console.log(
    `  Vitórias       ${pct(taxa).padStart(5)}   (indicador ${pct(ind.vitoria[0])}–${pct(ind.vitoria[1])})${marca(taxa, ind.vitoria)}`,
  );
  console.log(
    `  Turnos médios  ${turnos.toFixed(1).padStart(5)}   (indicador ${ind.turnos[0]}–${ind.turnos[1]})${marca(turnos, ind.turnos)}`,
  );
  console.log(
    `  Vida restante  ${pct(vida).padStart(5)}   (indicador ${pct(ind.vida[0])}–${pct(ind.vida[1])})${marca(vida, ind.vida)}`,
  );
  if (r.empates > 0)
    console.log(`  ⚠ ${r.empates} combate(s) chegaram à trava de ${MAX_TURNOS} turnos`);
  const fontes = Object.entries(r.danoPorFonte).sort((a, b) => b[1] - a[1]);
  console.log('  Dano por fonte:');
  for (const [fonte, dano] of fontes) {
    const parte = dano / r.danoTotal;
    console.log(
      `    ${fonte.padEnd(24)} ${pct(parte).padStart(4)}${parte > 0.4 ? '  ⚠ acima de 40%' : ''}`,
    );
  }
  console.log('');
}
