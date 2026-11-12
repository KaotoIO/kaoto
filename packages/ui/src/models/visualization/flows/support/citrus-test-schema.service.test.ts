import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { getFirstCitrusCatalogMap, setupCitrusDynamicCatalogRegistry } from '../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { TestActions } from '../../../citrus/entities/Test';
import { CitrusTestSchemaService } from './citrus-test-schema.service';

describe('CitrusTestSchemaService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    setupCitrusDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
    CitrusTestSchemaService.clearKindMap();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTestActionName', () => {
    afterEach(() => {
      CitrusTestSchemaService.clearKindMap();
    });

    it('should retry the kind-map build after a shared failure', async () => {
      CitrusTestSchemaService.clearKindMap();
      const catalog = DynamicCatalogRegistry.get().getCatalog(CatalogKind.TestAction)!;
      const getAll = vi.spyOn(catalog, 'getAll').mockRejectedValueOnce(new Error('Unavailable'));
      try {
        const action = { print: { message: 'hello' } };
        const results = await Promise.allSettled([
          CitrusTestSchemaService.getTestActionName(action),
          CitrusTestSchemaService.getTestActionName(action),
        ]);
        expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
        expect(getAll).toHaveBeenCalledTimes(1);
        expect(await CitrusTestSchemaService.getTestActionName(action)).toBe('print');
        expect(getAll).toHaveBeenCalledTimes(2);
      } finally {
        getAll.mockRestore();
      }
    });

    it('should use the current generation when the kind map is cleared during a build', async () => {
      CitrusTestSchemaService.clearKindMap();
      const catalog = DynamicCatalogRegistry.get().getCatalog(CatalogKind.TestAction)!;
      let resolveOld!: (value: Awaited<ReturnType<typeof catalog.getAll>>) => void;
      const oldRequest = new Promise<Awaited<ReturnType<typeof catalog.getAll>>>((resolve) => {
        resolveOld = resolve;
      });
      const getAll = vi.spyOn(catalog, 'getAll').mockReturnValueOnce(oldRequest);
      try {
        const action = { http: { sendRequest: {} } };
        const oldResult = CitrusTestSchemaService.getTestActionName(action);
        CitrusTestSchemaService.clearKindMap();
        const newResult = CitrusTestSchemaService.getTestActionName(action);
        expect(await newResult).toBe('http-sendRequest');
        resolveOld({});
        expect(await oldResult).toBe('http-sendRequest');
        expect(await CitrusTestSchemaService.getTestActionName(action)).toBe('http-sendRequest');
        expect(getAll).toHaveBeenCalledTimes(2);
      } finally {
        resolveOld({});
        getAll.mockRestore();
      }
    });

    it('should share the kind-map build across concurrent action lookups', async () => {
      CitrusTestSchemaService.clearKindMap();
      const catalog = DynamicCatalogRegistry.get().getCatalog(CatalogKind.TestAction)!;
      const getAll = vi.spyOn(catalog, 'getAll');
      try {
        const results = await Promise.all([
          CitrusTestSchemaService.getTestActionName({ print: { message: 'first' } }),
          CitrusTestSchemaService.getTestActionName({ print: { message: 'second' } }),
        ]);
        expect(results).toEqual(['print', 'print']);
        expect(getAll).toHaveBeenCalledTimes(1);
      } finally {
        getAll.mockRestore();
      }
    });

    it('should get test action name for simple action models', async () => {
      const actionModel: TestActions = { print: { message: 'Hello World' } };
      expect(await CitrusTestSchemaService.getTestActionName(actionModel)).toBe('print');
    });

    it('should get test action name for a grouped action', async () => {
      // http is a TestActionGroup; the inner key 'sendRequest' resolves to 'http-sendRequest'
      const actionModel: TestActions = {
        http: { client: 'c1', sendRequest: { message: { body: { data: 'hi' } } } },
      };
      expect(await CitrusTestSchemaService.getTestActionName(actionModel)).toBe('http-sendRequest');
    });

    it('should get test action name for a multi-level grouped action', async () => {
      // camel -> camel-jbang -> camel-jbang-run
      const actionModel = { camel: { jbang: { run: { integrationFile: 'foo.yaml' } } } } as unknown as TestActions;
      expect(await CitrusTestSchemaService.getTestActionName(actionModel)).toBe('camel-jbang-run');
    });

    it('should return unknown for undefined action', async () => {
      expect(await CitrusTestSchemaService.getTestActionName(undefined as unknown as TestActions)).toBe('unknown');
    });
  });

  describe('clearKindMap', () => {
    it('should force map rebuild on next getTestActionName call', async () => {
      // First call — warms the map
      await CitrusTestSchemaService.getTestActionName({ print: { message: 'hi' } });

      CitrusTestSchemaService.clearKindMap();

      // Second call — must still return correct result (rebuilds the map)
      const result = await CitrusTestSchemaService.getTestActionName({ print: { message: 'hi' } });
      expect(result).toBe('print');
    });
  });

  describe('getTestActionDefinition', () => {
    it('should return undefined for an unknown action', async () => {
      const result = await CitrusTestSchemaService.getTestActionDefinition('nonexistent-action-xyz');
      expect(result).toBeUndefined();
    });

    it('should return definition and empty groups for a simple ungrouped action', async () => {
      const result = await CitrusTestSchemaService.getTestActionDefinition('print');
      expect(result).toBeDefined();
      expect(result?.definition.name).toBe('print');
      expect(result?.groups).toHaveLength(0);
    });

    it('should return definition and resolved groups for a multi-level grouped action', async () => {
      const result = await CitrusTestSchemaService.getTestActionDefinition('camel-jbang-run');
      expect(result).toBeDefined();
      expect(result?.definition.propertiesSchema).toBeDefined();
      expect(result?.groups).toHaveLength(2);
      expect(result?.groups[0].name).toBe('camel');
      expect(result?.groups[1].name).toBe('camel-jbang');
    });
  });

  describe('getTestContainerSettings', () => {
    it.each([
      ['iterate', 'actions', 'branch'],
      ['repeat', 'actions', 'branch'],
      ['repeatOnError', 'actions', 'branch'],
      ['sequential', 'actions', 'branch'],
      ['conditional', 'actions', 'branch'],
      ['doFinally', 'actions', 'branch'],
      ['waitFor', 'actions', 'branch'],
      ['async', 'actions', 'branch'],
      ['parallel', 'actions', 'array-node'],
      ['catch', 'when', 'branch'],
      ['assert', 'when', 'branch'],
      ['soap-assertFault', 'when', 'single-node'],
      ['soap:assertFault', 'when', 'single-node'],
      ['agent-run', 'actions', 'branch'],
      ['agent:run', 'actions', 'branch'],
      ['actions.1.iterate', 'actions', 'branch'],
    ])('should map test container settings', (path, name, type) => {
      const settings = CitrusTestSchemaService.getTestContainerSettings(path);
      expect(settings).toBeDefined();
      expect(settings?.name).toEqual(name);
      expect(settings?.type).toEqual(type);
    });

    it('should handle settings not found', () => {
      const settings = CitrusTestSchemaService.getTestContainerSettings('unknown');
      expect(settings).toBeUndefined();
    });
  });
});
