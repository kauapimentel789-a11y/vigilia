import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/theme/tokens.css';
import { App } from './ui/app/App';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Elemento #root não encontrado em index.html');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Só no modo de desenvolvimento: atalhos para testes automáticos da tela.
if (import.meta.env.DEV) {
  void Promise.all([import('./ui/screens/Hunt/session.ts'), import('./ui/store/game.ts')]).then(
    ([sessao, loja]) => {
      (window as unknown as Record<string, unknown>).__vigilia = {
        ...sessao,
        useGame: loja.useGame,
      };
    },
  );
}
