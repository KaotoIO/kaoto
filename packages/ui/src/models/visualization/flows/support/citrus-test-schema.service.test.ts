import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCitrusCatalogMap } from '../../../../stubs/test-load-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { TestActions } from '../../../citrus/entities/Test';
import { CamelCatalogService } from '../camel-catalog.service';
import { CitrusTestSchemaService } from './citrus-test-schema.service';

describe('CitrusTestSchemaService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.TestAction, catalogsMap.actionsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.TestContainer, catalogsMap.containersCatalogMap);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  describe('getNodeSchema', () => {
    it.each([
      ['print', CatalogKind.TestAction],
      ['iterate', CatalogKind.TestContainer],
      ['kubernetes-createService', CatalogKind.TestAction],
      ['camel-jbang-run', CatalogKind.TestAction],
    ])('should leverage the CamelCatalogService.getComponent method', (actionName, catalogKind) => {
      const getComponentSpy = jest.spyOn(CamelCatalogService, 'getComponent');

      CitrusTestSchemaService.getNodeSchema(actionName);

      expect(getComponentSpy).toHaveBeenCalledWith(catalogKind, actionName);
    });

    it.each([undefined, { kind: CatalogKind.TestAction, name: 'test-action', propertiesSchema: undefined } as const])(
      'should return an empty schema when the action is not found',
      (schema) => {
        jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce(schema);
        const result = CitrusTestSchemaService.getNodeSchema('non-existing');
        expect(result).toEqual({});
      },
    );
  });

  describe('getTestActionName', () => {
    it(`should get test action name for simple action models`, () => {
      const actionModel: TestActions = {
        print: {
          message: 'Hello World',
        },
      };

      const result = CitrusTestSchemaService.getTestActionName(actionModel);
      expect(result).toEqual('print');
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
      expect(groups[0]).toHaveProperty('name');
      expect(groups[0].name).toEqual('camel');
      expect(groups[1]).toHaveProperty('name');
      expect(groups[1].name).toEqual('camel-jbang');
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

  describe('extractTestActionName', () => {
    it.each([
      ['iterate', 'iterate'],
      ['actions.0.iterate.actions.0.print', 'print'],
      ['actions.1.iterate', 'iterate'],
    ])('should get test action name from path', (path, expected) => {
      expect(CitrusTestSchemaService.extractTestActionName(path)).toEqual(expected);
    });
  });
});
