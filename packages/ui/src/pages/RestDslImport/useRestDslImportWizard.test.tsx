import { act, renderHook } from '@testing-library/react';
import { OpenApi } from 'openapi-v3';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelResource } from '../../models/camel/camel-resource';
import { CamelRouteResource } from '../../models/camel/camel-route-resource';
import { EntitiesContextResult, SettingsContext } from '../../providers';
import { TestProvidersWrapper } from '../../stubs/TestProvidersWrapper';
import { useRestDslImportWizard } from './useRestDslImportWizard';

describe('useRestDslImportWizard', () => {
  const fetchSpy = jest.spyOn(globalThis, 'fetch');
  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy.mockClear();

    const { Provider } = TestProvidersWrapper();
    wrapper = ({ children }) => (
      <SettingsContext.Provider value={mockSettingsContext}>
        <Provider>{children}</Provider>
      </SettingsContext.Provider>
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const mockSettingsContext = {
    getSettings: () => ({ rest: { apicurioRegistryUrl: '', customMediaTypes: [] } }),
  } as never;

  describe('handleSchemaLoaded', () => {
    it('parses valid OpenAPI spec and updates state', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const validSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: {
              operationId: 'getPet',
              responses: { '200': { description: 'ok' } },
            },
          },
        },
      });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'openapi.json',
        });
      });

      expect(result.current.isOpenApiParsed).toBe(true);
      expect(result.current.openApiLoadSource).toBe('file');
      expect(result.current.sourceIdentifier).toBe('openapi.json');
      expect(result.current.importOperations).toHaveLength(1);
      expect(result.current.importOperations[0].operationId).toBe('getPet');
    });

    it('updates state for URI source', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const validSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/user': {
            post: {
              operationId: 'createUser',
              responses: { '201': { description: 'created' } },
            },
          },
        },
      });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'uri',
          sourceIdentifier: 'https://example.com/openapi.yaml',
        });
      });

      expect(result.current.isOpenApiParsed).toBe(true);
      expect(result.current.openApiLoadSource).toBe('uri');
      expect(result.current.sourceIdentifier).toBe('https://example.com/openapi.yaml');
      expect(result.current.importOperations).toHaveLength(1);
    });

    it('updates state for Apicurio source', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const validSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/order': {
            delete: {
              operationId: 'deleteOrder',
              responses: { '204': { description: 'deleted' } },
            },
          },
        },
      });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'apicurio',
          sourceIdentifier: 'https://registry/artifacts/my-api',
        });
      });

      expect(result.current.isOpenApiParsed).toBe(true);
      expect(result.current.openApiLoadSource).toBe('apicurio');
      expect(result.current.sourceIdentifier).toBe('https://registry/artifacts/my-api');
      expect(result.current.importOperations).toHaveLength(1);
    });

    it('handles invalid OpenAPI spec gracefully', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: 'invalid json {{{',
          source: 'file',
          sourceIdentifier: 'invalid.json',
        });
      });

      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.importStatus).toEqual({
        type: 'error',
        message: expect.stringMatching(/Invalid spec/),
      });
    });

    it('handles spec with no paths', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const noPaths = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: noPaths,
          source: 'file',
          sourceIdentifier: 'empty.json',
        });
      });

      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.importStatus).toEqual({
        type: 'error',
        message: 'No operations were found in the specification.',
      });
    });
  });

  it('does not create duplicate route when operation direct route already exists', () => {
    const camelResource = new CamelRouteResource([
      {
        route: {
          from: {
            uri: 'direct:addPet',
            steps: [],
          },
        },
      },
    ]);

    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper({ camelResource });
    const addNewEntitySpy = jest.spyOn(camelResource, 'addNewEntity');

    const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <SettingsContext.Provider value={mockSettingsContext}>
        <Provider>{children}</Provider>
      </SettingsContext.Provider>
    );

    const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

    const spec: OpenApi = {
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
    };

    act(() => {
      result.current.setOpenApiSpecText(JSON.stringify(spec));
    });

    act(() => {
      result.current.handleParseOpenApiSpec();
    });

    let imported = false;
    act(() => {
      imported = result.current.handleImportOpenApi();
    });

    expect(imported).toBe(false);
    expect(addNewEntitySpy).not.toHaveBeenCalled();
    expect(updateEntitiesFromCamelResourceSpy).not.toHaveBeenCalled();
  });

  describe('resetImportWizard', () => {
    it('resets all state to defaults after loading a spec', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const validSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
          },
        },
      });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'uri',
          sourceIdentifier: 'https://example.com/openapi.yaml',
        });
      });

      expect(result.current.isOpenApiParsed).toBe(true);
      expect(result.current.importOperations).toHaveLength(1);

      act(() => {
        result.current.resetImportWizard();
      });

      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.openApiSpecText).toBe('');
      expect(result.current.sourceIdentifier).toBe('');
      expect(result.current.openApiLoadSource).toBeUndefined();
      expect(result.current.importSource).toBe('file');
      expect(result.current.importCreateRest).toBe(false);
      expect(result.current.importCreateRoutes).toBe(true);
      expect(result.current.importSelectAll).toBe(true);
      expect(result.current.importOperations).toHaveLength(0);
      expect(result.current.importStatus).toBeNull();
    });
  });

  describe('handleImportSourceChange', () => {
    it('changes import source and resets relevant state', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const validSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
          },
        },
      });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      expect(result.current.importSource).toBe('file');
      expect(result.current.isOpenApiParsed).toBe(true);

      act(() => {
        result.current.handleImportSourceChange('uri');
      });

      expect(result.current.importSource).toBe('uri');
      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.openApiLoadSource).toBeUndefined();
      expect(result.current.sourceIdentifier).toBe('');
      expect(result.current.importOperations).toHaveLength(0);
    });
  });

  describe('handleParseOpenApiSpec', () => {
    it('sets error status when spec text is empty', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      act(() => {
        result.current.handleParseOpenApiSpec();
      });

      expect(result.current.importStatus).toEqual({
        type: 'error',
        message: 'Provide an OpenAPI specification to import.',
      });
      expect(result.current.isOpenApiParsed).toBe(false);
    });

    it('parses valid spec text that was previously set', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const validSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
          },
        },
      });

      act(() => {
        result.current.setOpenApiSpecText(validSpec);
      });

      act(() => {
        result.current.handleParseOpenApiSpec();
      });

      expect(result.current.isOpenApiParsed).toBe(true);
      expect(result.current.importStatus).toBeNull();
      expect(result.current.importOperations).toHaveLength(1);
    });

    it('sets error when spec text is invalid', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      act(() => {
        result.current.setOpenApiSpecText('not valid yaml {{{');
      });

      act(() => {
        result.current.handleParseOpenApiSpec();
      });

      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.importStatus).toEqual({
        type: 'error',
        message: expect.any(String),
      });
    });
  });

  describe('handleToggleSelectAllOperations', () => {
    it('deselects all operations and then selects all', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const validSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
            post: { operationId: 'addPet', responses: { '200': { description: 'ok' } } },
          },
        },
      });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      expect(result.current.importOperations).toHaveLength(2);
      expect(result.current.importSelectAll).toBe(true);

      act(() => {
        result.current.handleToggleSelectAllOperations(false);
      });

      expect(result.current.importOperations.every((op) => !op.selected)).toBe(true);
      expect(result.current.importSelectAll).toBe(false);

      act(() => {
        result.current.handleToggleSelectAllOperations(true);
      });

      expect(result.current.importOperations.every((op) => op.selected)).toBe(true);
      expect(result.current.importSelectAll).toBe(true);
    });
  });

  describe('handleToggleOperation', () => {
    it('toggles selection of a specific operation', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const validSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
            post: { operationId: 'addPet', responses: { '200': { description: 'ok' } } },
          },
        },
      });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      expect(result.current.importOperations).toHaveLength(2);
      expect(result.current.importOperations.every((op) => op.selected)).toBe(true);

      act(() => {
        result.current.handleToggleOperation('getPet', 'get', '/pet', false);
      });

      const getPetOp = result.current.importOperations.find((op) => op.operationId === 'getPet');
      const addPetOp = result.current.importOperations.find((op) => op.operationId === 'addPet');
      expect(getPetOp?.selected).toBe(false);
      expect(addPetOp?.selected).toBe(true);
      expect(result.current.importSelectAll).toBe(false);
    });
  });

  describe('handleImportOpenApi', () => {
    const validSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/pet': {
          get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
        },
      },
    });
    let routeWrapper: FunctionComponent<PropsWithChildren>;
    let camelResource: CamelResource;
    let updateEntitiesFromCamelResourceSpy: EntitiesContextResult['updateEntitiesFromCamelResource'];

    beforeEach(() => {
      const testProvider = TestProvidersWrapper();
      const Provider = testProvider.Provider;
      camelResource = testProvider.camelResource;
      updateEntitiesFromCamelResourceSpy = testProvider.updateEntitiesFromCamelResourceSpy;

      routeWrapper = ({ children }) => (
        <SettingsContext.Provider value={mockSettingsContext}>
          <Provider>{children}</Provider>
        </SettingsContext.Provider>
      );
    });

    it('returns false when neither REST nor routes are selected', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      act(() => {
        result.current.setImportCreateRest(false);
        result.current.setImportCreateRoutes(false);
      });

      let imported = false;
      act(() => {
        imported = result.current.handleImportOpenApi();
      });

      expect(imported).toBe(false);
      expect(result.current.importStatus).toEqual({
        type: 'error',
        message: 'Import failed. Choose at least one option to generate.',
      });
    });

    it('returns false when no operations are selected', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      act(() => {
        result.current.handleToggleSelectAllOperations(false);
      });

      let imported = false;
      act(() => {
        imported = result.current.handleImportOpenApi();
      });

      expect(imported).toBe(false);
      expect(result.current.importStatus).toEqual({
        type: 'error',
        message: 'Import failed. Select at least one operation.',
      });
    });

    it('creates routes when importCreateRoutes is enabled', () => {
      const mockRouteEntity = {
        id: 'new-route-1',
        type: 'route',
        updateModel: jest.fn(),
      };
      camelResource.addNewEntity = jest.fn().mockReturnValue('new-route-1');
      camelResource.getVisualEntities = jest.fn().mockReturnValue([mockRouteEntity]);

      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper: routeWrapper });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      let imported = false;
      act(() => {
        imported = result.current.handleImportOpenApi();
      });

      expect(imported).toBe(true);
      expect(camelResource.addNewEntity).toHaveBeenCalledWith('route');
      expect(mockRouteEntity.updateModel).toHaveBeenCalledWith('route.from.uri', 'direct:getPet');
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
      expect(result.current.importStatus).toEqual({
        type: 'success',
        message: 'Import succeeded. 1 operation added.',
      });
    });

    it('creates REST definition when importCreateRest is enabled', () => {
      const mockRestEntity = {
        id: 'new-rest-1',
        type: 'rest',
        updateModel: jest.fn(),
        getRootPath: jest.fn().mockReturnValue('rest'),
      };
      camelResource.addNewEntity = jest.fn().mockReturnValue('new-rest-1');
      camelResource.getVisualEntities = jest.fn().mockReturnValue([mockRestEntity]);

      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper: routeWrapper });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      act(() => {
        result.current.setImportCreateRest(true);
        result.current.setImportCreateRoutes(false);
      });

      let imported = false;
      act(() => {
        imported = result.current.handleImportOpenApi();
      });

      expect(imported).toBe(true);
      expect(camelResource.addNewEntity).toHaveBeenCalledWith('rest');
      expect(mockRestEntity.updateModel).toHaveBeenCalled();
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    });

    it('creates both routes and REST definitions when both are enabled', () => {
      const mockRouteEntity = { id: 'new-route-1', type: 'route', updateModel: jest.fn() };
      const mockRestEntity = {
        id: 'new-rest-1',
        type: 'rest',
        updateModel: jest.fn(),
        getRootPath: jest.fn().mockReturnValue('rest'),
      };
      camelResource.addNewEntity = jest.fn().mockImplementation((type) => {
        return type === 'rest' ? 'new-rest-1' : 'new-route-1';
      });
      camelResource.getVisualEntities = jest.fn().mockReturnValue([mockRouteEntity, mockRestEntity]);

      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper: routeWrapper });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      act(() => {
        result.current.setImportCreateRest(true);
        result.current.setImportCreateRoutes(true);
      });

      let imported = false;
      act(() => {
        imported = result.current.handleImportOpenApi();
      });

      expect(imported).toBe(true);
      expect(camelResource.addNewEntity).toHaveBeenCalledWith('route');
      expect(camelResource.addNewEntity).toHaveBeenCalledWith('rest');
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    });

    it('reports plural message for multiple operations', () => {
      const mockRouteEntity1 = { id: 'new-route-1', type: 'route', updateModel: jest.fn() };
      const mockRouteEntity2 = { id: 'new-route-2', type: 'route', updateModel: jest.fn() };
      let routeCount = 0;
      camelResource.addNewEntity = jest.fn().mockImplementation(() => {
        routeCount++;
        return `new-route-${routeCount}`;
      });
      camelResource.getVisualEntities = jest.fn().mockReturnValue([mockRouteEntity1, mockRouteEntity2]);

      const multiOpSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
            post: { operationId: 'addPet', responses: { '200': { description: 'ok' } } },
          },
        },
      });

      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper: routeWrapper });

      act(() => {
        result.current.handleSchemaLoaded({
          schema: multiOpSpec,
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      let imported = false;
      act(() => {
        imported = result.current.handleImportOpenApi();
      });

      expect(imported).toBe(true);
      expect(result.current.importStatus?.message).toBe('Import succeeded. 2 operations added.');
    });
  });
});
