import { createRng } from '../../engine/core/index.ts';
import styles from './App.module.css';

const DEMO_SEED = 42;

// Tela provisória da Etapa 0: só prova que a interface consegue ler o motor.
const rng = createRng(DEMO_SEED);
const demoNumbers = Array.from({ length: 5 }, () => rng.int(1, 9));

export function App() {
  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <header>
          <h1 className={styles.title}>
            Vigília <span className={styles.stage}>· Etapa 0</span>
          </h1>
          <p className={styles.subtitle}>Fundação do projeto. Ainda sem gameplay.</p>
        </header>

        <section className={styles.panel} aria-label="Estado do motor">
          <p className={styles.status}>
            <span className={styles.dot} aria-hidden="true" />
            Motor OK
          </p>
          <p className={styles.label}>RNG (semente {DEMO_SEED})</p>
          <p className={styles.numbers}>{demoNumbers.join(', ')}</p>
        </section>
      </div>
    </main>
  );
}
