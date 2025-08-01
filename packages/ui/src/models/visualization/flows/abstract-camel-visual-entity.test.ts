import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';
import { camelRouteJson } from '../../../stubs/camel-route';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CatalogKind } from '../../catalog-kind';
import { NodeLabelType } from '../../settings';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelRouteVisualEntity } from './camel-route-visual-entity';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';
import { AddStepMode } from '../base-visual-entity';
import { SourceSchemaType } from '../../camel';

describe('AbstractCamelVisualEntity', () => {
  let abstractVisualEntity: CamelRouteVisualEntity;

  beforeAll(async () => {
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
      const result = abstractVisualEntity.getNodeInteraction({ processorName: 'from' });
      expect(result.canHavePreviousStep).toEqual(false);
      expect(result.canHaveNextStep).toEqual(false);
    });

    it('should allow processors to have previous/next steps', () => {
      const result = abstractVisualEntity.getNodeInteraction({ processorName: 'to' });
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
      const result = abstractVisualEntity.getNodeInteraction({ processorName });
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

  describe('getComponentSchema', () => {
    it('should return undefined if path is not provided', () => {
      const result = abstractVisualEntity.getComponentSchema();
      expect(result).toBeUndefined();
    });

    it('should return visualComponentSchema when path is valid', () => {
      const path = 'from.steps.0';
      const visualComponentSchema = {
        schema: {},
        definition: {
          parameters: { some: 'parameter' },
        },
      };

      jest.spyOn(CamelComponentSchemaService, 'getVisualComponentSchema').mockReturnValue(visualComponentSchema);

      const result = abstractVisualEntity.getComponentSchema(path);
      expect(result).toEqual(visualComponentSchema);
    });

    it('should override parameters with an empty object when parameters is null', () => {
      const path = 'from.steps.0';
      const visualComponentSchema = {
        schema: {},
        definition: {
          parameters: null,
        },
      };

      jest.spyOn(CamelComponentSchemaService, 'getVisualComponentSchema').mockReturnValue(visualComponentSchema);

      const result = abstractVisualEntity.getComponentSchema(path);
      expect(result?.definition.parameters).toEqual({});
    });

    it.each([undefined, { property: 'value' }])('should not do anything when parameters is not null', (value) => {
      const path = 'from.steps.0';
      const visualComponentSchema = {
        schema: {},
        definition: {
          parameters: value,
        },
      };
      const expected = JSON.parse(JSON.stringify(visualComponentSchema));

      jest.spyOn(CamelComponentSchemaService, 'getVisualComponentSchema').mockReturnValue(visualComponentSchema);

      const result = abstractVisualEntity.getComponentSchema(path);
      expect(result).toEqual(expected);
    });
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
});
