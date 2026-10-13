import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_API_PROXY ?? 'http://localhost:3333';

export default defineConfig({
  // Publicação em subcaminho (GitHub Pages: /republica/). Local: raiz.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  // As telas são carregadas sob demanda (router.tsx): sem isto, o servidor de desenvolvimento só
  // descobre dependências como o Recharts quando um painel abre, re-otimiza e recarrega a página
  // no meio da partida. Varre todas as telas na partida.
  // O three.js vem do pacote @republica/ui (mapa 3D, carregado sob demanda): incluído à parte.
  optimizeDeps: {
    entries: ['index.html', 'src/**/*.tsx'],
    include: ['three', 'three/addons/controls/MapControls.js'],
  },
  server: {
    port: 5173,
    proxy: { '/api': { target: API_TARGET, changeOrigin: true } },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: API_TARGET, changeOrigin: true } },
  },
  build: {
    chunkSizeWarningLimit: 1800,
  },
});
