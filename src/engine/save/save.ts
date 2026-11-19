/**
 * Save local: transforma o estado do jogo em texto e de volta, com versão.
 *
 * O motor não conhece o localStorage: a interface guarda e lê o texto. Aqui
 * ficam a validação (um save estragado nunca entra no jogo) e as migrações
 * entre versões.
 */
import type { AtributoId, GameContent } from '../definitions.ts';
import { ATRIBUTOS } from '../definitions.ts';
import type { GameState } from '../game/game.ts';
import { VERSAO_DO_ESTADO } from '../game/game.ts';

export interface SaveFile {
  v: number;
  salvoEm: number;
  estado: unknown;
}

/** Migrações: a chave é a versão de origem; cada função leva à versão seguinte. */
const MIGRACOES: Record<number, (estado: unknown) => unknown> = {};

export function serialize(estado: GameState, agora: number): string {
  const arquivo: SaveFile = { v: VERSAO_DO_ESTADO, salvoEm: agora, estado };
  return JSON.stringify(arquivo);
}

export type LoadResult = { estado: GameState; salvoEm: number; erro?: undefined } | { estado?: undefined; salvoEm?: undefined; erro: string };

const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isInt = (x: unknown, min = 0): x is number => Number.isInteger(x) && (x as number) >= min;
const isStrArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((i) => typeof i === 'string');

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
  for (const a of ATRIBUTOS) if (!isInt(atr[a], content.progressao.atributoInicial)) return `atributo ${a}`;
  if (!isObj(c.niveisHabilidade)) return 'níveis de habilidade';
  if (!Object.values(c.niveisHabilidade).every((n) => isInt(n, 1))) return 'níveis de habilidade';
  if (!isStrArr(c.equipadas)) return 'habilidades equipadas';
  const b = c.comportamento;
  if (!isObj(b) || typeof b.alvo !== 'string' || !isNum(b.curaAbaixoPct) || typeof b.defesa !== 'string') {
    return 'comportamento';
  }
  if (e.expedicao !== null) {
    const x = e.expedicao;
    if (!isObj(x) || typeof x.portal !== 'string' || !isNum(x.inicio) || !isNum(x.ultimaColeta)) return 'expedição';
    if (!isObj(x.taxa) || !isNum(x.taxa.xpPorHora) || !isNum(x.taxa.ouroPorHora)) return 'taxa da expedição';
  }
  return null;
}

/** Remove referências a conteúdo que deixou de existir (ex.: habilidade renomeada). */
function sanitize(estado: GameState, content: GameContent): GameState {
  const e = structuredClone(estado);
  e.portaisFechados = e.portaisFechados.filter((id) => content.portais[id]);
  e.cacador.equipadas = e.cacador.equipadas
    .filter((id) => content.habilidades[id])
    .slice(0, content.progressao.espacosDeHabilidade);
  if (e.expedicao && !content.portais[e.expedicao.portal]) e.expedicao = null;
  return e;
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
