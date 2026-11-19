import type { CombatContent, CombatState } from '../../../engine/combat/index.ts';
import styles from './ResultModal.module.css';

export interface ResultModalProps {
  estado: CombatState;
  content: CombatContent;
  onRepetir: () => void;
  onNovaSemente: () => void;
  onVoltar: () => void;
}

const TITULO = { vitoria: 'Vitória', derrota: 'Derrota', empate: 'Empate' } as const;

export function ResultModal({
  estado,
  content,
  onRepetir,
  onNovaSemente,
  onVoltar,
}: ResultModalProps) {
  if (!estado.resultado) return null;
  const s = estado.stats;
  const fontes = Object.entries(s.danoPorFonte).sort((a, b) => b[1] - a[1]);
  const nomeFonte = (id: string) =>
    content.cartas[id]?.nome ?? content.aliados[id]?.nome ?? (id === 'veneno' ? 'Veneno' : id);

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resultado-titulo"
    >
      <div className={`${styles.modal} ${styles[estado.resultado]}`}>
        <h2 id="resultado-titulo" className={styles.title}>
          {TITULO[estado.resultado]}
        </h2>
        {estado.resultado === 'empate' && (
          <p className={styles.note}>
            O combate passou do limite de turnos. Isso indica um problema de balanceamento.
          </p>
        )}
        <dl className={styles.stats}>
          <div>
            <dt>Turnos</dt>
            <dd>{estado.turno}</dd>
          </div>
          <div>
            <dt>Vida restante</dt>
            <dd>
              {estado.jogador.vida}/{estado.jogador.vidaMax}
            </dd>
          </div>
          <div>
            <dt>Dano causado</dt>
            <dd>{s.danoCausado}</dd>
          </div>
          <div>
            <dt>Dano recebido</dt>
            <dd>{s.danoRecebido}</dd>
          </div>
          <div>
            <dt>Cartas jogadas</dt>
            <dd>{s.cartasJogadas}</dd>
          </div>
          <div>
            <dt>Brasa gasta</dt>
            <dd>{s.brasaGasta}</dd>
          </div>
        </dl>
        {fontes.length > 0 && (
          <div className={styles.sources}>
            <h3>Dano por fonte</h3>
            <ul>
              {fontes.map(([id, dano]) => (
                <li key={id}>
                  <span>{nomeFonte(id)}</span>
                  <span>{dano}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className={styles.seed}>Semente {estado.semente}</p>
        <div className={styles.actions}>
          <button type="button" onClick={onRepetir}>
            Jogar de novo (mesma semente)
          </button>
          <button type="button" onClick={onNovaSemente}>
            Nova semente
          </button>
          <button type="button" onClick={onVoltar}>
            Escolher outro encontro
          </button>
        </div>
      </div>
    </div>
  );
}
