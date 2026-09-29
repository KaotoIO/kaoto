import { defineConfig } from 'orval';

export default defineConfig({
  kompanionClient: {
    input: {
      target: './dist/openapi/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './build/generated/client',
      schemas: './build/generated/model',
      client: 'fetch',
      clean: true,
    },
  },
});
