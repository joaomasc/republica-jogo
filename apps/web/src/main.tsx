import '@fontsource-variable/cinzel';
import '@fontsource-variable/source-sans-3';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import './styles/index.css';
import { REAL_PARTIES } from '@republica/game-engine';
import { preloadPartyLogos } from '@republica/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { prefetchRoutes, router } from './app/router';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

// Logos dos partidos reais (~480 KB) e as telas carregadas sob demanda: baixam assim que o
// menu fica ocioso (painéis abrem na hora e o jogo segue inteiro se a conexão cair depois).
const warmLogos = () => {
  preloadPartyLogos(REAL_PARTIES.map((p) => p.logo));
  // No servidor de desenvolvimento cada tela é compilada sob demanda: pré-carregar tudo só
  // disputaria CPU com o jogo.
  if (import.meta.env.PROD) prefetchRoutes();
};
if (typeof window.requestIdleCallback === 'function')
  window.requestIdleCallback(warmLogos, { timeout: 1500 });
else setTimeout(warmLogos, 300);
