import { defineConfig } from 'cypress';
import vitePreprocessor from 'cypress-vite';

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      on('file:preprocessor', vitePreprocessor());
    },
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    viewportWidth: 1920,
    viewportHeight: 1080,
    chromeWebSecurity: false,
    defaultCommandTimeout: 8000,
  },
});
