import { defineConfig } from 'tsup';

/** Empacota o servidor junto com os pacotes internos do monorepo (motor e contratos). */
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: [/^@republica\//],
});
