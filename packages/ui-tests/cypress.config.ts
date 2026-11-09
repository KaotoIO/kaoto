import { defineConfig } from 'cypress';
import cypressSplit from 'cypress-split';
import vitePreprocessor from 'cypress-vite';

export default defineConfig({
  projectId: 'ui-test',
  video: true,

  e2e: {
    setupNodeEvents(on, config) {
      cypressSplit(on, config);

      on(
        'file:preprocessor',
        vitePreprocessor({
          resolve: {
            conditions: ['@kaoto/source'],
          },
        }),
      );

      // IMPORTANT: return the config object
      return config;
    },
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    viewportWidth: 1920,
    viewportHeight: 1080,
    chromeWebSecurity: false,
    defaultCommandTimeout: 8000,
  },
});
