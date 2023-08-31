import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'ui-test',
  video: true,

  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    viewportWidth: 1920,
    viewportHeight: 1080,
  },
});
