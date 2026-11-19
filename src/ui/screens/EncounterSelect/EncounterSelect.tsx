import { useState } from 'react';
import { CONTENT, ENCOUNTERS } from '../../../content/encounters.ts';
import styles from './EncounterSelect.module.css';

export interface EncounterSelectProps {
  onLutar: (encontroId: string, semente: number) => void;
}

export const randomSeed = () => Math.floor(Math.random() * 1_000_000);

export function EncounterSelect({ onLutar }: EncounterSelectProps) {
  const [semente, setSemente] = useState('');

  const lutar = (id: string) => {
    const valor = Number.parseInt(semente, 10);
    onLutar(id, Number.isFinite(valor) && valor >= 0 ? valor : randomSeed());
  };

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Vigília <span>· Protótipo de combate</span>
        </h1>
        <p className={styles.subtitle}>
          Escolha um encontro. Todos usam o mesmo deck de teste com 15 cartas e começam com a vida
          cheia.
        </p>
      </header>

      <ul className={styles.list}>
        {ENCOUNTERS.map((e, i) => (
          <li key={e.id} className={styles.item}>
            <span className={styles.number}>{i + 1}</span>
            <div className={styles.info}>
              <h2>{e.nome}</h2>
              <p>{e.descricao}</p>
              <p className={styles.enemies}>
                {e.inimigos
                  .map((id) => {
                    const def = CONTENT.inimigos[id];
                    return def ? `${def.nome} (${def.vidaMax} de vida)` : id;
                  })
                  .join(' + ')}
              </p>
            </div>
            <button type="button" className={styles.fight} onClick={() => lutar(e.id)}>
              Lutar
            </button>
          </li>
        ))}
      </ul>

      <label className={styles.seed}>
        Semente (opcional)
        <input
          inputMode="numeric"
          placeholder="aleatória"
          value={semente}
          onChange={(ev) => setSemente(ev.target.value.replace(/\D/g, ''))}
        />
      </label>
      <p className={styles.tip}>
        Dica: passe o mouse sobre intenções, status, cartas e recursos para ver o que fazem.
      </p>
    </main>
  );
}
