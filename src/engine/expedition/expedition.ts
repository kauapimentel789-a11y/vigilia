/**
 * Expedição: o caçador farma sozinho um portal já fechado, inclusive offline.
 *
 * Não simulamos milhares de lutas. Ao enviar (e a cada coleta), o motor simula
 * algumas lutas reais e calcula uma taxa média por hora. O ganho é
 * taxa × tempo decorrido, com teto. Derrotas contam: ocupam tempo e não rendem.
 */
import type { GameContent, PortalDef } from '../definitions.ts';
import type { HunterProfile } from '../hunter/stats.ts';
import type { HunterState } from '../hunter/hunter.ts';
import { gainXp } from '../hunter/hunter.ts';
import { simulatePortal } from '../autobattle/simulate.ts';

const HORA_MS = 3_600_000;
/** O ganho é calculado em passos, para a queda por level valer durante a expedição. */
const PASSO_MS = 10 * 60_000;

/** Fração da recompensa (XP e ouro) que um portal rende para este level: portais fáceis rendem menos. */
export function rewardMultiplier(content: GameContent, portal: PortalDef, level: number): number {
  const r = content.progressao.xpAcimaDoRecomendado;
  const acima = level - (portal.levelRecomendado + r.tolerancia);
  if (acima <= 0) return 1;
  return Math.max(r.minimo, 1 - r.quedaPorLevel * acima);
}

export interface ExpeditionRate {
  portal: string;
  /** Fração de vitórias na amostra, de 0 a 1. */
  vitoria: number;
  duracaoMediaS: number;
  lutasPorHora: number;
  xpPorHora: number;
  ouroPorHora: number;
}

export interface ExpeditionState {
  portal: string;
  /** Instante (ms desde 1970) em que a expedição começou. */
  inicio: number;
  /** Instante da última coleta: o ganho conta a partir daqui. */
  ultimaColeta: number;
  taxa: ExpeditionRate;
}

export function calculateRate(
  perfil: HunterProfile,
  portal: PortalDef,
  content: GameContent,
  sementeBase: number,
): ExpeditionRate {
  const cfg = content.progressao.expedicao;
  let vitorias = 0;
  let duracaoTotal = 0;
  for (let i = 0; i < cfg.lutasAmostra; i++) {
    const r = simulatePortal({ perfil, portal, content, semente: (sementeBase + i * 7919) >>> 0 });
    if (r.resultado === 'vitoria') vitorias++;
    duracaoTotal += r.duracaoMs;
  }
  const vitoria = vitorias / cfg.lutasAmostra;
  const duracaoMediaS = duracaoTotal / cfg.lutasAmostra / 1000;
  const lutasPorHora = 3600 / (duracaoMediaS + cfg.pausaEntreLutasS);
  return {
    portal: portal.id,
    vitoria,
    duracaoMediaS,
    lutasPorHora,
    // Valores brutos: a queda por level é aplicada no momento do ganho.
    xpPorHora: lutasPorHora * vitoria * portal.recompensa.xp,
    ouroPorHora: lutasPorHora * vitoria * portal.recompensa.ouro,
  };
}

export interface ExpeditionGains {
  /** Tempo que efetivamente rendeu (já limitado pelo teto). */
  tempoMs: number;
  /** Tempo real desde a última coleta. */
  decorridoMs: number;
  lutas: number;
  vitorias: number;
  xp: number;
  ouro: number;
  /** Itens achados (sorteados na coleta e guardados no baú). */
  itens: number;
  /** O teto foi atingido e parte do tempo não rendeu. */
  noTeto: boolean;
  /** O relógio do aparelho voltou no tempo: nada rende. */
  relogioVoltou: boolean;
}

export function accruedGains(
  exp: ExpeditionState,
  agora: number,
  content: GameContent,
  cacador: HunterState,
): ExpeditionGains {
  const decorridoMs = agora - exp.ultimaColeta;
  if (decorridoMs < 0) {
    return {
      tempoMs: 0,
      decorridoMs,
      lutas: 0,
      vitorias: 0,
      xp: 0,
      ouro: 0,
      itens: 0,
      noTeto: false,
      relogioVoltou: true,
    };
  }
  const tetoMs = content.progressao.expedicao.tetoHoras * HORA_MS;
  const tempoMs = Math.min(decorridoMs, tetoMs);
  const horas = tempoMs / HORA_MS;
  const t = exp.taxa;
  const lutas = Math.floor(t.lutasPorHora * horas);
  const portal = content.portais[exp.portal];
  let xp = 0;
  let ouro = 0;
  if (portal) {
    // Simula a subida de level em passos: conforme o caçador passa do recomendado, rende menos.
    let c = cacador;
    let aplicado = 0;
    for (let feito = 0; feito < tempoMs; feito += PASSO_MS) {
      const dt = Math.min(PASSO_MS, tempoMs - feito);
      const mult = rewardMultiplier(content, portal, c.level);
      xp += (t.xpPorHora * dt * mult) / HORA_MS;
      ouro += (t.ouroPorHora * dt * mult) / HORA_MS;
      const inteiro = Math.floor(xp + 1e-9);
      if (inteiro > aplicado) {
        c = gainXp(c, content, inteiro - aplicado).cacador;
        aplicado = inteiro;
      }
    }
  }
  const vitorias = Math.floor(lutas * t.vitoria);
  const monstros = portal ? portal.ondas.reduce((s, o) => s + o.length, 0) : 0;
  const it = content.itens;
  const itens = Math.min(
    it.expedicao.maximo,
    Math.floor(vitorias * monstros * it.chanceDeSaque * it.expedicao.fator),
  );
  return {
    tempoMs,
    decorridoMs,
    lutas,
    vitorias,
    itens,
    xp: Math.floor(xp + 1e-9),
    ouro: Math.floor(ouro + 1e-9),
    noTeto: decorridoMs > tetoMs,
    relogioVoltou: false,
  };
}
