import { OpenApi, OpenApiParameter } from 'openapi-v3';

import { OpenApiProcessingService } from './openapi-processing.service';

describe('OpenApiProcessingService', () => {
  describe('buildOperationsFromSpec()', () => {
    it('maps consumes/produces from request and response content types', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            post: {
              operationId: 'addPet',
              requestBody: {
                content: {
                  'application/json': {},
                  'application/xml': {},
                  'application/x-www-form-urlencoded': {},
                },
              },
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {},
                    'application/xml': {},
                  },
                },
              },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].consumes).toBe('application/json,application/xml,application/x-www-form-urlencoded');
      expect(operations[0].produces).toBe('application/json,application/xml');
    });

    it('maps responseMessage from OpenAPI responses', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            post: {
              operationId: 'addPet',
              responses: {
                '200': { description: 'Successful operation' },
                '400': { description: 'Invalid input' },
                default: { description: 'Unexpected error' },
              },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].responseMessage).toEqual([
        { code: '200', message: 'Successful operation' },
        { code: '400', message: 'Invalid input' },
        { code: 'default', message: 'Unexpected error' },
      ]);
    });

    it('maps response headers with allowable values', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: {
              operationId: 'getPet',
              responses: {
                '200': {
                  description: 'Success',
                  headers: {
                    'X-Rate-Limit': {
                      description: 'Rate limit',
                      schema: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                      },
                      content: {},
                    },
                    'X-Request-Id': {
                      description: 'Request ID',
                      content: {},
                    },
                  },
                },
              },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].responseMessage).toEqual([
        {
          code: '200',
          message: 'Success',
          header: [
            {
              name: 'X-Rate-Limit',
              description: 'Rate limit',
              allowableValues: [{ value: 'low' }, { value: 'medium' }, { value: 'high' }],
            },
            {
              name: 'X-Request-Id',
              description: 'Request ID',
            },
          ],
        },
      ]);
    });

    it('maps response headers without descriptions', () => {
      const spec: OpenApi = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: {
              operationId: 'getPet',
              responses: {
                '200': {
                  description: 'Success',
                  headers: {
                    'X-Correlation-Id': {
                      schema: { type: 'string' },
                      content: {},
                    },
                  },
                },
              },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].responseMessage).toEqual([
        {
          code: '200',
          message: 'Success',
          header: [{ name: 'X-Correlation-Id' }],
        },
      ]);
    });

    it('maps security requirements and scopes from OpenAPI operation security', () => {
      const spec: OpenApi = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            post: {
              operationId: 'addPet',
              security: [{ petstore_auth: ['write:pets', 'read:pets'] }, { api_key: [] }],
              responses: {
                '200': { description: 'Success' },
              },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].security).toEqual([
        { key: 'petstore_auth', scopes: 'write:pets,read:pets' },
        { key: 'api_key' },
      ]);
    });

    it('maps params from OpenAPI operation/path parameters', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet/{id}': {
            parameters: [
              {
                name: 'id',
                in: 'path' as const,
                required: true,
                description: 'Pet id',
                schema: { type: 'string' },
              },
            ],
            get: {
              operationId: 'getPet',
              parameters: [
                {
                  name: 'status',
                  in: 'query' as const,
                  required: false,
                  schema: { type: 'string', default: 'available', enum: ['available', 'sold'] },
                },
              ],
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].param).toEqual([
        {
          name: 'id',
          type: 'path',
          required: true,
          description: 'Pet id',
          dataType: 'string',
        },
        {
          name: 'status',
          type: 'query',
          required: false,
          dataType: 'string',
          defaultValue: 'available',
          allowableValues: [{ value: 'available' }, { value: 'sold' }],
        },
      ]);
    });

    it('merges path and operation parameters with operation taking precedence', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet/{id}': {
            parameters: [
              {
                name: 'id',
                in: 'path' as const,
                required: true,
                description: 'Path level description',
                schema: { type: 'string' },
              },
            ],
            get: {
              operationId: 'getPet',
              parameters: [
                {
                  name: 'id',
                  in: 'path' as const,
                  required: true,
                  description: 'Operation level description',
                  schema: { type: 'integer' },
                },
              ],
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].param).toEqual([
        {
          name: 'id',
          type: 'path',
          required: true,
          description: 'Operation level description',
          dataType: 'integer',
        },
      ]);
    });

    it('filters out invalid parameters without name or location', () => {
      const spec: OpenApi = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            parameters: [
              { name: 'valid', in: 'query' } as OpenApiParameter,
              { name: 'no-location' } as OpenApiParameter,
              { in: 'query' } as OpenApiParameter,
              null as unknown as OpenApiParameter,
              'invalid' as unknown as OpenApiParameter,
            ],
            get: {
              operationId: 'getPet',
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].param).toEqual([
        {
          name: 'valid',
          type: 'query',
        },
      ]);
    });

    it('uses summary when description is missing and maps deprecated flag', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            put: {
              operationId: 'updatePet',
              summary: 'Update pet summary',
              deprecated: true,
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {},
                  },
                },
              },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].description).toBe('Update pet summary');
      expect(operations[0].deprecated).toBe(true);
    });

    it('falls back to first response content type when no 2xx response exists', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            post: {
              operationId: 'addPet',
              responses: {
                '400': {
                  description: 'Error',
                  content: {
                    'application/problem+json': {},
                  },
                },
              },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].produces).toBe('application/problem+json');
    });

    it('uses generated operationId when OpenAPI operationId is missing', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            delete: {
              responses: {
                '200': { description: 'ok' },
              },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].operationId).toBe('delete-/pet');
    });

    it('returns empty array when spec has no paths', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      };
      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toEqual([]);
    });

    it('returns empty array when spec paths is undefined', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
      } as OpenApi;
      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toEqual([]);
    });

    it('handles all REST verbs', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
            post: { operationId: 'addPet', responses: { '200': { description: 'ok' } } },
            put: { operationId: 'updatePet', responses: { '200': { description: 'ok' } } },
            delete: { operationId: 'deletePet', responses: { '200': { description: 'ok' } } },
            patch: { operationId: 'patchPet', responses: { '200': { description: 'ok' } } },
            head: { operationId: 'headPet', responses: { '200': { description: 'ok' } } },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(6);
      expect(operations.map((op) => op.method)).toEqual(['get', 'post', 'put', 'delete', 'patch', 'head']);
    });

    it('sets all operations as selected by default', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
            post: { operationId: 'addPet', responses: { '200': { description: 'ok' } } },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations.every((op) => op.selected)).toBe(true);
      expect(operations.every((op) => !op.routeExists)).toBe(true);
    });

    it('handles operations with no optional fields', () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: {
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      };

      const operations = OpenApiProcessingService.buildOperationsFromSpec(spec);
      expect(operations).toHaveLength(1);
      expect(operations[0].operationId).toBe('get-/pet');
      expect(operations[0].description).toBeUndefined();
      expect(operations[0].consumes).toBeUndefined();
      expect(operations[0].produces).toBeUndefined();
      expect(operations[0].deprecated).toBeUndefined();
      expect(operations[0].param).toEqual([]);
      expect(operations[0].security).toEqual([]);
      expect(operations[0].responseMessage).toHaveLength(1);
    });
  });

  describe('buildRestDefinitionFromOperations()', () => {
    it('builds rest operation entries with mapped import fields', () => {
      const definition = OpenApiProcessingService.buildRestDefinitionFromOperations(
        [
          {
            operationId: 'updatePet',
            method: 'put',
            path: '/pet',
            description: 'Update an existing pet',
            consumes: 'application/json,application/xml',
            produces: 'application/json',
            param: [{ name: 'id', type: 'path' }],
            responseMessage: [{ code: '200', message: 'ok' }],
            security: [{ key: 'petstore_auth', scopes: 'write:pets,read:pets' }],
            deprecated: true,
            selected: true,
            routeExists: false,
          },
        ],
        'rest-1',
        'petstore.json',
      );

      expect(definition).toEqual({
        id: 'rest-1',
        openApi: { specification: 'petstore.json' },
        put: [
          {
            id: 'updatePet',
            path: '/pet',
            routeId: 'route-updatePet',
            to: 'direct:updatePet',
            description: 'Update an existing pet',
            consumes: 'application/json,application/xml',
            produces: 'application/json',
            param: [{ name: 'id', type: 'path' }],
            responseMessage: [{ code: '200', message: 'ok' }],
            security: [{ key: 'petstore_auth', scopes: 'write:pets,read:pets' }],
            deprecated: true,
          },
        ],
      });
    });

    it('omits openApi specification when URI is empty', () => {
      const definition = OpenApiProcessingService.buildRestDefinitionFromOperations(
        [
          {
            operationId: 'getPet',
            method: 'get',
            path: '/pet',
            selected: true,
            routeExists: false,
          },
        ],
        'rest-1',
        '',
      );

      expect(definition).toEqual({
        id: 'rest-1',
        get: [
          {
            id: 'getPet',
            path: '/pet',
            routeId: 'route-getPet',
            to: 'direct:getPet',
          },
        ],
      });
    });

    it('omits openApi specification when URI is whitespace', () => {
      const definition = OpenApiProcessingService.buildRestDefinitionFromOperations(
        [
          {
            operationId: 'getPet',
            method: 'get',
            path: '/pet',
            selected: true,
            routeExists: false,
          },
        ],
        'rest-1',
        '   ',
      );

      expect(definition).toEqual({
        id: 'rest-1',
        get: [
          {
            id: 'getPet',
            path: '/pet',
            routeId: 'route-getPet',
            to: 'direct:getPet',
          },
        ],
      });
    });

    it('groups multiple operations by method', () => {
      const definition = OpenApiProcessingService.buildRestDefinitionFromOperations(
        [
          {
            operationId: 'getPet',
            method: 'get',
            path: '/pet/{id}',
            selected: true,
            routeExists: false,
          },
          {
            operationId: 'listPets',
            method: 'get',
            path: '/pet',
            selected: true,
            routeExists: false,
          },
          {
            operationId: 'addPet',
            method: 'post',
            path: '/pet',
            selected: true,
            routeExists: false,
          },
        ],
        'rest-1',
        '',
      );

      expect(definition.get).toHaveLength(2);
      expect(definition.post).toHaveLength(1);
    });

    it('omits optional fields when not provided', () => {
      const definition = OpenApiProcessingService.buildRestDefinitionFromOperations(
        [
          {
            operationId: 'getPet',
            method: 'get',
            path: '/pet',
            description: '',
            consumes: '',
            produces: '',
            param: [],
            responseMessage: [],
            security: [],
            selected: true,
            routeExists: false,
          },
        ],
        'rest-1',
        '',
      );

      expect(definition.get).toBeDefined();
      expect(Array.isArray(definition.get)).toBe(true);
      expect((definition.get as Array<unknown>)[0]).toEqual({
        id: 'getPet',
        path: '/pet',
        routeId: 'route-getPet',
        to: 'direct:getPet',
      });
    });

    it('handles empty operations array', () => {
      const definition = OpenApiProcessingService.buildRestDefinitionFromOperations([], 'rest-1', 'spec.json');

      expect(definition).toEqual({
        id: 'rest-1',
        openApi: { specification: 'spec.json' },
      });
    });
  });

  describe('getOperationKey()', () => {
    it('generates unique key from operationId, method, and path', () => {
      const key = OpenApiProcessingService.getOperationKey({
        operationId: 'getPet',
        method: 'get',
        path: '/pet/{id}',
      });

      expect(key).toBe('getPet-get-/pet/{id}');
    });

    it('handles special characters in path', () => {
      const key = OpenApiProcessingService.getOperationKey({
        operationId: 'searchPets',
        method: 'get',
        path: '/pets?filter=active&sort=name',
      });

      expect(key).toBe('searchPets-get-/pets?filter=active&sort=name');
    });

    it('handles unicode characters in path', () => {
      const key = OpenApiProcessingService.getOperationKey({
        operationId: 'getUser',
        method: 'get',
        path: '/users/José',
      });

      expect(key).toBe('getUser-get-/users/José');
    });

    it('handles very long operation keys', () => {
      const longPath = '/api/v1/' + 'segment/'.repeat(50) + 'endpoint';
      const key = OpenApiProcessingService.getOperationKey({
        operationId: 'veryLongOperationId',
        method: 'post',
        path: longPath,
      });

      expect(key).toBe(`veryLongOperationId-post-${longPath}`);
      expect(key.length).toBeGreaterThan(100);
    });
  });

  describe('applyRouteExistsToOperations()', () => {
    it('marks operations with existing routes', () => {
      const operations = [
        {
          operationId: 'addPet',
          method: 'post',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
        {
          operationId: 'updatePet',
          method: 'put',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
      ];

      const result = OpenApiProcessingService.applyRouteExistsToOperations(operations, new Set(['addPet']));

      expect(result).toEqual([
        {
          operationId: 'addPet',
          method: 'post',
          path: '/pet',
          selected: true,
          routeExists: true,
        },
        {
          operationId: 'updatePet',
          method: 'put',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
      ]);
    });

    it('handles empty route set', () => {
      const operations = [
        {
          operationId: 'getPet',
          method: 'get',
          path: '/pet',
          selected: true,
          routeExists: true,
        },
      ];

      const result = OpenApiProcessingService.applyRouteExistsToOperations(operations, new Set());

      expect(result).toEqual([
        {
          operationId: 'getPet',
          method: 'get',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
      ]);
    });

    it('handles empty operations array', () => {
      const result = OpenApiProcessingService.applyRouteExistsToOperations([], new Set(['someRoute']));

      expect(result).toEqual([]);
    });

    it('handles operations where routeNames partially match', () => {
      const operations = [
        {
          operationId: 'getPet',
          method: 'get',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
        {
          operationId: 'getPets',
          method: 'get',
          path: '/pets',
          selected: true,
          routeExists: false,
        },
      ];

      const result = OpenApiProcessingService.applyRouteExistsToOperations(operations, new Set(['getPet']));

      expect(result[0].routeExists).toBe(true);
      expect(result[1].routeExists).toBe(false);
    });
  });

  describe('toggleSelectAllOperations()', () => {
    it('keeps route-existing operations unselected when selecting all', () => {
      const operations = [
        {
          operationId: 'addPet',
          method: 'post',
          path: '/pet',
          selected: false,
          routeExists: true,
        },
        {
          operationId: 'updatePet',
          method: 'put',
          path: '/pet',
          selected: false,
          routeExists: false,
        },
      ];

      const toggled = OpenApiProcessingService.toggleSelectAllOperations(operations, true);

      expect(toggled).toEqual([
        {
          operationId: 'addPet',
          method: 'post',
          path: '/pet',
          selected: false,
          routeExists: true,
        },
        {
          operationId: 'updatePet',
          method: 'put',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
      ]);
    });

    it('keeps route-existing operations unselected when deselecting all', () => {
      const operations = [
        {
          operationId: 'addPet',
          method: 'post',
          path: '/pet',
          selected: true,
          routeExists: true,
        },
        {
          operationId: 'updatePet',
          method: 'put',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
      ];

      const toggled = OpenApiProcessingService.toggleSelectAllOperations(operations, false);

      expect(toggled).toEqual([
        {
          operationId: 'addPet',
          method: 'post',
          path: '/pet',
          selected: false,
          routeExists: true,
        },
        {
          operationId: 'updatePet',
          method: 'put',
          path: '/pet',
          selected: false,
          routeExists: false,
        },
      ]);
    });

    it('handles empty operations array', () => {
      const toggled = OpenApiProcessingService.toggleSelectAllOperations([], true);

      expect(toggled).toEqual([]);
    });

    it('selects all operations when none have existing routes', () => {
      const operations = [
        {
          operationId: 'getPet',
          method: 'get',
          path: '/pet',
          selected: false,
          routeExists: false,
        },
        {
          operationId: 'addPet',
          method: 'post',
          path: '/pet',
          selected: false,
          routeExists: false,
        },
      ];

      const toggled = OpenApiProcessingService.toggleSelectAllOperations(operations, true);

      expect(toggled.every((op) => op.selected)).toBe(true);
    });

    it('deselects all operations when none have existing routes', () => {
      const operations = [
        {
          operationId: 'getPet',
          method: 'get',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
        {
          operationId: 'addPet',
          method: 'post',
          path: '/pet',
          selected: true,
          routeExists: false,
        },
      ];

      const toggled = OpenApiProcessingService.toggleSelectAllOperations(operations, false);

      expect(toggled.every((op) => !op.selected)).toBe(true);
    });
  });
});
