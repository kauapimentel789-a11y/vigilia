import { useState } from 'react';
import { CONTEUDO } from '../../content/index.ts';
import { xpParaProximo } from '../../engine/hunter/hunter.ts';
import ui from '../components/common.module.css';
import { DEV_PANEL_VISIVEL, DevPanel } from '../components/DevPanel.tsx';
import { Icone } from '../art/Icone.tsx';
import type { IconeId } from '../art/icons.ts';
import { Sprite } from '../art/Sprite.tsx';
import { aparenciaDaClasse } from '../art/sprites.ts';
import { ReturnReport } from '../components/ReturnReport.tsx';
import { SaveConflict } from '../components/Account.tsx';
import { num } from '../format.ts';
import { Abilities } from '../screens/Abilities/Abilities.tsx';
import { Arena } from '../screens/Arena/Arena.tsx';
import { Ecos } from '../screens/Ecos/Ecos.tsx';
import { Expedition } from '../screens/Expedition/Expedition.tsx';
import { Hunt } from '../screens/Hunt/Hunt.tsx';
import { Hunter } from '../screens/Hunter/Hunter.tsx';
import { useGame } from '../store/game.ts';
import s from './App.module.css';

type Aba = 'cacar' | 'cacador' | 'habilidades' | 'ecos' | 'expedicao' | 'arena';

const ABAS: Array<{ id: Aba; nome: string; icone: IconeId }> = [
  { id: 'cacar', nome: 'Caçar', icone: 'ataque' },
  { id: 'cacador', nome: 'Caçador', icone: 'elmo' },
  { id: 'habilidades', nome: 'Habilidades', icone: 'livro' },
  { id: 'ecos', nome: 'Ecos', icone: 'eco' },
  { id: 'expedicao', nome: 'Expedição', icone: 'ampulheta' },
  { id: 'arena', nome: 'Arena', icone: 'torre' },
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
    <div className={`${s.app} ${aba === 'cacar' ? s.modoCaca : ''}`}>
      <header className={s.topo}>
        <div className={s.marca}>
          <img className={s.icone} src="/icone.svg" alt="" width={30} height={30} />
          <strong className={s.nome}>Vigília</strong>
        </div>

        <button className={s.placa} onClick={() => setAba('cacador')} title="Ver o caçador">
          <Sprite ap={aparenciaDaClasse(c.classe)} tamanho={40} className={s.retrato} />
          <span className={s.placaInfo}>
            <span className={s.placaLinha}>
              <strong>Level {c.level}</strong>
              <span className={s.rank}>{CONTEUDO.ranks[estado.rank].nome}</span>
              {c.pontosLivres > 0 && <span className={s.pontos}>+{c.pontosLivres} pontos</span>}
            </span>
            <span
              className={s.xp}
              role="progressbar"
              aria-label="Experiência"
              aria-valuemin={0}
              aria-valuemax={noMax ? 1 : proximo}
              aria-valuenow={noMax ? 1 : c.xp}
            >
              <span style={{ width: `${noMax ? 100 : Math.min(100, (c.xp / proximo) * 100)}%` }} />
              <em>{noMax ? 'Level máximo' : `${num(c.xp)} / ${num(proximo)} XP`}</em>
            </span>
          </span>
        </button>

        <div className={s.recursos}>
          <span className={s.recurso} title="Ouro">
            <Icone id="moeda" tamanho={18} /> {num(estado.ouro)}
          </span>
          <span className={s.recurso} title="Poções de vida">
            <Icone id="pocao" tamanho={18} /> {estado.pocoes}
          </span>
          <span className={s.recurso} title="Glória da Arena">
            <Icone id="gloria" tamanho={18} /> {num(estado.arena.gloria)}
          </span>
          {estado.expedicao && (
            <button className={s.expedicao} onClick={() => setAba('expedicao')}>
              <Icone id="ampulheta" tamanho={16} />
              {CONTEUDO.portais[estado.expedicao.portal]?.nome}
            </button>
          )}
        </div>
      </header>

      <nav className={s.abas} aria-label="Telas">
        {ABAS.map((a) => (
          <button
            key={a.id}
            className={`${s.aba} ${aba === a.id ? s.ativa : ''}`}
            onClick={() => setAba(a.id)}
            aria-current={aba === a.id ? 'page' : undefined}
          >
            <Icone id={a.icone} tamanho={20} />
            <span>{a.nome}</span>
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
        ) : aba === 'ecos' ? (
          <Ecos />
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
