import { useState } from 'react';
import { CONTEUDO } from '../../content/index.ts';
import { xpParaProximo } from '../../engine/hunter/hunter.ts';
import ui from '../components/common.module.css';
import { DEV_PANEL_VISIVEL, DevPanel } from '../components/DevPanel.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { ReturnReport } from '../components/ReturnReport.tsx';
import { SaveConflict } from '../components/Account.tsx';
import { num } from '../format.ts';
import { Abilities } from '../screens/Abilities/Abilities.tsx';
import { Arena } from '../screens/Arena/Arena.tsx';
import { Expedition } from '../screens/Expedition/Expedition.tsx';
import { Hunt } from '../screens/Hunt/Hunt.tsx';
import { Hunter } from '../screens/Hunter/Hunter.tsx';
import { useGame } from '../store/game.ts';
import s from './App.module.css';

type Aba = 'cacar' | 'cacador' | 'habilidades' | 'expedicao' | 'arena';

const ABAS: Array<{ id: Aba; nome: string; icone: string }> = [
  { id: 'cacar', nome: 'Caçar', icone: '⚔' },
  { id: 'cacador', nome: 'Caçador', icone: '◆' },
  { id: 'habilidades', nome: 'Habilidades', icone: '✦' },
  { id: 'expedicao', nome: 'Expedição', icone: '⧗' },
  { id: 'arena', nome: 'Arena', icone: '♜' },
];

export function App() {
  const [aba, setAba] = useState<Aba>('cacar');
  const estado = useGame((g) => g.estado);
  const aviso = useGame((g) => g.aviso);
  const avisar = useGame((g) => g.avisar);
  const c = estado.cacador;
  const P = CONTEUDO.progressao;
  const noMax = c.level >= P.levelMax;
  const proximo = xpParaProximo(P, c.level);

  return (
    <div className={s.app}>
      <header className={s.topo}>
        <div className={s.marca}>
          <strong>Vigília</strong>
          <span className={ui.tag}>Rank {CONTEUDO.ranks[estado.rank].nome}</span>
        </div>
        <div className={s.level}>
          <div className={ui.row}>
            <strong>Level {c.level}</strong>
            <span className={ui.muted}>
              {noMax ? 'máximo nesta etapa' : `${num(c.xp)} / ${num(proximo)} XP`}
            </span>
            {c.pontosLivres > 0 && (
              <button className={s.pontos} onClick={() => setAba('cacador')}>
                {c.pontosLivres} pontos
              </button>
            )}
          </div>
          <ProgressBar valor={noMax ? 1 : c.xp} max={noMax ? 1 : proximo} rotulo="Experiência" />
        </div>
        <div className={s.ouro} title="Ouro">
          <span aria-hidden>●</span> {num(estado.ouro)}
        </div>
        {estado.expedicao && (
          <button className={s.expedicao} onClick={() => setAba('expedicao')}>
            ⧗ Em expedição: {CONTEUDO.portais[estado.expedicao.portal]?.nome}
          </button>
        )}
      </header>

      <nav className={s.abas} aria-label="Telas">
        {ABAS.map((a) => (
          <button
            key={a.id}
            className={`${s.aba} ${aba === a.id ? s.ativa : ''}`}
            onClick={() => setAba(a.id)}
            aria-current={aba === a.id ? 'page' : undefined}
          >
            <span aria-hidden>{a.icone}</span>
            {a.nome}
          </button>
        ))}
      </nav>

      <main className={s.conteudo}>
        {aba === 'cacar' ? (
          <Hunt />
        ) : aba === 'cacador' ? (
          <Hunter />
        ) : aba === 'habilidades' ? (
          <Abilities />
        ) : aba === 'arena' ? (
          <Arena />
        ) : (
          <Expedition />
        )}
      </main>

      {aviso && (
        <div className={s.aviso} role="status">
          <span>{aviso}</span>
          <button className={ui.small} onClick={() => avisar(null)} aria-label="Fechar aviso">
            ✕
          </button>
        </div>
      )}
      <ReturnReport />
      <SaveConflict />
      {DEV_PANEL_VISIVEL && <DevPanel />}
    </div>
  );
}
