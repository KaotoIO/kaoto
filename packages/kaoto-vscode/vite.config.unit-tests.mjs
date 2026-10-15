import { readdirSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

const root = import.meta.dirname;
const testRoot = path.join(root, 'src', 'test');
const entry = Object.fromEntries(
  readdirSync(testRoot, { recursive: true })
    .filter((file) => file.endsWith('.test.ts'))
    .map((file) => [`test/${file.split(path.sep).join('/').replace(/\.ts$/, '')}`, path.join(testRoot, file)]),
);

export default defineConfig({
  root,
  publicDir: false,
  resolve: {
    conditions: ['@kaoto/source', 'node'],
  },
  build: {
    outDir: 'out',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    sourcemap: true,
    lib: { entry, formats: ['cjs'] },
    rolldownOptions: {
      platform: 'node',
      // Bundle Kaoto workspace sources while retaining native Node/VS Code APIs
      // and the existing runtime instances of other packages.
      external: (id) => {
        if (id === '@kaoto/kaoto' || id.startsWith('@kaoto/kaoto/')) return false;
        return !id.startsWith('.') && !path.isAbsolute(id);
      },
      output: {
        // Keep test locations stable for discovery and __dirname-based fixtures.
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
