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

export const restWithVerbsStup = {
  path: '/say',
  securityDefinitions: {
    oauth2: {
      key: 'oauth2',
      flow: 'application',
      tokenUrl: '{{oauth.token.url}}',
      scopes: [
        { key: '{{oauth.scope.service.self}}', value: '{{oauth.scope.service.self}}' },
        { key: '{{oauth.scope.test.person.data}}', value: '{{oauth.scope.test.person.data}}' },
      ],
    },
  },
  get: [
    {
      path: '/hello',
      param: [
        { name: 'name', type: 'query', required: 'true' },
        { name: 'name2', type: 'query', required: 'true', defaultValue: 'blah' },
      ],
      security: [{ key: 'hello', scopes: 'scope' }],
      responseMessage: [
        {
          message: 'hello',
          code: '200',
          examples: [
            { key: 'example', value: 'value' },
            { key: 'example', value: 'value' },
          ],
          header: [
            {
              name: 'header',
              description: 'header',
              allowableValues: [{ value: '1' }, { value: '2' }],
            },
          ],
        },
      ],
      to: { uri: 'direct:hello' },
    },
    // <post path=\"/bye\"><to uri=\"mock:update\"/></post></rest></camel>"
    { path: '/bye', consumes: 'application/json', to: { uri: 'direct:bye' } },
  ],
  post: [{ path: '/bye', to: { uri: 'mock:update' } }],
};
