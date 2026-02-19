import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, To } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';

import { mockRandomValues } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SourceSchemaType } from '../../camel';
import { NonStringEIP } from '../../camel/types';
import { CatalogKind } from '../../catalog-kind';
import { NodeLabelType } from '../../settings';
import { AddStepMode } from '../base-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelRouteVisualEntity } from './camel-route-visual-entity';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';

describe('AbstractCamelVisualEntity', () => {
  let abstractVisualEntity: CamelRouteVisualEntity;

  beforeAll(async () => {
    mockRandomValues();

    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
  });

  beforeEach(() => {
    abstractVisualEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJson));
  });

  describe('getNodeLabel', () => {
    it('should return an empty string if the path is `undefined`', () => {
      const result = abstractVisualEntity.getNodeLabel(undefined);

      expect(result).toEqual('');
    });

    it('should return an empty string if the path is empty', () => {
      const result = abstractVisualEntity.getNodeLabel('');

      expect(result).toEqual('');
    });

    it('should return the ID as a node label by default', () => {
      const result = abstractVisualEntity.getNodeLabel('route');

      expect(result).toEqual('route-8888');
    });

    it('should return the description as a node label', () => {
      const routeDefinition = cloneDeep(camelRouteJson);
      routeDefinition.route.description = 'description';
      abstractVisualEntity = new CamelRouteVisualEntity(routeDefinition);

      const result = abstractVisualEntity.getNodeLabel('route', NodeLabelType.Description);

      expect(result).toEqual('description');
    });

    it('should return the ID as a node label if description is empty', () => {
      const routeDefinition = cloneDeep(camelRouteJson);
      routeDefinition.route.description = '';
      abstractVisualEntity = new CamelRouteVisualEntity(routeDefinition);

      const result = abstractVisualEntity.getNodeLabel('route', NodeLabelType.Description);

      expect(result).toEqual('route-8888');
    });
  });

  describe('getNodeInteraction', () => {
    it('should not allow marked processors to have previous/next steps', () => {
      const result = abstractVisualEntity.getNodeInteraction({
        catalogKind: CatalogKind.Processor,
        name: 'from',
        processorName: 'from',
      });
      expect(result.canHavePreviousStep).toEqual(false);
      expect(result.canHaveNextStep).toEqual(false);
    });

    it('should allow processors to have previous/next steps', () => {
      const result = abstractVisualEntity.getNodeInteraction({
        catalogKind: CatalogKind.Processor,
        name: 'to',
        processorName: 'to',
      });
      expect(result.canHavePreviousStep).toEqual(true);
      expect(result.canHaveNextStep).toEqual(true);
    });

    it.each([
      'route',
      'from',
      'to',
      'log',
      'onException',
      'onCompletion',
      'intercept',
      'interceptFrom',
      'interceptSendToEndpoint',
    ])(`should return the correct interaction for the '%s' processor`, (processorName) => {
      const result = abstractVisualEntity.getNodeInteraction({
        catalogKind: CatalogKind.Processor,
        name: processorName,
        processorName,
      });
      expect(result).toMatchSnapshot();
    });
  });

  describe('getNodeValidationText', () => {
    it('should return an `undefined` if the path is `undefined`', () => {
      const result = abstractVisualEntity.getNodeValidationText(undefined);

      expect(result).toEqual(undefined);
    });

    it('should return an `undefined` if the path is empty', () => {
      const result = abstractVisualEntity.getNodeValidationText('');

      expect(result).toEqual(undefined);
    });

    it('should return a validation text relying on the `validateNodeStatus` method', () => {
      const missingParametersModel = cloneDeep(camelRouteJson.route);
      missingParametersModel.from.uri = '';
      abstractVisualEntity = new CamelRouteVisualEntity(missingParametersModel);

      const result = abstractVisualEntity.getNodeValidationText('route.from');

      expect(result).toEqual('1 required parameter is not yet configured: [ uri ]');
    });
  });

  describe('getNodeSchema', () => {
    it('should return undefined if path is not provided', () => {
      const result = abstractVisualEntity.getNodeSchema();
      expect(result).toBeUndefined();
    });

    it('should return schema when path is valid', () => {
      const path = 'route.from.steps.1.choice';

      const result = abstractVisualEntity.getNodeSchema(path);

      expect(result).toMatchObject({ type: 'object', title: 'Choice' });
    });
  });

  describe('getNodeDefinition', () => {
    it('should return undefined if path is not provided', () => {
      const result = abstractVisualEntity.getNodeDefinition();
      expect(result).toBeUndefined();
    });

    it('should return updated node definition when path is valid', () => {
      const path = 'route.from.steps.2.to';
      const definition = {
        uri: 'direct',
        parameters: { name: 'my-route', bridgeErrorHandler: true },
      };

      const result = abstractVisualEntity.getNodeDefinition(path);
      expect(result).toEqual(definition);
    });

    it.each([null, undefined])(
      'should override parameters with an empty object when parameters is null or undefined',
      (parameters) => {
        const path = 'route.from.steps.2.to';
        (abstractVisualEntity.entityDef.route.from.steps[2].to as NonStringEIP<To>).uri = 'direct';
        (abstractVisualEntity.entityDef.route.from.steps[2].to as NonStringEIP<To>).parameters =
          parameters as unknown as Record<string, unknown>;

        const definition = abstractVisualEntity.getNodeDefinition(path);
        expect((definition as NonStringEIP<To>).parameters).toEqual({});
      },
    );

    it('should not do anything when parameters is not null', () => {
      const path = 'route.from.steps.2.to';
      (abstractVisualEntity.entityDef.route.from.steps[2].to as NonStringEIP<To>).uri = 'direct';
      (abstractVisualEntity.entityDef.route.from.steps[2].to as NonStringEIP<To>).parameters = { prop: true };

      const definition = abstractVisualEntity.getNodeDefinition(path);

      expect(definition).toEqual({
        uri: 'direct',
        parameters: { prop: true },
      });
    });
  });

  it('should return the list of fields to omit from forms', () => {
    const result = abstractVisualEntity.getOmitFormFields();

    expect(result).toEqual(['from', 'outputs', 'steps', 'when', 'otherwise', 'doCatch', 'doFinally']);
  });

  describe('updateModel', () => {
    it('should update the model with the new value', () => {
      const newUri = 'timer';
      abstractVisualEntity.updateModel('route.from', { uri: newUri });

      expect(abstractVisualEntity.entityDef.route.from.uri).toEqual(newUri);
    });

    it('should delegate the serialization to the `CamelComponentSchemaService`', () => {
      const newUri = 'timer';
      const spy = jest.spyOn(CamelComponentSchemaService, 'getMultiValueSerializedDefinition');
      abstractVisualEntity.updateModel('from', { uri: newUri });

      expect(spy).toHaveBeenCalledWith('from', { uri: newUri });
    });
  });

  describe('addStep', () => {
    it('should prepend a new step to the model', () => {
      abstractVisualEntity.addStep({
        definedComponent: {
          name: 'xchange',
          type: CatalogKind.Component,
          definition: undefined,
        },
        mode: AddStepMode.PrependStep,
        data: {
          catalogKind: CatalogKind.Component,
          name: 'log',
          path: 'route.from.steps.2.to',
          icon: '/src/assets/components/log.svg',
          processorName: 'to',
          componentName: 'log',
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps[2]).toMatchSnapshot();
    });

    it('should append a new step to the model', () => {
      abstractVisualEntity.addStep({
        definedComponent: {
          name: 'xchange',
          type: CatalogKind.Component,
          definition: undefined,
        },
        mode: AddStepMode.AppendStep,
        data: {
          catalogKind: CatalogKind.Component,
          name: 'log',
          path: 'route.from.steps.2.to',
          icon: '/src/assets/components/log.svg',
          processorName: 'to',
          componentName: 'log',
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps[3]).toMatchSnapshot();
    });

    it('should replace a step', () => {
      abstractVisualEntity.addStep({
        definedComponent: {
          name: 'xchange',
          type: CatalogKind.Component,
          definition: undefined,
        },
        mode: AddStepMode.ReplaceStep,
        data: {
          catalogKind: CatalogKind.Component,
          name: 'log',
          path: 'route.from.steps.0.to',
          icon: '/src/assets/components/log.svg',
          processorName: 'to',
          componentName: 'log',
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[0]).toMatchSnapshot();
    });

    it('should replace a placeholder step', () => {
      abstractVisualEntity.addStep({
        definedComponent: {
          name: 'multicast',
          type: CatalogKind.Processor,
          definition: undefined,
        },
        mode: AddStepMode.ReplaceStep,
        data: {
          catalogKind: CatalogKind.Processor,
          name: 'choice',
          path: 'route.from.steps.1.choice',
          icon: '/src/assets/components/choice.svg',
          processorName: 'choice',
          componentName: undefined,
        },
      });
      abstractVisualEntity.addStep({
        definedComponent: {
          name: 'log',
          type: CatalogKind.Component,
          definition: undefined,
        },
        mode: AddStepMode.ReplaceStep,
        data: {
          catalogKind: CatalogKind.Processor,
          name: 'placeholder',
          isPlaceholder: true,
          path: 'route.from.steps.1.multicast.steps.0.placeholder',
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    it('should insert a new child step', () => {
      abstractVisualEntity.addStep({
        definedComponent: {
          name: 'xchange',
          type: CatalogKind.Component,
          definition: undefined,
        },
        mode: AddStepMode.InsertChildStep,
        data: {
          catalogKind: CatalogKind.Component,
          name: 'timer',
          componentName: 'timer',
          icon: '/src/assets/components/timer.svg',
          isGroup: false,
          path: 'route.from',
          processorName: 'from',
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps).toMatchSnapshot();
    });

    it('should insert a new special child step belonging to an array like when or doCatch', () => {
      abstractVisualEntity.removeStep('route.from.steps.1.choice.when.0');
      abstractVisualEntity.addStep({
        definedComponent: {
          name: 'when',
          type: CatalogKind.Processor,
          definition: undefined,
        },
        mode: AddStepMode.InsertSpecialChildStep,
        data: {
          catalogKind: CatalogKind.Processor,
          name: 'choice',
          path: 'route.from.steps.1.choice',
          icon: '/src/assets/eip/choice.png',
          processorName: 'choice',
          isGroup: true,
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    it('should insert a new special child step belonging to a single property like otherwise or doFinally', () => {
      abstractVisualEntity.removeStep('route.from.steps.1.choice.otherwise');
      abstractVisualEntity.addStep({
        definedComponent: {
          name: 'otherwise',
          type: CatalogKind.Processor,
          definition: undefined,
        },
        mode: AddStepMode.InsertSpecialChildStep,
        data: {
          catalogKind: CatalogKind.Processor,
          name: 'choice',
          path: 'route.from.steps.1.choice',
          icon: '/src/assets/eip/choice.png',
          processorName: 'choice',
          isGroup: true,
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });
  });

  describe('pasteStep', () => {
    it('should append a new step to the model', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'log',
          type: SourceSchemaType.Route,
          definition: {
            id: 'test-id',
            message: 'Test message',
          },
        },
        mode: AddStepMode.AppendStep,
        data: {
          catalogKind: CatalogKind.Component,
          name: 'log',
          path: 'route.from.steps.2.to',
          icon: '/src/assets/components/log.svg',
          processorName: 'to',
          componentName: 'log',
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps[3]).toMatchSnapshot();
    });

    it('should insert a new child step', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'log',
          type: SourceSchemaType.Route,
          definition: {
            id: 'test-id',
            message: 'Test message',
          },
        },
        mode: AddStepMode.InsertChildStep,
        data: {
          catalogKind: CatalogKind.Component,
          name: 'timer',
          componentName: 'timer',
          icon: '/src/assets/components/timer.svg',
          isGroup: false,
          path: 'route.from',
          processorName: 'from',
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps).toMatchSnapshot();
    });

    it('should insert a new special child step belonging to an array like when or doCatch', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'when',
          type: SourceSchemaType.Route,
          definition: {
            expression: 'simple("${body} contains \'test\'")',
          },
        },
        mode: AddStepMode.InsertSpecialChildStep,
        data: {
          catalogKind: CatalogKind.Processor,
          name: 'choice',
          path: 'route.from.steps.1.choice',
          icon: '/src/assets/eip/choice.png',
          processorName: 'choice',
          isGroup: true,
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    it('should insert a new special child step belonging to a single property like otherwise or doFinally', () => {
      abstractVisualEntity.removeStep('route.from.steps.1.choice.otherwise');
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'otherwise',
          type: SourceSchemaType.Route,
          definition: {
            id: 'test-id',
            steps: [],
          },
        },
        mode: AddStepMode.InsertSpecialChildStep,
        data: {
          catalogKind: CatalogKind.Processor,
          name: 'choice',
          path: 'route.from.steps.1.choice',
          icon: '/src/assets/eip/choice.png',
          processorName: 'choice',
          isGroup: true,
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    it('should replace the step', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'log',
          type: SourceSchemaType.Route,
          definition: {
            id: 'test-id',
            message: 'Test message',
          },
        },
        mode: AddStepMode.ReplaceStep,
        data: {
          catalogKind: CatalogKind.Component,
          name: 'direct',
          path: 'route.from.steps.2.to',
          processorName: 'to',
          componentName: 'direct',
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps).toMatchSnapshot();
    });

    it('should repace the special child step belonging to an array like when or doCatch', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'when',
          type: SourceSchemaType.Route,
          definition: {
            expression: 'simple("${body} contains \'test\'")',
            id: 'when-replaced',
            steps: [
              {
                log: {
                  message: 'Test message',
                },
              },
            ],
          },
        },
        mode: AddStepMode.ReplaceStep,
        data: {
          catalogKind: CatalogKind.Processor,
          name: 'when',
          path: 'route.from.steps.1.choice.when.0',
          icon: '/src/assets/eip/when.png',
          processorName: 'when',
          isGroup: true,
        },
      });

      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });
  });

  describe('getCopiedContent', () => {
    it('should return the copied content for a step', () => {
      const copiedContent = abstractVisualEntity.getCopiedContent('route.from.steps.2.to');
      expect(copiedContent).toEqual({
        type: SourceSchemaType.Route,
        name: 'to',
        definition: {
          uri: 'direct:my-route',
          parameters: {
            bridgeErrorHandler: true,
          },
        },
      });
    });

    it('should return undefined if the path is undefined', () => {
      const copiedContent = abstractVisualEntity.getCopiedContent();
      expect(copiedContent).toBeUndefined();
    });

    it('should return undefined node default value if the path is invalid', () => {
      const copiedContent = abstractVisualEntity.getCopiedContent('route.from.steps.999.to');
      expect(copiedContent).toEqual({
        type: SourceSchemaType.Route,
        name: 'to',
        defaultValue: undefined,
      });
    });
  });

  describe('toVizNode', () => {
    it('should remove isGroup flag when a group has no children', () => {
      const routeEntity = new CamelRouteVisualEntity({
        route: {
          id: 'route-1234',
          from: { uri: 'timer:clock', steps: [{ choice: {} }] },
        },
      });

      const routeNode = routeEntity.toVizNode();
      const choiceNode = routeNode.getChildren()?.[1];

      expect(choiceNode?.data.isGroup).toBe(false);

      choiceNode
        ?.getChildren()
        ?.slice()
        .forEach((child) => child.removeChild());

      const updatedViz = routeEntity.toVizNode();
      const updatedChoiceNode = updatedViz.getChildren()?.[1];

      expect(updatedChoiceNode?.data.isGroup).toBe(false);
    });
  });
});
