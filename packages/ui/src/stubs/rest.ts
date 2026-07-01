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
  securityRequirements: undefined,
  get: [
    {
      path: '/hello',
      param: [
        { name: 'name', type: 'query', required: 'true', allowableValues: undefined, examples: undefined },
        {
          name: 'name2',
          type: 'query',
          required: 'true',
          defaultValue: 'blah',
          allowableValues: undefined,
          examples: undefined,
        },
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
    {
      path: '/bye',
      consumes: 'application/json',
      param: undefined,
      responseMessage: undefined,
      security: undefined,
      to: { uri: 'direct:bye' },
    },
  ],
  post: [
    {
      path: '/bye',
      param: undefined,
      responseMessage: undefined,
      security: undefined,
      to: { uri: 'mock:update' },
    },
  ],
};

export const restWithSecurityRequirementsStub = {
  path: '/api',
  securityDefinitions: {
    apiKey: {
      key: 'api_key',
      name: 'api_key',
      inHeader: 'true',
    },
    oauth2: {
      key: 'oauth2',
      flow: 'application',
      tokenUrl: 'https://oauth.example.com/token',
      scopes: [
        { key: 'read', value: 'Read access' },
        { key: 'write', value: 'Write access' },
      ],
    },
  },
  securityRequirements: [{ key: 'api_key' }, { key: 'oauth2', scopes: 'read,write' }],
  get: [
    {
      path: '/users',
      param: undefined,
      responseMessage: undefined,
      security: undefined,
      to: { uri: 'direct:getUsers' },
    },
  ],
};
