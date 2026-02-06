import { act, renderHook } from '@testing-library/react';
import { createElement, ReactNode } from 'react';

import { EntityType } from '../../models/camel/entities';
import { EntitiesContext, SettingsContext } from '../../providers';
import { SourceCodeContext } from '../../providers/source-code.provider';
import {
  applyRouteExistsToOperations,
  buildOperationsFromSpec,
  buildRestDefinitionFromOperations,
  toggleSelectAllOperations,
  useRestDslImportWizard,
} from './useRestDslImportWizard';

describe('buildOperationsFromSpec', () => {
  it('maps consumes/produces from request and response content types', () => {
    const spec = {
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

    const operations = buildOperationsFromSpec(spec);
    expect(operations).toHaveLength(1);
    expect(operations[0].consumes).toBe('application/json,application/xml,application/x-www-form-urlencoded');
    expect(operations[0].produces).toBe('application/json,application/xml');
  });

  it('maps responseMessage from OpenAPI responses', () => {
    const spec = {
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

    const operations = buildOperationsFromSpec(spec);
    expect(operations).toHaveLength(1);
    expect(operations[0].responseMessage).toEqual([
      { code: '200', message: 'Successful operation' },
      { code: '400', message: 'Invalid input' },
      { code: 'default', message: 'Unexpected error' },
    ]);
  });

  it('maps security requirements and scopes from OpenAPI operation security', () => {
    const spec = {
      paths: {
        '/pet': {
          post: {
            operationId: 'addPet',
            security: [{ petstore_auth: ['write:pets', 'read:pets'] }, { api_key: [] }],
          },
        },
      },
    };

    const operations = buildOperationsFromSpec(spec);
    expect(operations).toHaveLength(1);
    expect(operations[0].security).toEqual([
      { key: 'petstore_auth', scopes: 'write:pets,read:pets' },
      { key: 'api_key' },
    ]);
  });

  it('maps params from OpenAPI operation/path parameters', () => {
    const spec = {
      paths: {
        '/pet/{id}': {
          parameters: [
            {
              name: 'id',
              in: 'path',
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
                in: 'query',
                required: false,
                schema: { type: 'string', default: 'available', enum: ['available', 'sold'] },
              },
            ],
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    };

    const operations = buildOperationsFromSpec(spec);
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

  it('uses summary when description is missing and maps deprecated flag', () => {
    const spec = {
      paths: {
        '/pet': {
          put: {
            operationId: 'updatePet',
            summary: 'Update pet summary',
            deprecated: true,
            responses: {
              '200': {
                content: {
                  'application/json': {},
                },
              },
            },
          },
        },
      },
    };

    const operations = buildOperationsFromSpec(spec);
    expect(operations).toHaveLength(1);
    expect(operations[0].description).toBe('Update pet summary');
    expect(operations[0].deprecated).toBe(true);
  });

  it('falls back to first response content type when no 2xx response exists', () => {
    const spec = {
      paths: {
        '/pet': {
          post: {
            operationId: 'addPet',
            responses: {
              '400': {
                content: {
                  'application/problem+json': {},
                },
              },
            },
          },
        },
      },
    };

    const operations = buildOperationsFromSpec(spec);
    expect(operations).toHaveLength(1);
    expect(operations[0].produces).toBe('application/problem+json');
  });

  it('uses generated operationId when OpenAPI operationId is missing', () => {
    const spec = {
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

    const operations = buildOperationsFromSpec(spec);
    expect(operations).toHaveLength(1);
    expect(operations[0].operationId).toBe('delete-/pet');
  });
});

describe('buildRestDefinitionFromOperations', () => {
  it('builds rest operation entries with mapped import fields', () => {
    const definition = buildRestDefinitionFromOperations(
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
});

describe('route exists selection behavior', () => {
  it('keeps route-existing operations unselected when selecting all', () => {
    const withRouteExists = applyRouteExistsToOperations(
      [
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
      ],
      new Set(['addPet']),
    );

    const toggled = toggleSelectAllOperations(withRouteExists, true);
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
    const withRouteExists = applyRouteExistsToOperations(
      [
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
      ],
      new Set(['addPet']),
    );

    const toggled = toggleSelectAllOperations(withRouteExists, false);
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
});

describe('useRestDslImportWizard', () => {
  it('does not create duplicate route when operation direct route already exists', () => {
    const addNewEntity = jest.fn();
    const getVisualEntities = jest.fn().mockReturnValue([]);
    const updateEntitiesFromCamelResource = jest.fn();
    const updateSourceCodeFromEntities = jest.fn();

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        SettingsContext.Provider,
        {
          value: {
            getSettings: () => ({ rest: { apicurioRegistryUrl: '', customMediaTypes: [] } }),
          } as never,
        },
        createElement(
          SourceCodeContext.Provider,
          { value: '' },
          createElement(
            EntitiesContext.Provider,
            {
              value: {
                entities: [],
                currentSchemaType: 'integration',
                visualEntities: [
                  {
                    type: EntityType.Route,
                    entityDef: {
                      route: {
                        from: {
                          uri: 'direct:addPet',
                        },
                      },
                    },
                  },
                ],
                camelResource: {
                  addNewEntity,
                  getVisualEntities,
                },
                updateEntitiesFromCamelResource,
                updateSourceCodeFromEntities,
              } as never,
            },
            children,
          ),
        ),
      );

    const { result } = renderHook(() => useRestDslImportWizard({ isActive: true }), { wrapper });

    const spec = JSON.stringify({
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/pet': {
          post: {
            operationId: 'addPet',
            responses: {
              '200': { description: 'ok' },
            },
          },
        },
      },
    });

    act(() => {
      result.current.setOpenApiSpecText(spec);
      result.current.handleParseOpenApiSpec();
    });

    let imported = false;
    act(() => {
      imported = result.current.handleImportOpenApi();
    });

    expect(imported).toBe(false);
    expect(addNewEntity).not.toHaveBeenCalled();
    expect(updateEntitiesFromCamelResource).not.toHaveBeenCalled();
  });
});
