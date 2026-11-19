import type { ReactNode } from 'react';
import type { IntentKind, Unit as UnitState } from '../../../engine/combat/index.ts';
import { STATUS_DEFS, activeStatuses } from '../../../engine/combat/index.ts';
import styles from './Unit.module.css';

export interface IntentView {
  tipos: IntentKind[];
  nome: string;
  /** Número principal mostrado (ex.: dano total). */
  valor?: number | undefined;
  golpes?: number | undefined;
  dica: string;
  aviso?: string | undefined;
}

export interface FloatingNumber {
  key: number;
  texto: string;
  tipo: 'dano' | 'bloqueio' | 'veneno';
}

export interface UnitProps {
  unidade: UnitState;
  intencao?: IntentView | null;
  alvoValido?: boolean;
  destaque?: boolean;
  flutuantes?: FloatingNumber[];
  onClick?: () => void;
}

/** Silhuetas provisórias (Etapa 6 troca por arte final). */
const SILHUETAS: Record<string, ReactNode> = {
  jogador: (
    <path d="M50 10c-12 0-20 10-20 22v8l-8 30h56l-8-30v-8c0-12-8-22-20-22Zm-6 22a6 6 0 1 1 12 0 6 6 0 1 1-12 0Z" />
  ),
  'carnical-faminto': (
    <path d="M18 70c0-20 10-38 30-42 6-10 18-12 26-4 6 6 6 16 0 22l8 24H64l-4-12-10 12H34l4-10-10 10Z" />
  ),
  'tecela-palida': (
    <>
      <ellipse cx="50" cy="48" rx="16" ry="20" />
      <path
        d="M36 40 10 26M36 50 6 50M36 60 12 76M64 40l26-14M64 50h30M64 60l24 16"
        strokeWidth="4"
        stroke="currentColor"
      />
    </>
  ),
  'cavaleiro-oco': <path d="M30 20h40l6 18v14l-8 6v22H32V58l-8-6V38Zm8 22v6h24v-6Z" />,
  'sentinela-ossuda': (
    <path d="M50 14c-14 0-22 10-22 22 0 8 4 14 10 18v8h24v-8c6-4 10-10 10-18 0-12-8-22-22-22Zm-10 20a5 5 0 1 1 10 0 5 5 0 1 1-10 0Zm12 0a5 5 0 1 1 10 0 5 5 0 1 1-10 0ZM36 66h28v12H36Z" />
  ),
};

function IntentIcon({ tipos }: { tipos: IntentKind[] }) {
  const principal = tipos.includes('ataque')
    ? 'ataque'
    : tipos.includes('preparar')
      ? 'preparar'
      : (tipos[0] ?? 'defesa');
  const paths: Record<IntentKind, ReactNode> = {
    ataque: <path d="M4 20 16 8l2-6 4 2-2 4L8 20l2 2-2 2-6-6 2-2Z" />,
    defesa: <path d="M12 2 4 5v6c0 6 4 10 8 11 4-1 8-5 8-11V5Z" />,
    buff: <path d="M12 3 4 13h5v8h6v-8h5Z" />,
    debuff: <path d="M12 3c-4 6-7 9-7 13a7 7 0 0 0 14 0c0-4-3-7-7-13Z" />,
    preparar: <path d="M6 2h12v5l-4 5 4 5v5H6v-5l4-5-4-5Z" />,
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className={`${styles.intentIcon} ${styles[principal]}`}
      aria-hidden="true"
    >
      {paths[principal]}
    </svg>
  );
}

export function Unit({
  unidade,
  intencao,
  alvoValido,
  destaque,
  flutuantes = [],
  onClick,
}: UnitProps) {
  const morto = unidade.vida <= 0;
  const pct = Math.max(0, (unidade.vida / unidade.vidaMax) * 100);
  const classes = [
    styles.unit,
    styles[unidade.tipo],
    alvoValido ? styles.targetable : '',
    destaque ? styles.hit : '',
    morto ? styles.dead : '',
  ].join(' ');
  const Tag = onClick ? 'button' : 'div';

  return (
    <div className={styles.slot}>
      <div className={styles.intentRow}>
        {intencao && !morto && (
          <div className={styles.intent} data-tip={intencao.dica} tabIndex={0}>
            <IntentIcon tipos={intencao.tipos} />
            {intencao.valor !== undefined && (
              <span className={styles.intentValue}>
                {intencao.valor}
                {intencao.golpes && intencao.golpes > 1 ? `×${intencao.golpes}` : ''}
              </span>
            )}
            <span className={styles.intentName}>{intencao.nome}</span>
          </div>
        )}
        {intencao?.aviso && !morto && <div className={styles.warning}>{intencao.aviso}</div>}
      </div>

      <Tag
        {...(onClick ? { type: 'button' as const, onClick, disabled: morto } : {})}
        className={classes}
        aria-label={`${unidade.nome}, ${unidade.vida} de ${unidade.vidaMax} de vida${unidade.bloqueio ? `, ${unidade.bloqueio} de bloqueio` : ''}`}
      >
        <svg viewBox="0 0 100 90" className={styles.figure} aria-hidden="true" fill="currentColor">
          {SILHUETAS[unidade.defId] ?? <circle cx="50" cy="45" r="30" />}
        </svg>
        <span className={styles.name}>{unidade.nome}</span>
        <span className={styles.bars}>
          <span className={styles.hpBar}>
            <span className={styles.hpFill} style={{ width: `${pct}%` }} />
            <span className={styles.hpText}>
              {unidade.vida}/{unidade.vidaMax}
            </span>
          </span>
          {unidade.bloqueio > 0 && (
            <span className={styles.block} data-tip="Bloqueio: absorve dano antes da vida.">
              {unidade.bloqueio}
            </span>
          )}
        </span>
        {flutuantes.map((f) => (
          <span key={f.key} className={`${styles.float} ${styles[`float_${f.tipo}`]}`}>
            {f.texto}
          </span>
        ))}
      </Tag>

      <ul className={styles.statuses} aria-label="Status">
        {activeStatuses(unidade.status).map(([id, q]) => (
          <li
            key={id}
            className={`${styles.status} ${styles[STATUS_DEFS[id].tipo]}`}
            data-tip={`${STATUS_DEFS[id].nome}: ${STATUS_DEFS[id].descricao(q)}`}
            tabIndex={0}
          >
            {STATUS_DEFS[id].nome} {q}
          </li>
        ))}
      </ul>
    </div>
  );
}
