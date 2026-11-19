import { act, renderHook } from '@testing-library/react';
import { set } from 'lodash';
import { OpenApi } from 'openapi-v3';
import { FunctionComponent, PropsWithChildren, useMemo, useState } from 'react';

import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { EntityType } from '../models/entities';
import { KaotoResource } from '../models/kaoto-resource';
import { AbstractSettingsAdapter } from '../models/settings/settings.model';
import { EntitiesContext, EntitiesContextResult, SettingsContext } from '../providers';
import { OpenApiProcessingService } from '../services/openapi-processing.service';
import { TestProvidersWrapper } from '../stubs/TestProvidersWrapper';
import { useRestDslImportWizard } from './useRestDslImportWizard';

describe('useRestDslImportWizard', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchSpy.mockClear();

    const { Provider } = await TestProvidersWrapper();
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
    saveSettings: () => {},
  } as unknown as AbstractSettingsAdapter;

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

      let returnValue: { error?: string } | undefined;
      act(() => {
        returnValue = result.current.handleSchemaLoaded({
          schema: validSpec,
          source: 'file',
          sourceIdentifier: 'openapi.json',
        });
      });

      expect(returnValue).toEqual({});
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

    it('handles invalid OpenAPI spec gracefully', async () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      let returnValue: { error?: string } | undefined;
      act(() => {
        returnValue = result.current.handleSchemaLoaded({
          schema: 'invalid json {{{',
          source: 'file',
          sourceIdentifier: 'invalid.json',
        });
      });

      expect(returnValue).toEqual({ error: expect.stringMatching(/Invalid OpenAPI specification/) });
      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.parseError).toMatch(/Invalid OpenAPI specification/);
      expect(result.current.importStatus).toBeNull();
    });

    it('handles spec with no paths', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      const noPaths = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
      });

      let returnValue: { error?: string } | undefined;
      act(() => {
        returnValue = result.current.handleSchemaLoaded({
          schema: noPaths,
          source: 'file',
          sourceIdentifier: 'empty.json',
        });
      });

      expect(returnValue).toEqual({ error: 'No operations were found in the specification.' });
      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.parseError).toBe('No operations were found in the specification.');
    });

    it('reports the message when processing the specification throws an Error', () => {
      vi.spyOn(OpenApiProcessingService, 'buildOperationsFromSpec').mockImplementationOnce(() => {
        throw new Error('cannot process');
      });
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      let returnValue: { error?: string } | undefined;
      act(() => {
        returnValue = result.current.handleSchemaLoaded({
          schema: JSON.stringify({ openapi: '3.0.0', paths: {} }),
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      expect(returnValue).toEqual({ error: 'cannot process' });
      expect(result.current.parseError).toBe('cannot process');
    });

    it('reports a generic error when processing the specification throws a non-Error value', () => {
      vi.spyOn(OpenApiProcessingService, 'buildOperationsFromSpec').mockImplementationOnce(() => {
        throw 'not an error';
      });
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      let returnValue: { error?: string } | undefined;
      act(() => {
        returnValue = result.current.handleSchemaLoaded({
          schema: JSON.stringify({ openapi: '3.0.0', paths: {} }),
          source: 'file',
          sourceIdentifier: 'spec.json',
        });
      });

      expect(returnValue).toEqual({ error: 'Invalid OpenAPI specification.' });
      expect(result.current.isOpenApiParsed).toBe(false);
    });
  });

  it('does not create duplicate route when operation direct route already exists (direct:operationId format)', async () => {
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

    await camelResource.initialize();
    const { Provider, updateEntitiesFromCamelResourceSpy } = await TestProvidersWrapper({ camelResource });
    const addNewEntitySpy = vi.spyOn(camelResource, 'addNewEntity');

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

  it('does not create duplicate route when operation direct route already exists (parameters.name format)', async () => {
    const camelResource = new CamelRouteResource([
      {
        route: {
          from: {
            uri: 'direct',
            parameters: { name: 'addPet' },
            steps: [],
          },
        },
      },
    ]);
    await camelResource.initialize();

    const { Provider, updateEntitiesFromCamelResourceSpy } = await TestProvidersWrapper({ camelResource });
    const addNewEntitySpy = vi.spyOn(camelResource, 'addNewEntity');

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

  describe('source state', () => {
    const validSpec = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: { '/pet': { get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } } } },
    });

    it('invalidates the parsed specification when the text is edited', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });
      act(() => {
        result.current.handleSchemaLoaded({ schema: validSpec, source: 'file', sourceIdentifier: 'spec.json' });
      });
      expect(result.current.isOpenApiParsed).toBe(true);

      act(() => {
        result.current.setOpenApiSpecText(validSpec.replace('/pet', '/orders'));
      });

      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.importOperations).toHaveLength(0);
      expect(result.current.openApiLoadSource).toBe('manual');
      expect(result.current.sourceIdentifier).toBe('');

      act(() => {
        result.current.handleParseOpenApiSpec();
      });

      expect(result.current.isOpenApiParsed).toBe(true);
      expect(result.current.importOperations[0].path).toBe('/orders');
    });

    it('clears the parse error when the text is edited', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });
      act(() => {
        result.current.handleParseOpenApiSpec();
      });
      expect(result.current.parseError).not.toBeNull();

      act(() => {
        result.current.setOpenApiSpecText('openapi: 3.0.0');
      });

      expect(result.current.parseError).toBeNull();
    });

    it('does not report an import error as a parse error', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });
      act(() => {
        result.current.handleSchemaLoaded({ schema: validSpec, source: 'file', sourceIdentifier: 'spec.json' });
      });
      act(() => {
        result.current.handleToggleSelectAllOperations(false);
      });
      act(() => {
        result.current.handleImportOpenApi();
      });
      expect(result.current.importStatus?.type).toBe('error');

      act(() => {
        result.current.handleImportSourceChange('uri');
      });

      expect(result.current.parseError).toBeNull();
    });

    it('clears the parse error when the source changes', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });
      act(() => {
        result.current.handleSchemaLoaded({ schema: 'invalid json {{{', source: 'file', sourceIdentifier: 'bad.json' });
      });
      expect(result.current.parseError).not.toBeNull();

      act(() => {
        result.current.handleImportSourceChange('uri');
      });

      expect(result.current.parseError).toBeNull();
    });

    it('discards what was derived from the file when the source is cleared', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });
      act(() => {
        result.current.handleSchemaLoaded({ schema: validSpec, source: 'file', sourceIdentifier: 'spec.json' });
      });

      act(() => {
        result.current.handleSourceCleared();
      });

      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.importOperations).toHaveLength(0);
      expect(result.current.openApiSpecText).toBe('');
      expect(result.current.openApiLoadSource).toBeUndefined();
      expect(result.current.sourceIdentifier).toBe('');
    });

    it('keeps the URI until the source changes or the wizard is reset', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });
      act(() => {
        result.current.setImportUri('http://example.com/spec.yaml');
      });
      expect(result.current.importUri).toBe('http://example.com/spec.yaml');

      act(() => {
        result.current.handleImportSourceChange('file');
      });
      expect(result.current.importUri).toBe('');

      act(() => {
        result.current.setImportUri('http://example.com/spec.yaml');
      });
      act(() => {
        result.current.resetImportWizard();
      });
      expect(result.current.importUri).toBe('');
    });
  });

  describe('handleParseOpenApiSpec', () => {
    it('sets error status when spec text is empty', () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      act(() => {
        result.current.handleParseOpenApiSpec();
      });

      expect(result.current.parseError).toBe('Provide an OpenAPI specification to import.');
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

    it('sets error when spec text is invalid', async () => {
      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper });

      act(() => {
        result.current.setOpenApiSpecText('not valid yaml {{{');
      });

      act(() => {
        result.current.handleParseOpenApiSpec();
      });

      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.parseError).toEqual(expect.any(String));
    });

    it('resets the parsed state when the text is not an OpenAPI document', () => {
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
        result.current.handleSchemaLoaded({ schema: validSpec, source: 'file', sourceIdentifier: 'spec.json' });
      });
      expect(result.current.isOpenApiParsed).toBe(true);

      act(() => {
        result.current.setOpenApiSpecText('just some text');
      });
      act(() => {
        result.current.handleParseOpenApiSpec();
      });

      expect(result.current.isOpenApiParsed).toBe(false);
      expect(result.current.importOperations).toHaveLength(0);
      expect(result.current.parseError).toBe('Invalid OpenAPI specification.');
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

      act(() => {
        result.current.handleToggleSelectAllOperations(false);
      });

      expect(result.current.importOperations.every((op) => !op.selected)).toBe(true);

      act(() => {
        result.current.handleToggleSelectAllOperations(true);
      });

      expect(result.current.importOperations.every((op) => op.selected)).toBe(true);
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
    let camelResource: KaotoResource;
    let updateEntitiesFromCamelResourceSpy: EntitiesContextResult['updateEntitiesFromCamelResource'];

    beforeEach(async () => {
      const testProvider = await TestProvidersWrapper();
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
        updateModel: vi.fn(),
      };
      camelResource.addNewEntity = vi.fn().mockReturnValue('new-route-1');
      camelResource.getVisualEntities = vi.fn().mockReturnValue([mockRouteEntity]);

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
      expect(mockRouteEntity.updateModel).toHaveBeenCalledWith('route.from.uri', 'direct');
      expect(mockRouteEntity.updateModel).toHaveBeenCalledWith('route.from.parameters', { name: 'getPet' });
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
        updateModel: vi.fn(),
        getRootPath: vi.fn().mockReturnValue('rest'),
      };
      camelResource.addNewEntity = vi.fn().mockReturnValue('new-rest-1');
      camelResource.getEntities = vi.fn().mockReturnValue([mockRestEntity]);

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
      const mockRouteEntity = { id: 'new-route-1', type: 'route', updateModel: vi.fn() };
      const mockRestEntity = {
        id: 'new-rest-1',
        type: 'rest',
        updateModel: vi.fn(),
        getRootPath: vi.fn().mockReturnValue('rest'),
      };
      camelResource.addNewEntity = vi.fn().mockImplementation((type) => {
        return type === 'rest' ? 'new-rest-1' : 'new-route-1';
      });
      camelResource.getVisualEntities = vi.fn().mockReturnValue([mockRouteEntity]);
      camelResource.getEntities = vi.fn().mockReturnValue([mockRestEntity]);

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
      expect(mockRestEntity.updateModel).toHaveBeenCalled();
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalled();
    });

    it('reports plural message for multiple operations', () => {
      const mockRouteEntity1 = { id: 'new-route-1', type: 'route', updateModel: vi.fn() };
      const mockRouteEntity2 = { id: 'new-route-2', type: 'route', updateModel: vi.fn() };
      let routeCount = 0;
      camelResource.addNewEntity = vi.fn().mockImplementation(() => {
        routeCount++;
        return `new-route-${routeCount}`;
      });
      camelResource.getVisualEntities = vi.fn().mockReturnValue([mockRouteEntity1, mockRouteEntity2]);

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

    it('records the outputs of the completed import', () => {
      camelResource.addNewEntity = vi.fn().mockReturnValue('new-1');
      camelResource.getVisualEntities = vi.fn().mockReturnValue([]);

      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper: routeWrapper });
      act(() => {
        result.current.handleSchemaLoaded({ schema: validSpec, source: 'file', sourceIdentifier: 'spec.json' });
      });
      expect(result.current.importedOutputs).toBeNull();

      act(() => {
        result.current.handleImportOpenApi();
      });
      expect(result.current.importedOutputs).toEqual({ rest: false, routes: true });

      act(() => {
        result.current.setImportCreateRest(true);
        result.current.setImportCreateRoutes(false);
      });
      act(() => {
        result.current.handleImportOpenApi();
      });
      expect(result.current.importedOutputs).toEqual({ rest: true, routes: false });
    });

    it('refreshes the routes when the import fails halfway, so a retry does not duplicate them', () => {
      const twoOperationsSpec = JSON.stringify({
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/pet': {
            get: { operationId: 'getPet', responses: { '200': { description: 'ok' } } },
            post: { operationId: 'addPet', responses: { '200': { description: 'ok' } } },
          },
        },
      });

      // A resource that keeps the routes it is given, and fails on the second one the first time
      type FakeRoute = {
        id: string;
        type: EntityType;
        entityDef: { route?: { from?: { parameters?: { name?: string } } } };
        updateModel: (path: string, value: unknown) => void;
      };
      const routes: FakeRoute[] = [];
      let shouldFail = true;
      const fakeResource = {
        addNewEntity: vi.fn(() => {
          if (shouldFail && routes.length === 1) {
            shouldFail = false;
            throw new Error('boom');
          }
          const entityDef = {};
          const id = `route-${routes.length + 1}`;
          routes.push({
            id,
            type: EntityType.Route,
            entityDef,
            updateModel: (path, value) => {
              set(entityDef, path, value);
            },
          });
          return id;
        }),
        getVisualEntities: () => routes,
      };

      const StatefulProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
        const [visualEntities, setVisualEntities] = useState<FakeRoute[]>([]);
        const value = useMemo(
          () =>
            ({
              camelResource: fakeResource,
              visualEntities,
              updateEntitiesFromCamelResource: () => {
                setVisualEntities([...routes]);
              },
            }) as unknown as EntitiesContextResult,
          [visualEntities],
        );
        return (
          <SettingsContext.Provider value={mockSettingsContext}>
            <EntitiesContext.Provider value={value}>{children}</EntitiesContext.Provider>
          </SettingsContext.Provider>
        );
      };

      const { result } = renderHook(() => useRestDslImportWizard(), { wrapper: StatefulProvider });
      act(() => {
        result.current.handleSchemaLoaded({ schema: twoOperationsSpec, source: 'file', sourceIdentifier: 'spec.json' });
      });

      let failure: unknown;
      act(() => {
        try {
          result.current.handleImportOpenApi();
        } catch (error) {
          failure = error;
        }
      });
      expect(failure).toEqual(new Error('boom'));
      expect(result.current.importStatus).toBeNull();
      expect(result.current.importedOutputs).toBeNull();
      expect(
        result.current.importOperations.map((operation) => [operation.operationId, operation.routeExists]),
      ).toEqual([
        ['getPet', true],
        ['addPet', false],
      ]);

      act(() => {
        result.current.handleImportOpenApi();
      });

      expect(result.current.importStatus?.type).toBe('success');
      const routeNames = routes.map((route) => route.entityDef.route?.from?.parameters?.name);
      expect(routeNames).toEqual(['getPet', 'addPet']);
    });
  });
});
