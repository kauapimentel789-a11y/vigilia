import { useState } from 'react';
import { CONTEUDO } from '../../content/index.ts';
import { xpParaProximo } from '../../engine/hunter/hunter.ts';
import ui from '../components/common.module.css';
import { DEV_PANEL_VISIVEL, DevPanel } from '../components/DevPanel.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { ReturnReport } from '../components/ReturnReport.tsx';
import { num } from '../format.ts';
import { Abilities } from '../screens/Abilities/Abilities.tsx';
import { AutoBattle } from '../screens/AutoBattle/AutoBattle.tsx';
import { Expedition } from '../screens/Expedition/Expedition.tsx';
import { Hunter } from '../screens/Hunter/Hunter.tsx';
import { Portals } from '../screens/Portals/Portals.tsx';
import { useGame } from '../store/game.ts';
import s from './App.module.css';

type Aba = 'cacador' | 'habilidades' | 'portais' | 'expedicao';

const ABAS: Array<{ id: Aba; nome: string; icone: string }> = [
  { id: 'cacador', nome: 'Caçador', icone: '◆' },
  { id: 'habilidades', nome: 'Habilidades', icone: '✦' },
  { id: 'portais', nome: 'Portais', icone: '◎' },
  { id: 'expedicao', nome: 'Expedição', icone: '⧗' },
];

export function App() {
  const [aba, setAba] = useState<Aba>('portais');
  const estado = useGame((g) => g.estado);
  const combate = useGame((g) => g.combate);
  const aviso = useGame((g) => g.aviso);
  const avisar = useGame((g) => g.avisar);
  const fecharCombate = useGame((g) => g.fecharCombate);
  const entrar = useGame((g) => g.entrarNoPortal);
  const [rodada, setRodada] = useState(0);
  const c = estado.cacador;
  const P = CONTEUDO.progressao;
  const noMax = c.level >= P.levelMax;
  const proximo = xpParaProximo(P, c.level);

  return (
    <div className={s.app}>
      <header className={s.topo}>
        <div className={s.marca}>
          <strong>Vigília</strong>
          <span className={ui.tag}>Rank Cinza</span>
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
        {combate ? (
          <AutoBattle
            key={rodada}
            combate={combate}
            podeRepetir={!estado.expedicao}
            onVoltar={fecharCombate}
            onRepetir={() => {
              entrar(combate.portal);
              setRodada((r) => r + 1);
            }}
          />
        ) : aba === 'cacador' ? (
          <Hunter />
        ) : aba === 'habilidades' ? (
          <Abilities />
        ) : aba === 'portais' ? (
          <Portals onExpedicao={() => setAba('expedicao')} />
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
      {DEV_PANEL_VISIVEL && <DevPanel />}
    </div>
  );
}
