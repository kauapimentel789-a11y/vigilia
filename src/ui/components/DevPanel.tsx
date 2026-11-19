import { useState } from 'react';
import { useGame } from '../store/game.ts';
import ui from './common.module.css';

const H = 3_600_000;

/** Atalhos de teste. Só aparecem fora do site de produção. */
export const DEV_PANEL_VISIVEL =
  import.meta.env.DEV ||
  (typeof location !== 'undefined' && location.hostname !== 'vigilia-alpha.vercel.app');

export function DevPanel() {
  const [aberto, setAberto] = useState(false);
  const avancar = useGame((g) => g.avancarTempo);
  const temExpedicao = useGame((g) => g.estado.expedicao !== null);
  const apagar = useGame((g) => g.apagarProgresso);

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 72, zIndex: 30 }}>
      {aberto ? (
        <div
          className={ui.panel}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 210 }}
        >
          <strong style={{ fontSize: '0.85rem' }}>Painel de teste (só na prévia)</strong>
          <button className={ui.button} disabled={!temExpedicao} onClick={() => avancar(H)}>
            Expedição: +1 hora
          </button>
          <button className={ui.button} disabled={!temExpedicao} onClick={() => avancar(8 * H)}>
            Expedição: +8 horas
          </button>
          <button className={ui.danger} onClick={apagar}>
            Apagar progresso
          </button>
          <button className={ui.small} onClick={() => setAberto(false)}>
            Fechar
          </button>
        </div>
      ) : (
        <button
          className={ui.small}
          onClick={() => setAberto(true)}
          aria-label="Abrir painel de teste"
        >
          🛠
        </button>
      )}
    </div>
  );
}
