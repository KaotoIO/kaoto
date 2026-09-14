import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalogRegistry } from '../../../../dynamic-catalog/dynamic-catalog-registry';
import { getFirstCitrusCatalogMap, setupCitrusDynamicCatalogRegistry } from '../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { TestActions } from '../../../citrus/entities/Test';
import { CamelCatalogService } from '../camel-catalog.service';
import { CitrusTestSchemaService } from './citrus-test-schema.service';

describe('CitrusTestSchemaService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.TestAction, catalogsMap.actionsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.TestContainer, catalogsMap.containersCatalogMap);
    setupCitrusDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
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
    it('should return the definition for a simple action', () => {
      const def = CitrusTestSchemaService.getTestActionDefinition('print');
      expect(def).toBeDefined();
      expect(def?.name).toBe('print');
    });

    it('should return undefined for an unknown action', () => {
      const def = CitrusTestSchemaService.getTestActionDefinition('nonexistent-action-xyz');
      expect(def).toBeUndefined();
    });

    it('should return a resolved definition for a grouped action', () => {
      const def = CitrusTestSchemaService.getTestActionDefinition('camel-jbang-run');
      expect(def).toBeDefined();
      expect(def?.propertiesSchema).toBeDefined();
    });
  });

  describe('getTestActionGroups', () => {
    it('should return empty groups of an action definition', () => {
      const actionDefinition = CitrusTestSchemaService.getTestActionDefinition('print');
      const groups = CitrusTestSchemaService.getTestActionGroups(actionDefinition);
      expect(groups).toHaveLength(0);
    });

    it('should return the groups of an action definition', () => {
      const actionDefinition = CitrusTestSchemaService.getTestActionDefinition('camel-jbang-run');
      const groups = CitrusTestSchemaService.getTestActionGroups(actionDefinition);
      expect(groups).toHaveLength(2);
      expect(groups[0].name).toBe('camel');
      expect(groups[1].name).toBe('camel-jbang');
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
      ['agent-run', 'actions', 'branch'],
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
