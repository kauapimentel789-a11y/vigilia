import type { RitualState } from '../../../engine/combat/index.ts';
import styles from './Hud.module.css';

export interface HudProps {
  energia: number;
  energiaMax: number;
  brasa: number;
  brasaMax: number;
  compra: number;
  descarte: number;
  consumidas: number;
  rituais: RitualState[];
  podeEncerrar: boolean;
  onEncerrar: () => void;
}

export function Hud(p: HudProps) {
  return (
    <div className={styles.hud}>
      <div className={styles.resources}>
        <div
          className={styles.energy}
          data-tip={`Energia: paga o custo das cartas. Volta a ${p.energiaMax} a cada turno.`}
          tabIndex={0}
        >
          <span className={styles.energyValue}>
            {p.energia}/{p.energiaMax}
          </span>
          <span className={styles.label}>Energia</span>
        </div>
        <div
          className={styles.brasa}
          data-tip={`Brasa: a energia que sobra no fim do turno vira Brasa (até ${p.brasaMax}). Use para Avivar cartas.`}
          tabIndex={0}
        >
          <span className={styles.embers} aria-label={`${p.brasa} de ${p.brasaMax} Brasa`}>
            {Array.from({ length: p.brasaMax }, (_, i) => (
              <span key={i} className={`${styles.ember} ${i < p.brasa ? styles.emberOn : ''}`} />
            ))}
          </span>
          <span className={styles.label}>
            Brasa {p.brasa}/{p.brasaMax}
          </span>
        </div>
        {p.rituais.length > 0 && (
          <ul className={styles.rituals} aria-label="Rituais ativos">
            {p.rituais.map((r, i) => (
              <li key={i} data-tip={`Ritual ativo: ${r.descricao}`} tabIndex={0}>
                Ritual ativo
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.piles}>
        <span
          data-tip="Pilha de compra. Quando acaba, o descarte é embaralhado e vira a nova pilha."
          tabIndex={0}
        >
          Compra <strong>{p.compra}</strong>
        </span>
        <span data-tip="Cartas jogadas e cartas que sobraram na mão." tabIndex={0}>
          Descarte <strong>{p.descarte}</strong>
        </span>
        {p.consumidas > 0 && (
          <span data-tip="Cartas consumidas: saíram deste combate." tabIndex={0}>
            Consumidas <strong>{p.consumidas}</strong>
          </span>
        )}
        <button
          type="button"
          className={styles.endTurn}
          onClick={p.onEncerrar}
          disabled={!p.podeEncerrar}
        >
          Encerrar turno
        </button>
      </div>
    </div>
  );
}
