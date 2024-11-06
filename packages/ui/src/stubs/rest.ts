import { Rest } from '@kaoto/camel-catalog/types';

export const restStub: { rest: Rest } = {
  rest: {
    id: 'rest-1234',
    bindingMode: 'auto',
    openApi: {
      specification: 'https://api.example.com/openapi.json',
    },
  },
};
