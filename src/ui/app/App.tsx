import { useState } from 'react';
import { Battle } from '../screens/Battle/Battle.tsx';
import { EncounterSelect, randomSeed } from '../screens/EncounterSelect/EncounterSelect.tsx';

type Tela =
  { tipo: 'selecao' } | { tipo: 'batalha'; encontro: string; semente: number; rodada: number };

export function App() {
  const [tela, setTela] = useState<Tela>({ tipo: 'selecao' });

  if (tela.tipo === 'selecao') {
    return (
      <EncounterSelect
        onLutar={(encontro, semente) => setTela({ tipo: 'batalha', encontro, semente, rodada: 0 })}
      />
    );
  }

  return (
    <Battle
      key={`${tela.encontro}-${tela.semente}-${tela.rodada}`}
      encontroId={tela.encontro}
      semente={tela.semente}
      onRepetir={() => setTela({ ...tela, rodada: tela.rodada + 1 })}
      onNovaSemente={() => setTela({ ...tela, semente: randomSeed(), rodada: 0 })}
      onVoltar={() => setTela({ tipo: 'selecao' })}
    />
  );
}
