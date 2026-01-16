import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';

import { camelRouteJson } from '../../../stubs/camel-route';
import { citrusTestJson } from '../../../stubs/citrus-test';
import { getFirstCitrusCatalogMap } from '../../../stubs/test-load-catalog';
import { setValue } from '../../../utils';
import { sourceSchemaConfig, SourceSchemaType } from '../../camel';
import { EntityType } from '../../camel/entities/base-entity';
import { CatalogKind } from '../../catalog-kind';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { NodeLabelType } from '../../settings/settings.model';
import { AddStepMode } from '../base-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CitrusTestVisualEntity, isCitrusTest } from './citrus-test-visual-entity';
import { CitrusTestSchemaService } from './support/citrus-test-schema.service';

describe('Citrus Test', () => {
  let citrusTestEntity: CitrusTestVisualEntity;

  beforeAll(async () => {
    const catalogsMap = await getFirstCitrusCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.TestAction, catalogsMap.actionsCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.TestContainer, catalogsMap.containersCatalogMap);
  });

  beforeEach(() => {
    citrusTestEntity = new CitrusTestVisualEntity(cloneDeep(citrusTestJson));
  });

  describe('isCitrusTest', () => {
    it.each([
      [{ name: 'foo', actions: [{ print: { message: 'Hello World!' } }] }, true],
      [{ actions: [] }, false],
      [{ name: 'foo' }, false],
      [citrusTestJson, true],
      [camelRouteJson, false],
      [undefined, false],
      [null, false],
      [true, false],
      [false, false],
    ])('should mark %s as isCitrusTest: %s', (test, result) => {
      expect(isCitrusTest(test)).toEqual(result);
    });
  });

  describe('id', () => {
    it('should have an uuid', () => {
      expect(citrusTestEntity.id).toBeDefined();
      expect(typeof citrusTestEntity.id).toBe('string');
    });

    it('should have a type', () => {
      expect(citrusTestEntity.type).toEqual(EntityType.Test);
    });

    it('should return the id', () => {
      expect(citrusTestEntity.getId()).toEqual(expect.any(String));
    });

    it('should change the id', () => {
      citrusTestEntity.setId('myTest-12345');
      expect(citrusTestEntity.getId()).toEqual('myTest-12345');
    });
  });

  describe('getNodeTitle', () => {
    it('should return an empty string if path is not provided', () => {
      expect(citrusTestEntity.getNodeTitle()).toEqual('');
    });

    it('should get the title for root path', () => {
      const title = citrusTestEntity.getNodeTitle('test');
      expect(title).toEqual('Test');
    });

    it('should get the title from given node path', () => {
      const title = citrusTestEntity.getNodeTitle('actions.0.print');
      expect(title).toEqual('Print');
    });
  });

  describe('getTooltipContent', () => {
    it('should return an empty string if path is not provided', () => {
      expect(citrusTestEntity.getTooltipContent()).toEqual('');
    });

    it('should get the tooltip for root path', () => {
      const title = citrusTestEntity.getTooltipContent('test');
      expect(title).toEqual('Test');
    });

    it('should get the tooltip from given node path', () => {
      const title = citrusTestEntity.getTooltipContent('actions.0.print');
      expect(title).toEqual('Print test action.');
    });
  });

  describe('getNodeLabel', () => {
    it('should return an empty string if path is not provided', () => {
      expect(citrusTestEntity.getNodeLabel()).toEqual('');
    });

    it('should get the label from given node path', () => {
      const label = citrusTestEntity.getNodeLabel('actions.0.print');
      expect(label).toEqual('print');
    });
  });

  describe('getNodeSchema', () => {
    it('should return undefined if no path is provided', () => {
      expect(citrusTestEntity.getNodeSchema()).toBeUndefined();
    });

    it('should return undefined if no component model is found', () => {
      const result = citrusTestEntity.getNodeSchema('unknown');

      expect(result).toBeUndefined();
    });

    it('should return root test schema', () => {
      const config = sourceSchemaConfig;
      config.config[SourceSchemaType.Test].schema = {
        schema: {
          name: 'Test',
          description: 'desc',
          properties: { name: {}, variables: {}, actions: { type: 'array' }, finally: { type: 'array' } },
        } as KaotoSchemaDefinition['schema'],
      } as KaotoSchemaDefinition;
      const result = citrusTestEntity.getNodeSchema(CitrusTestVisualEntity.ROOT_PATH);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('properties');
      expect(result?.properties).toBeDefined();
      expect(result?.properties?.name).toBeDefined();
      expect(result?.properties?.actions).toEqual({});
      expect(result?.properties?.finally).toEqual({});
    });

    it('should return the component schema', () => {
      const spy = jest.spyOn(CitrusTestSchemaService, 'extractTestActionName');
      spy.mockReturnValueOnce('print');

      citrusTestEntity.getNodeSchema('actions.0.print');

      expect(spy).toHaveBeenCalledWith('actions.0.print');
    });
  });

  describe('getNodeDefinition', () => {
    it('should return undefined if no path is provided', () => {
      expect(citrusTestEntity.getNodeDefinition()).toBeUndefined();
    });

    it('should return undefined if path does not exist in the entity', () => {
      const result = citrusTestEntity.getNodeDefinition('invalid.path');

      expect(result).toEqual({});
    });

    it('should return action definition for a valid path', () => {
      const result = citrusTestEntity.getNodeDefinition('actions.0.print');

      expect(result).toEqual({
        message: 'Hello from Citrus!',
      });
    });

    it('should handle nested action definitions', () => {
      citrusTestEntity.test.actions.push({
        iterate: {
          condition: 'i < 5',
          actions: [{ print: { message: '${i}: Hello World!' } }, { delay: { milliseconds: 5000 } }],
        },
      });

      const result = citrusTestEntity.getNodeDefinition('actions.1.iterate.actions.0.print');

      expect(result).toEqual({
        message: '${i}: Hello World!',
      });
    });
  });

  it('should return the json', () => {
    expect(citrusTestEntity.toJSON()).toEqual(citrusTestJson);
  });

  describe('updateModel', () => {
    it('should not update the model if no path is provided', () => {
      const originalObject = cloneDeep(citrusTestJson);

      citrusTestEntity.updateModel(undefined, {});

      expect(citrusTestEntity.toJSON()).toEqual(originalObject);
    });

    it('should update the id', () => {
      citrusTestEntity.test.name = 'my-test';
      citrusTestEntity.updateModel(CitrusTestVisualEntity.ROOT_PATH, {});

      expect(citrusTestEntity.id).toEqual('my-test');
    });
  });

  describe('removeAction', () => {
    it('should not remove any action if no path is provided', () => {
      const originalObject = cloneDeep(citrusTestJson);

      citrusTestEntity.removeStep(undefined);

      expect(originalObject).toEqual(citrusTestEntity.toJSON());
    });

    it('should remove the action if the path is a number', () => {
      /** Remove `print` action */
      citrusTestEntity.removeStep('actions.0');

      expect(citrusTestEntity.toJSON().actions).toHaveLength(0);
    });

    it('should remove the action if the path is a word and the penultimate segment is a number', () => {
      /** Remove `print` action */
      citrusTestEntity.removeStep('actions.0.print');

      expect(citrusTestEntity.toJSON().actions).toHaveLength(0);
    });

    it('should remove a nested action', () => {
      citrusTestEntity.test.actions.push({
        iterate: {
          condition: 'i < 5',
          actions: [{ print: { message: '${i}: Hello World!' } }, { delay: { milliseconds: 5000 } }],
        },
      });

      /** Remove nested `print` action */
      citrusTestEntity.removeStep('actions.1.iterate.actions.0');

      expect(citrusTestEntity.toJSON().actions).toHaveLength(2);
      expect(citrusTestEntity.toJSON().actions[0].print).toBeDefined();
      expect(citrusTestEntity.toJSON().actions[1].iterate).toBeDefined();
      expect(citrusTestEntity.toJSON().actions[1].iterate?.actions).toHaveLength(1);
    });

    it('should remove an action container', () => {
      /** Remove `iterate` action */
      citrusTestEntity.removeStep('actions.1.iterate');

      expect(citrusTestEntity.toJSON().actions).toHaveLength(1);
    });
  });

  describe('toVizNode', () => {
    it(`should return the group viz node and set the initial path to '${CitrusTestVisualEntity.ROOT_PATH}'`, () => {
      const vizNode = citrusTestEntity.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.data.path).toEqual(CitrusTestVisualEntity.ROOT_PATH);
    });

    it('should use the test ID as the group label', () => {
      const vizNode = citrusTestEntity.toVizNode();

      expect(vizNode.getNodeLabel()).toEqual('sample-test');
    });

    it('should use the test description as the group label if available', () => {
      citrusTestEntity.test.description = 'This is a test description';
      const vizNode = citrusTestEntity.toVizNode();

      expect(vizNode.getNodeLabel(NodeLabelType.Description)).toEqual('sample-test');
    });

    it('should use the path name as the node label', () => {
      const vizNode = citrusTestEntity.toVizNode();
      const printNode = vizNode.getChildren()?.[0];

      expect(printNode?.getNodeLabel()).toEqual('print');
    });

    it('should populate the viz node chain with simple actions', () => {
      const vizNode = new CitrusTestVisualEntity({
        name: 'test-1234',
        actions: [
          { print: { message: 'Hello World!' } },
          {
            iterate: {
              condition: 'i < 5',
              actions: [{ print: { message: '${i}: Hello World!' } }, { delay: { milliseconds: 5000 } }],
            },
          },
        ],
      }).toVizNode();
      expect(vizNode.getChildren()).toHaveLength(2);
      const printNode = vizNode.getChildren()![0];
      const iterateNode = vizNode.getChildren()![1];

      /** group node */
      expect(vizNode.data.path).toEqual(CitrusTestVisualEntity.ROOT_PATH);
      expect(vizNode.data.isGroup).toBeTruthy();
      expect(vizNode.getNodeLabel()).toEqual('test-1234');
      /** Since this is the root node, there's no previous action */
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeUndefined();

      /** print action */
      expect(printNode.data.path).toEqual('actions.0.print');
      expect(printNode.data.isGroup).toBeFalsy();
      expect(printNode.getNodeLabel()).toEqual('print');
      /** Since this is the first child node, there's no previous action */
      expect(printNode.getPreviousNode()).toBeUndefined();
      expect(printNode.getNextNode()).toBeDefined();

      /** iterate action */
      expect(iterateNode.data.path).toEqual('actions.1.iterate');
      expect(iterateNode.data.isGroup).toBeTruthy();
      expect(iterateNode.getNodeLabel()).toEqual('iterate');
      /** Since this is the last child node, there's no next action */
      expect(iterateNode.getPreviousNode()).toBeDefined();
      expect(iterateNode.getNextNode()).toBeUndefined();
      expect(iterateNode.getChildren()).toHaveLength(2);
    });
  });

  describe('getGroupIcons', () => {
    it('should have no icons', () => {
      const entity = new CitrusTestVisualEntity({
        name: 'test-1234',
        actions: [{ print: { message: 'Hello World!' } }],
      });

      expect(entity.getGroupIcons()).toEqual([]);
    });
  });

  describe('addStep', () => {
    it('should prepend a new action to the model', () => {
      const entity = new CitrusTestVisualEntity({
        name: 'test-1234',
        actions: [{ print: { message: 'Hello World!' } }],
      });

      entity.addStep({
        definedComponent: {
          name: 'delay',
          type: CatalogKind.TestAction,
          definition: undefined,
        },
        mode: AddStepMode.PrependStep,
        data: {
          catalogKind: CatalogKind.TestAction,
          name: 'delay',
          path: 'actions.0',
        },
      });

      expect(entity.test.actions).toHaveLength(2);
      expect(entity.test.actions[0].delay).toBeDefined();
      expect(entity.test.actions[1].print).toBeDefined();
    });

    it('should append a new action to the model', () => {
      const entity = new CitrusTestVisualEntity({
        name: 'test-1234',
        actions: [{ print: { message: 'Hello World!' } }],
      });

      entity.addStep({
        definedComponent: {
          name: 'delay',
          type: CatalogKind.TestAction,
          definition: undefined,
        },
        mode: AddStepMode.AppendStep,
        data: {
          catalogKind: CatalogKind.TestAction,
          name: 'delay',
          path: 'actions.0',
        },
      });

      expect(entity.test.actions).toHaveLength(2);
      expect(entity.test.actions[0].print).toBeDefined();
      expect(entity.test.actions[1].delay).toBeDefined();
    });

    it('should replace an existing action', () => {
      const entity = new CitrusTestVisualEntity({
        name: 'test-1234',
        actions: [{ print: { message: 'Hello World!' } }],
      });

      entity.addStep({
        definedComponent: {
          name: 'delay',
          type: CatalogKind.TestAction,
          definition: undefined,
        },
        mode: AddStepMode.ReplaceStep,
        data: {
          catalogKind: CatalogKind.TestAction,
          name: 'delay',
          path: 'actions.0',
        },
      });

      expect(entity.test.actions).toHaveLength(1);
      expect(entity.test.actions[0].delay).toBeDefined();
    });

    it('should replace a placeholder step', () => {
      const entity = new CitrusTestVisualEntity({
        name: 'test-1234',
        actions: [{ print: { message: 'Hello World!' } }],
      });

      entity.addStep({
        definedComponent: {
          name: 'print',
          type: CatalogKind.TestAction,
          definition: undefined,
        },
        mode: AddStepMode.ReplaceStep,
        data: {
          catalogKind: CatalogKind.TestAction,
          name: 'placeholder',
          isPlaceholder: true,
          path: 'actions.0.placeholder',
        },
      });

      expect(entity.test.actions).toHaveLength(1);
      expect(entity.test.actions[0]).toBeDefined();
    });

    it('should insert a new nested action to the model', () => {
      const entity = new CitrusTestVisualEntity({
        name: 'test-1234',
        actions: [
          { print: { message: 'Hello World!' } },
          {
            iterate: {
              condition: 'i < 5',
              actions: [{ print: { message: '${i}: Hello World!' } }, { delay: { milliseconds: 5000 } }],
            },
          },
        ],
      });

      entity.addStep({
        definedComponent: {
          name: 'echo',
          type: CatalogKind.TestAction,
          definition: undefined,
        },
        mode: AddStepMode.AppendStep,
        data: {
          catalogKind: CatalogKind.TestAction,
          name: 'echo',
          path: 'actions.1.iterate.actions.0',
        },
      });

      expect(entity.test.actions).toHaveLength(2);
      expect(entity.test.actions[0].print).toBeDefined();
      expect(entity.test.actions[1].iterate).toBeDefined();
      expect(entity.test.actions[1].iterate?.actions).toHaveLength(3);
      expect(entity.test.actions[1].iterate?.actions[0].print).toBeDefined();
      expect(entity.test.actions[1].iterate?.actions[1].echo).toBeDefined();
      expect(entity.test.actions[1].iterate?.actions[2].delay).toBeDefined();
    });

    it('should insert a new empty container to the model', () => {
      const entity = new CitrusTestVisualEntity({
        name: 'test-1234',
        actions: [{ print: { message: 'Hello World!' } }],
      });

      entity.addStep({
        definedComponent: {
          name: 'iterate',
          type: CatalogKind.TestContainer,
          definition: undefined,
        },
        mode: AddStepMode.AppendStep,
        data: {
          catalogKind: CatalogKind.TestContainer,
          name: 'iterate',
          path: 'actions.0',
        },
      });

      expect(entity.test.actions).toHaveLength(2);
      expect(entity.test.actions[0].print).toBeDefined();
      expect(entity.test.actions[1].iterate).toBeDefined();
      expect(entity.test.actions[1].iterate?.actions).toBeUndefined();
    });
  });

  describe('pasteStep', () => {
    it('should append a new action to the model', () => {
      citrusTestEntity.pasteStep({
        clipboardContent: {
          name: 'echo',
          type: SourceSchemaType.Test,
          definition: {
            echo: {
              message: 'Hello World!',
            },
          },
        },
        mode: AddStepMode.AppendStep,
        data: {
          catalogKind: CatalogKind.TestAction,
          name: 'echo',
          path: 'actions.0',
        },
      });

      expect(citrusTestEntity.test.actions).toHaveLength(2);
      expect(citrusTestEntity.test.actions[0].print).toBeDefined();
      expect(citrusTestEntity.test.actions[1].echo).toBeDefined();
    });
  });

  describe('getCopiedContent', () => {
    it('should return the copied content for a step', () => {
      const copiedContent = citrusTestEntity.getCopiedContent('actions.0.print');
      expect(copiedContent).toEqual({
        type: SourceSchemaType.Test,
        name: 'print',
        definition: {
          print: {
            message: 'Hello from Citrus!',
          },
        },
      });
    });

    it('should return undefined if the path is undefined', () => {
      const copiedContent = citrusTestEntity.getCopiedContent();
      expect(copiedContent).toBeUndefined();
    });

    it('should return undefined node default value if the path is invalid', () => {
      const copiedContent = citrusTestEntity.getCopiedContent('actions.999.foo');
      expect(copiedContent).toEqual({
        type: SourceSchemaType.Test,
        name: 'foo',
        definition: undefined,
      });
    });
  });

  describe('getNodeInteraction', () => {
    it('should handle root path', () => {
      const result = citrusTestEntity.getNodeInteraction({
        catalogKind: CatalogKind.TestAction,
        name: 'test',
        path: CitrusTestVisualEntity.ROOT_PATH,
      });
      expect(result.canHavePreviousStep).toEqual(false);
      expect(result.canReplaceStep).toEqual(false);
      expect(result.canReplaceStep).toEqual(false);
      expect(result.canHaveNextStep).toEqual(true);
    });

    it('should allow processors to have previous/next steps', () => {
      const result = citrusTestEntity.getNodeInteraction({
        catalogKind: CatalogKind.TestAction,
        name: 'print',
        path: 'actions.0',
      });
      expect(result.canHavePreviousStep).toEqual(true);
      expect(result.canHaveNextStep).toEqual(true);
    });

    it.each(['print', 'delay', 'send', 'receive'])(
      `should return the correct interaction for the '%s' action`,
      (actionName) => {
        const result = citrusTestEntity.getNodeInteraction({
          catalogKind: CatalogKind.TestAction,
          name: actionName,
          actionName,
        });
        expect(result.canRemoveStep).toBeTruthy();
        expect(result.canReplaceStep).toBeTruthy();
        expect(result.canHavePreviousStep).toBeTruthy();
        expect(result.canHaveNextStep).toBeTruthy();
        expect(result.canHaveChildren).toBeFalsy();
        expect(result.canHaveSpecialChildren).toBeFalsy();
        expect(result.canBeDisabled).toBeFalsy();
      },
    );

    it.each(['sequential', 'iterate', 'parallel', 'conditional'])(
      `should return the correct interaction for the '%s' container`,
      (actionName) => {
        const result = citrusTestEntity.getNodeInteraction({
          catalogKind: CatalogKind.TestContainer,
          isGroup: true,
          name: actionName,
          actionName,
        });
        expect(result.canRemoveStep).toBeTruthy();
        expect(result.canReplaceStep).toBeTruthy();
        expect(result.canHavePreviousStep).toBeTruthy();
        expect(result.canHaveNextStep).toBeTruthy();
        expect(result.canHaveChildren).toBeTruthy();
        expect(result.canHaveSpecialChildren).toBeFalsy();
        expect(result.canBeDisabled).toBeFalsy();
      },
    );
  });

  describe('getNodeValidationText', () => {
    it('should return an `undefined` if the path is `undefined`', () => {
      const result = citrusTestEntity.getNodeValidationText(undefined);

      expect(result).toBeUndefined();
    });

    it('should return an `undefined` if the path is empty', () => {
      const result = citrusTestEntity.getNodeValidationText('');

      expect(result).toBeUndefined();
    });

    it('should return a validation text relying on the `validateNodeStatus` method', () => {
      const invalidModel = cloneDeep(citrusTestJson);
      setValue(invalidModel, 'actions[0].print.message', undefined);
      const entity = new CitrusTestVisualEntity(invalidModel);

      const spy = jest.spyOn(CitrusTestSchemaService, 'extractTestActionName');
      spy.mockReturnValueOnce('print');

      const result = entity.getNodeValidationText('actions.0.print');

      expect(spy).toHaveBeenCalledWith('actions.0.print');
      expect(result).toEqual('1 required parameter is not yet configured: [ message ]');
    });
  });
});
