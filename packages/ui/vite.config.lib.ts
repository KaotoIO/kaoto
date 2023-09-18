import { UserConfig, defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export const getConfig = (): UserConfig => ({
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
      external: [
        'react',
        'react-dom',
        '@patternfly/patternfly',
        '@patternfly/react-code-editor',
        '@patternfly/react-core',
        '@patternfly/react-icons',
        '@patternfly/react-table',
        '@patternfly/react-topology',
        'react-monaco-editor',
        'monaco-editor',
        'monaco-yaml',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@patternfly/patternfly': '@patternfly/patternfly',
          '@patternfly/react-code-editor': '@patternfly/react-code-editor',
          '@patternfly/react-core': '@patternfly/react-core',
          '@patternfly/react-icons': '@patternfly/react-icons',
          '@patternfly/react-table': '@patternfly/react-table',
          '@patternfly/react-topology': '@patternfly/react-topology',
          'react-monaco-editor': 'react-monaco-editor',
          'monaco-editor': 'monaco-editor',
          'monaco-yaml': 'monaco-yaml',
        },
      },
    },
  },
});

export default defineConfig(getConfig());
