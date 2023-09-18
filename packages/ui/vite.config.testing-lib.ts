import { defineConfig } from 'vite';
import { getConfig } from './vite.config.lib';

// https://vitejs.dev/config/
const testingConfig = getConfig();
testingConfig.build!.emptyOutDir = false;
testingConfig.build!.lib = {
  entry: './src/testing-api.ts',
  name: '@kaoto-next/testing-ui',
  fileName: 'kaoto-next-testing-ui',
};
testingConfig.build!.rollupOptions!.output = {
  ...testingConfig.build!.rollupOptions!.output,
  globals: {
    react: 'React',
    'react-dom': 'ReactDOM',
  },
  assetFileNames: 'testing-[name][extname]',
};

export default defineConfig(testingConfig);
