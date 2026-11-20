/**
 * Save local: transforma o estado do jogo em texto e de volta, com versão.
 *
 * O motor não conhece o localStorage: a interface guarda e lê o texto. Aqui
 * ficam a validação (um save estragado nunca entra no jogo) e as migrações
 * entre versões.
 */
import type { AtributoId, GameContent } from '../definitions.ts';
import { ATRIBUTOS, RANKS_ORDEM, SLOTS } from '../definitions.ts';
import type { ItemInstance } from '../items/items.ts';
import type { GameState } from '../game/game.ts';
import { VERSAO_DO_ESTADO } from '../game/game.ts';
import { newArenaState } from '../game/arena.ts';
import type { Eco } from '../game/ecos.ts';
import { ECOS, newEcosState } from '../game/ecos.ts';

export interface SaveFile {
  v: number;
  salvoEm: number;
  estado: unknown;
}

/** Migrações: a chave é a versão de origem; cada função leva à versão seguinte. */
const MIGRACOES: Record<number, (estado: unknown) => unknown> = {
  // v1 → v2 (Etapa 3): mochila, contador de itens e equipamento do caçador.
  1: (estado) => {
    if (!isObj(estado)) return estado;
    const cacador = isObj(estado.cacador) ? { ...estado.cacador, equipamento: {} } : estado.cacador;
    return { ...estado, versao: 2, cacador, mochila: [], proximoItem: 1, bau: [], pocoes: 3 };
  },
  // v2 → v3 (Etapa 4): rank do caçador e Selos.
  2: (estado) => (isObj(estado) ? { ...estado, versao: 3, rank: 'cinza', selos: {} } : estado),
  // v3 → v4 (Etapa 5): Arena.
  3: (estado) => (isObj(estado) ? { ...estado, versao: 4, arena: newArenaState() } : estado),
};

export function serialize(estado: GameState, agora: number): string {
  const arquivo: SaveFile = { v: VERSAO_DO_ESTADO, salvoEm: agora, estado };
  return JSON.stringify(arquivo);
}

export type LoadResult =
  | { estado: GameState; salvoEm: number; erro?: undefined }
  | { estado?: undefined; salvoEm?: undefined; erro: string };

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isInt = (x: unknown, min = 0): x is number => Number.isInteger(x) && (x as number) >= min;
const isStrArr = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((i) => typeof i === 'string');

const RARIDADES_OK = new Set(['comum', 'incomum', 'rara']);
const isItem = (x: unknown): boolean =>
  isObj(x) &&
  typeof x.uid === 'string' &&
  typeof x.base === 'string' &&
  typeof x.raridade === 'string' &&
  RARIDADES_OK.has(x.raridade) &&
  Array.isArray(x.afixos) &&
  x.afixos.every((a) => isObj(a) && typeof a.id === 'string' && isNum(a.valor));

function validate(e: unknown, content: GameContent): string | null {
  if (!isObj(e)) return 'estado ausente';
  if (e.versao !== VERSAO_DO_ESTADO) return 'versão do estado';
  if (!isNum(e.ouro) || e.ouro < 0) return 'ouro';
  if (!isStrArr(e.portaisFechados)) return 'portais';
  if (!isInt(e.proximaSemente)) return 'semente';
  const r = e.registro;
  if (!isObj(r) || !isInt(r.lutas) || !isInt(r.vitorias) || !isNum(r.criadoEm)) return 'registro';
  const c = e.cacador;
  if (!isObj(c)) return 'caçador';
  if (!isInt(c.level, 1) || c.level > content.progressao.levelMax) return 'level';
  if (!isInt(c.xp) || !isInt(c.pontosLivres)) return 'xp/pontos';
  if (!isObj(c.atributos)) return 'atributos';
  const atr = c.atributos as Record<AtributoId, unknown>;
  for (const a of ATRIBUTOS)
    if (!isInt(atr[a], content.progressao.atributoInicial)) return `atributo ${a}`;
  if (!isObj(c.niveisHabilidade)) return 'níveis de habilidade';
  if (!Object.values(c.niveisHabilidade).every((n) => isInt(n, 1))) return 'níveis de habilidade';
  if (!isStrArr(c.equipadas)) return 'habilidades equipadas';
  const b = c.comportamento;
  if (
    !isObj(b) ||
    typeof b.alvo !== 'string' ||
    !isNum(b.curaAbaixoPct) ||
    typeof b.defesa !== 'string'
  ) {
    return 'comportamento';
  }
  if (!Array.isArray(e.mochila) || !e.mochila.every(isItem)) return 'mochila';
  if (!isInt(e.proximoItem, 1)) return 'contador de itens';
  if (!Array.isArray(e.bau) || !e.bau.every(isItem)) return 'baú';
  if (!isInt(e.pocoes)) return 'poções';
  if (typeof e.rank !== 'string' || !(RANKS_ORDEM as readonly string[]).includes(e.rank))
    return 'rank';
  if (!isObj(e.selos) || !Object.values(e.selos).every((n) => isInt(n))) return 'selos';
  const ar = e.arena;
  if (!isObj(ar) || !isInt(ar.gloria) || typeof ar.heroi !== 'string' || !isInt(ar.partidas))
    return 'arena';
  if (!isObj(c.equipamento) || !Object.values(c.equipamento).every(isItem)) return 'equipamento';
  if (e.expedicao !== null) {
    const x = e.expedicao;
    if (!isObj(x) || typeof x.portal !== 'string' || !isNum(x.inicio) || !isNum(x.ultimaColeta))
      return 'expedição';
    if (!isObj(x.taxa) || !isNum(x.taxa.xpPorHora) || !isNum(x.taxa.ouroPorHora))
      return 'taxa da expedição';
  }
  return null;
}

/** Remove referências a conteúdo que deixou de existir (ex.: habilidade renomeada). */
function sanitize(estado: GameState, content: GameContent): GameState {
  const e = structuredClone(estado);
  e.portaisFechados = e.portaisFechados.filter((id) => content.portais[id]);
  e.selos = Object.fromEntries(Object.entries(e.selos).filter(([id]) => content.selos[id]));
  if (!content.arena.herois[e.arena.heroi]) e.arena.heroi = 'vigia';
  // Uma partida salva com unidades que saíram do conteúdo (ou estragada) é descartada.
  if (e.arena.partida !== null && !validMatch(e.arena.partida, content)) e.arena.partida = null;
  // O registro só serve para a partida atual; se algo estiver estranho, a partida
  // continua, mas não vai para o ranking.
  const reg = e.arena.registro as unknown;
  if (
    !e.arena.partida ||
    !isObj(reg) ||
    !isObj(reg.inicio) ||
    !isInt(reg.inicio.semente) ||
    !Array.isArray(reg.inicio.rivais) ||
    !Array.isArray(reg.comandos)
  )
    e.arena.registro = null;
  if (e.cacador.classe !== undefined && !content.classes[e.cacador.classe])
    e.cacador.classe = 'vigia';
  const classe = e.cacador.classe ?? 'vigia';
  e.cacador.equipadas = e.cacador.equipadas
    .filter((id) => {
      const h = content.habilidades[id];
      return h && (!h.classe || h.classe === classe);
    })
    .slice(0, content.progressao.espacosDeHabilidade);
  if (e.expedicao && !content.portais[e.expedicao.portal]) e.expedicao = null;
  e.ecos = sanitizeEcos(e.ecos, content);
  // Itens cuja base saiu do conteúdo somem; afixos desconhecidos são ignorados.
  const valido = (i: ItemInstance) => !!content.itens.bases[i.base];
  const limpo = (i: ItemInstance): ItemInstance => ({
    ...i,
    afixos: i.afixos.filter((a) => content.itens.afixos[a.id]),
  });
  e.mochila = e.mochila.filter(valido).map(limpo);
  e.bau = e.bau.filter(valido).map(limpo);
  for (const slot of SLOTS) {
    const i = e.cacador.equipamento[slot];
    if (!i) continue;
    const base = content.itens.bases[i.base];
    if (!base || base.slot !== slot) delete e.cacador.equipamento[slot];
    else e.cacador.equipamento[slot] = limpo(i);
  }
  return e;
}

/** Ecos: um save antigo (ou estragado nesta parte) começa sem Ecos, sem perder o resto. */
function sanitizeEcos(x: unknown, content: GameContent): NonNullable<GameState['ecos']> {
  if (!isObj(x) || !Array.isArray(x.lista)) return newEcosState();
  const ranks = RANKS_ORDEM as readonly string[];
  const lista = x.lista
    .filter(
      (e): e is Eco =>
        isObj(e) &&
        typeof e.uid === 'string' &&
        typeof e.defId === 'string' &&
        !!content.inimigos[e.defId] &&
        isInt(e.nivel, 1) &&
        e.nivel <= ECOS.nivelMax &&
        isInt(e.xp) &&
        typeof e.afinidade === 'string' &&
        ranks.includes(e.afinidade) &&
        (e.apelido === undefined || typeof e.apelido === 'string'),
    )
    .slice(0, ECOS.maximo);
  const ativo =
    typeof x.ativo === 'string' && lista.some((e) => e.uid === x.ativo) ? x.ativo : null;
  const cristais = isInt(x.cristais) ? Math.min(x.cristais, ECOS.maxCristais) : 0;
  const maior = lista.reduce((m, e) => Math.max(m, Number(e.uid.slice(1)) || 0), 0);
  const proximo = isInt(x.proximo, 1) ? Math.max(x.proximo, maior + 1) : maior + 1;
  return { lista, ativo, cristais, proximo };
}

function validMatch(m: unknown, content: GameContent): boolean {
  if (!isObj(m) || !isInt(m.rodada, 1) || !isInt(m.rngState) || !Array.isArray(m.jogadores))
    return false;
  if (!isObj(m.estoque) || typeof m.fim !== 'boolean') return false;
  const unidade = (u: unknown) =>
    u === null || (isObj(u) && typeof u.def === 'string' && !!content.arena.unidades[u.def]);
  return m.jogadores.every(
    (p) =>
      isObj(p) &&
      isNum(p.vida) &&
      isInt(p.ouro) &&
      isInt(p.nivel, 1) &&
      Array.isArray(p.banco) &&
      p.banco.every(unidade) &&
      Array.isArray(p.tabuleiro) &&
      p.tabuleiro.every(unidade) &&
      Array.isArray(p.loja) &&
      p.loja.every((id) => id === null || !!content.arena.unidades[id as string]) &&
      (p.sombra === undefined ||
        (Array.isArray(p.sombra) && p.sombra.every((t) => Array.isArray(t) && t.every(unidade)))),
  );
}

export function deserialize(texto: string, content: GameContent): LoadResult {
  let arquivo: unknown;
  try {
    arquivo = JSON.parse(texto);
  } catch {
    return { erro: 'O save não é um JSON válido.' };
  }
  if (!isObj(arquivo) || !isInt(arquivo.v, 1) || !isNum(arquivo.salvoEm)) {
    return { erro: 'O save não tem o formato esperado.' };
  }
  if (arquivo.v > VERSAO_DO_ESTADO) {
    return { erro: `O save é de uma versão mais nova do jogo (v${arquivo.v}).` };
  }
  let estado = arquivo.estado;
  for (let v = arquivo.v; v < VERSAO_DO_ESTADO; v++) {
    const migrar = MIGRACOES[v];
    if (!migrar) return { erro: `Não há migração do save v${v}.` };
    estado = migrar(estado);
  }
  const problema = validate(estado, content);
  if (problema) return { erro: `O save está corrompido (${problema}).` };
  return { estado: sanitize(estado as GameState, content), salvoEm: arquivo.salvoEm };
}
