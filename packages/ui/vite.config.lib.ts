import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dts({ rollupTypes: true })],
  build: {
    outDir: './dist/lib',
    sourcemap: true,
    emptyOutDir: true,
    lib: {
      entry: './src/public-api.ts',
      name: '@kaoto-next/ui',
      fileName: 'kaoto-next-ui',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
