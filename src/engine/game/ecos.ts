/**
 * Ecos: criaturas dos portais que o caçador vincula com um Cristal de Vínculo.
 *
 * Um monstro enfraquecido (vida baixa) pode ser vinculado; ele vira um Eco, um
 * espírito que segue o caçador e luta ao seu lado. O Eco ganha níveis com os
 * abates e desperta nos níveis 10 e 20, ganhando um dom da sua afinidade.
 */
import type { GameContent, RankId } from '../definitions.ts';
import type { GameResult, GameState } from './game.ts';

export interface Eco {
  uid: string;
  /** Inimigo de origem (aparência e alcance). */
  defId: string;
  /** Nome dado pelo jogador (se vazio, usa o nome do inimigo). */
  apelido?: string;
  nivel: number;
  xp: number;
  /** Rank do portal onde foi vinculado. */
  afinidade: RankId;
}

export interface EcosState {
  lista: Eco[];
  ativo: string | null;
  cristais: number;
  proximo: number;
}

export const ECOS = {
  maximo: 12,
  nivelMax: 30,
  precoCristal: 25,
  maxCristais: 20,
  /** Abaixo desta fração de vida o monstro pode ser vinculado. */
  limiteVida: 0.3,
  /** Distância máxima (tiles) para lançar o cristal. */
  alcance: 3,
  /** Parte do XP do abate que vai para o Eco ativo. */
  parteXp: 0.5,
} as const;

/** Ciclo das afinidades: cada uma vence a seguinte. Véu apaga Brasa, Brasa queima Cinza, Cinza sufoca Véu. */
const VENCE: Record<RankId, RankId> = { veu: 'brasa', brasa: 'cinza', cinza: 'veu' };
export const BONUS_AFINIDADE = 0.25;

export function hasAdvantage(eco: RankId, alvo: RankId | undefined): boolean {
  return alvo !== undefined && VENCE[eco] === alvo;
}

export const NOME_AFINIDADE: Record<RankId, string> = {
  cinza: 'Cinza',
  brasa: 'Brasa',
  veu: 'Véu',
};

/** Dom de cada afinidade, ativo a partir do primeiro despertar. */
export const DOM: Record<RankId, { nome: string; texto: string }> = {
  cinza: { nome: 'Casca de Cinza', texto: 'A cada 10 s dá ao caçador um escudo (bloqueio).' },
  brasa: { nome: 'Faísca', texto: 'Os golpes do Eco deixam queimadura no alvo.' },
  veu: { nome: 'Maré Mansa', texto: 'A cada 8 s cura um pouco da vida do caçador.' },
};

export function newEcosState(): EcosState {
  return { lista: [], ativo: null, cristais: 2, proximo: 1 };
}

export function ecosOf(estado: GameState): EcosState {
  return estado.ecos ?? newEcosState();
}

/** 0 = Eco, 1 = Desperto (nível 10), 2 = Ancestral (nível 20). */
export function awakening(nivel: number): 0 | 1 | 2 {
  return nivel >= 20 ? 2 : nivel >= 10 ? 1 : 0;
}

export const NOME_DESPERTAR = ['Eco', 'Desperto', 'Ancestral'] as const;

export function xpToNext(nivel: number): number {
  return Math.round(30 * nivel ** 1.5);
}

const LINHAGEM: Record<RankId, number> = { cinza: 0, brasa: 0.05, veu: 0.1 };

/** Fração do ataque do caçador que o Eco causa por golpe. */
export function ecoPower(eco: Eco): number {
  return 0.3 + 0.012 * (eco.nivel - 1) + 0.1 * awakening(eco.nivel) + LINHAGEM[eco.afinidade];
}

/** Chance de o vínculo pegar, pela vida que resta ao monstro. */
export function bindChance(vidaPct: number): number {
  const c = 0.3 + (ECOS.limiteVida - vidaPct) * 2.2;
  return Math.max(0.3, Math.min(0.95, c));
}

export function ecoName(eco: Eco, content: GameContent): string {
  return eco.apelido || content.inimigos[eco.defId]?.nome || 'Eco';
}

/** O que o mundo do mapa precisa saber do Eco ativo. */
export interface EcoProfile {
  defId: string;
  nome: string;
  mult: number;
  alcance: number;
  afinidade: RankId;
  despertar: 0 | 1 | 2;
}

export function activeEcoProfile(
  ecos: EcosState | undefined,
  content: GameContent,
): EcoProfile | null {
  const eco = ecos?.lista.find((x) => x.uid === ecos.ativo);
  if (!eco) return null;
  const def = content.inimigos[eco.defId];
  if (!def) return null;
  return {
    defId: eco.defId,
    nome: ecoName(eco, content),
    mult: ecoPower(eco),
    alcance: Math.min(3, def.alcance ?? 1),
    afinidade: eco.afinidade,
    despertar: awakening(eco.nivel),
  };
}

function withEcos(estado: GameState, f: (e: EcosState) => string | void): GameResult {
  const novo = structuredClone(estado);
  const e = structuredClone(ecosOf(estado));
  const erro = f(e);
  if (typeof erro === 'string') return { erro };
  novo.ecos = e;
  return { estado: novo };
}

export function buyCrystals(estado: GameState, qtd: number): GameResult {
  const e = ecosOf(estado);
  const n = Math.min(Math.floor(qtd), ECOS.maxCristais - e.cristais);
  if (n <= 0) return { erro: `Você já carrega o máximo de ${ECOS.maxCristais} cristais.` };
  if (estado.ouro < n * ECOS.precoCristal) return { erro: 'Ouro insuficiente.' };
  const r = withEcos(estado, (x) => {
    x.cristais += n;
  });
  if (r.estado) r.estado.ouro -= n * ECOS.precoCristal;
  return r;
}

/** Gasta um cristal ao lançar o vínculo (pegando ou não). */
export function spendCrystal(estado: GameState): GameResult {
  return withEcos(estado, (x) => {
    if (x.cristais <= 0) return 'Sem Cristais de Vínculo.';
    x.cristais--;
  });
}

export function hasBindRoom(estado: GameState): boolean {
  return ecosOf(estado).lista.length < ECOS.maximo;
}

/** O vínculo pegou: o monstro vira um Eco. O primeiro já fica ativo. */
export function addEco(
  estado: GameState,
  content: GameContent,
  defId: string,
  afinidade: RankId,
): GameResult<{ eco: Eco }> {
  if (!content.inimigos[defId]) return { erro: `Criatura desconhecida: ${defId}` };
  let criado: Eco | undefined;
  const r = withEcos(estado, (x) => {
    if (x.lista.length >= ECOS.maximo) return `Você já tem ${ECOS.maximo} Ecos. Liberte um.`;
    criado = { uid: `e${x.proximo++}`, defId, nivel: 1, xp: 0, afinidade };
    x.lista.push(criado);
    x.ativo ??= criado.uid;
  });
  if (r.erro !== undefined || !criado) return { erro: r.erro ?? 'Algo deu errado.' };
  return { estado: r.estado, eco: criado };
}

export function setActiveEco(estado: GameState, uid: string | null): GameResult {
  return withEcos(estado, (x) => {
    if (uid !== null && !x.lista.some((e) => e.uid === uid)) return 'Eco não encontrado.';
    x.ativo = uid;
  });
}

export function releaseEco(estado: GameState, uid: string): GameResult {
  return withEcos(estado, (x) => {
    if (!x.lista.some((e) => e.uid === uid)) return 'Eco não encontrado.';
    x.lista = x.lista.filter((e) => e.uid !== uid);
    if (x.ativo === uid) x.ativo = null;
  });
}

export function renameEco(estado: GameState, uid: string, apelido: string): GameResult {
  return withEcos(estado, (x) => {
    const eco = x.lista.find((e) => e.uid === uid);
    if (!eco) return 'Eco não encontrado.';
    const nome = apelido.trim().slice(0, 16);
    if (nome) eco.apelido = nome;
    else delete eco.apelido;
  });
}

/**
 * XP para o Eco ativo. Devolve o estado (o mesmo objeto, se não há Eco ativo) e
 * quantos níveis subiu.
 */
export function feedActiveEco(
  estado: GameState,
  xp: number,
): { estado: GameState; niveis: number } {
  const e = estado.ecos;
  const eco = e?.lista.find((x) => x.uid === e.ativo);
  if (!e || !eco || xp <= 0 || eco.nivel >= ECOS.nivelMax) return { estado, niveis: 0 };
  const novo = structuredClone(estado);
  const alvo = novo.ecos!.lista.find((x) => x.uid === eco.uid)!;
  alvo.xp += Math.round(xp);
  let niveis = 0;
  while (alvo.nivel < ECOS.nivelMax && alvo.xp >= xpToNext(alvo.nivel)) {
    alvo.xp -= xpToNext(alvo.nivel);
    alvo.nivel++;
    niveis++;
  }
  if (alvo.nivel >= ECOS.nivelMax) alvo.xp = 0;
  return { estado: novo, niveis };
}
