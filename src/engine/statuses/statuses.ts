/**
 * Status de combate, agora medidos em tempo.
 *
 * Cada status é uma definição com "ganchos". A simulação não conhece nenhum
 * status pelo nome: ela só chama os ganchos a cada segundo de combate. Para criar
 * um status novo, basta adicionar uma entrada em STATUS_DEFS.
 */

export type StatusId = 'vulneravel' | 'fraco' | 'veneno' | 'forca' | 'marca' | 'queimadura';

/** Quantidade de cada status numa unidade. Ausente ou 0 significa "não tem". */
export type StatusMap = Partial<Record<StatusId, number>>;

export interface StatusDef {
  id: StatusId;
  nome: string;
  tipo: 'buff' | 'debuff';
  descricao: (quantidade: number) => string;
  /** Soma ao dano de cada golpe causado por quem tem o status. */
  somaDanoCausado?: (quantidade: number) => number;
  /** Soma ao dano de cada golpe recebido por quem tem o status. */
  somaDanoRecebido?: (quantidade: number) => number;
  /** Multiplica o dano de cada golpe causado por quem tem o status. */
  multDanoCausado?: number;
  /** Multiplica o dano de cada golpe recebido por quem tem o status. */
  multDanoRecebido?: number;
  /** Perda de vida a cada segundo (ignora bloqueio). */
  perdaPorSegundo?: (quantidade: number) => number;
  /** Quanto a quantidade diminui a cada segundo (depois da perda de vida). */
  reduzPorSegundo?: number;
}

export const STATUS_DEFS: Record<StatusId, StatusDef> = {
  vulneravel: {
    id: 'vulneravel',
    nome: 'Vulnerável',
    tipo: 'debuff',
    descricao: (q) => `Recebe 50% a mais de dano. Dura ${q} s.`,
    multDanoRecebido: 1.5,
    reduzPorSegundo: 1,
  },
  fraco: {
    id: 'fraco',
    nome: 'Fraco',
    tipo: 'debuff',
    descricao: (q) => `Causa 25% a menos de dano. Dura ${q} s.`,
    multDanoCausado: 0.75,
    reduzPorSegundo: 1,
  },
  veneno: {
    id: 'veneno',
    nome: 'Veneno',
    tipo: 'debuff',
    descricao: (q) => `Perde ${q} de vida por segundo (ignora bloqueio). Depois, reduz 1.`,
    perdaPorSegundo: (q) => q,
    reduzPorSegundo: 1,
  },
  forca: {
    id: 'forca',
    nome: 'Força',
    tipo: 'buff',
    descricao: (q) => `Cada golpe causa +${q} de dano.`,
    somaDanoCausado: (q) => q,
  },
  marca: {
    id: 'marca',
    nome: 'Marca',
    tipo: 'debuff',
    descricao: (q) => `Cada golpe recebido causa +${q} de dano. Reduz 1 por segundo.`,
    somaDanoRecebido: (q) => q,
    reduzPorSegundo: 1,
  },
  queimadura: {
    id: 'queimadura',
    nome: 'Queimadura',
    tipo: 'debuff',
    descricao: (q) => `Perde ${q} de vida por segundo (ignora bloqueio). Depois, reduz 2.`,
    perdaPorSegundo: (q) => q,
    reduzPorSegundo: 2,
  },
};

/** Lista os status ativos (quantidade > 0) numa ordem estável. */
export function activeStatuses(map: StatusMap): Array<[StatusId, number]> {
  return (Object.keys(STATUS_DEFS) as StatusId[])
    .map((id): [StatusId, number] => [id, map[id] ?? 0])
    .filter(([, q]) => q > 0);
}

export function addStatus(map: StatusMap, id: StatusId, amount: number): void {
  const next = (map[id] ?? 0) + amount;
  if (next > 0) map[id] = next;
  else delete map[id];
}

/**
 * Avança um segundo: calcula a perda de vida dos status e aplica as reduções.
 * Retorna as perdas, para a simulação aplicar e registrar.
 */
export function tickSecond(map: StatusMap): Array<{ status: StatusId; perda: number }> {
  const perdas: Array<{ status: StatusId; perda: number }> = [];
  for (const [id, q] of activeStatuses(map)) {
    const def = STATUS_DEFS[id];
    if (def.perdaPorSegundo) perdas.push({ status: id, perda: def.perdaPorSegundo(q) });
    if (def.reduzPorSegundo) addStatus(map, id, -Math.min(def.reduzPorSegundo, q));
  }
  return perdas;
}
