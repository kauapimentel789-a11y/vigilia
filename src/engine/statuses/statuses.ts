/**
 * Status de combate.
 *
 * Cada status é uma definição com "ganchos". O fluxo do combate não conhece
 * nenhum status pelo nome: ele só chama os ganchos. Para criar um status novo,
 * basta adicionar uma entrada em STATUS_DEFS.
 */

export type StatusId = 'vulneravel' | 'fraco' | 'veneno' | 'forca' | 'marca';

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
  /** Perda de vida no início do turno de quem tem o status (ignora bloqueio). */
  perdaNoInicioDoTurno?: (quantidade: number) => number;
  /** Quanto a quantidade diminui no início do turno (depois da perda de vida). */
  reduzNoInicioDoTurno?: number;
  /** Quanto a quantidade diminui no fim do turno de quem tem o status. */
  reduzNoFimDoTurno?: number;
}

export const STATUS_DEFS: Record<StatusId, StatusDef> = {
  vulneravel: {
    id: 'vulneravel',
    nome: 'Vulnerável',
    tipo: 'debuff',
    descricao: (q) => `Recebe 50% a mais de dano. Dura ${q} turno(s).`,
    multDanoRecebido: 1.5,
    reduzNoFimDoTurno: 1,
  },
  fraco: {
    id: 'fraco',
    nome: 'Fraco',
    tipo: 'debuff',
    descricao: (q) => `Causa 25% a menos de dano. Dura ${q} turno(s).`,
    multDanoCausado: 0.75,
    reduzNoFimDoTurno: 1,
  },
  veneno: {
    id: 'veneno',
    nome: 'Veneno',
    tipo: 'debuff',
    descricao: (q) => `Perde ${q} de vida no início do turno (ignora bloqueio). Depois, reduz 1.`,
    perdaNoInicioDoTurno: (q) => q,
    reduzNoInicioDoTurno: 1,
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
    descricao: (q) => `Cada golpe recebido causa +${q} de dano. Reduz 1 no fim do turno.`,
    somaDanoRecebido: (q) => q,
    reduzNoFimDoTurno: 1,
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

/** Aplica as reduções de fim de turno de todos os status. */
export function tickEndOfTurn(map: StatusMap): void {
  for (const [id, q] of activeStatuses(map)) {
    const reduz = STATUS_DEFS[id].reduzNoFimDoTurno;
    if (reduz) addStatus(map, id, -Math.min(reduz, q));
  }
}

/** Calcula a perda de vida de início de turno e aplica as reduções. Retorna a perda total. */
export function tickStartOfTurn(map: StatusMap): Array<{ status: StatusId; perda: number }> {
  const perdas: Array<{ status: StatusId; perda: number }> = [];
  for (const [id, q] of activeStatuses(map)) {
    const def = STATUS_DEFS[id];
    if (def.perdaNoInicioDoTurno) {
      perdas.push({ status: id, perda: def.perdaNoInicioDoTurno(q) });
    }
    if (def.reduzNoInicioDoTurno) addStatus(map, id, -Math.min(def.reduzNoInicioDoTurno, q));
  }
  return perdas;
}
