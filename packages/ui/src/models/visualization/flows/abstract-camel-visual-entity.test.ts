import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, ProcessorDefinition, To } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { mockRandomValues } from '../../../stubs';
import { camelRouteJson, camelRouteWithKameletJson } from '../../../stubs/camel-route';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
import { NonStringEIP } from '../../camel/types';
import { CatalogKind } from '../../catalog-kind';
import { PlaceholderType } from '../../placeholder.constants';
import { NodeLabelType } from '../../settings';
import { AddStepMode } from '../base-visual-entity';
import { CamelCatalogService } from './camel-catalog.service';
import { CamelRouteVisualEntity } from './camel-route-visual-entity';
import { CamelRouteVisualEntityData } from './support/camel-component-types';

describe('AbstractCamelVisualEntity', () => {
  let abstractVisualEntity: CamelRouteVisualEntity;

  beforeAll(async () => {
    mockRandomValues();

    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
    DynamicCatalogRegistry.get().clearRegistry();
  });

  beforeEach(() => {
    abstractVisualEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJson));
  });

  // Test helper to create mock node data with consistent defaults
  const createMockNodeData = (overrides: Partial<CamelRouteVisualEntityData> = {}): CamelRouteVisualEntityData =>
    ({
      name: 'log',
      path: 'route.from.steps.0.to',
      processorName: 'to',
      componentName: 'log',
      isPlaceholder: false,
      isGroup: false,
      iconUrl: '',
      title: 'Log',
      description: '',
      processorIconTooltip: '',
      ...overrides,
    }) as CamelRouteVisualEntityData;

  describe('getNodeLabel', () => {
    it('should return an empty string if the path is `undefined`', () => {
      const result = abstractVisualEntity.getNodeLabel();

      expect(result).toBe('');
    });

    it('should return an empty string if the path is empty', () => {
      const result = abstractVisualEntity.getNodeLabel('');

      expect(result).toBe('');
    });

    it('should return the ID as a node label by default', () => {
      const result = abstractVisualEntity.getNodeLabel('route');

      expect(result).toBe('route-8888');
    });

    it('should return the description as a node label', () => {
      const routeDefinition = cloneDeep(camelRouteJson);
      routeDefinition.route.description = 'description';
      abstractVisualEntity = new CamelRouteVisualEntity(routeDefinition);

      const result = abstractVisualEntity.getNodeLabel('route', NodeLabelType.Description);

      expect(result).toBe('description');
    });

    it('should return the ID as a node label if description is empty', () => {
      const routeDefinition = cloneDeep(camelRouteJson);
      routeDefinition.route.description = '';
      abstractVisualEntity = new CamelRouteVisualEntity(routeDefinition);

      const result = abstractVisualEntity.getNodeLabel('route', NodeLabelType.Description);

      expect(result).toBe('route-8888');
    });
  });

  describe('getNodeInteraction', () => {
    it('should not allow marked processors to have previous/next steps', () => {
      const result = abstractVisualEntity.getNodeInteraction(
        createMockNodeData({ name: 'from', processorName: 'from' as keyof ProcessorDefinition, title: 'From' }),
      );
      expect(result.canHavePreviousStep).toBe(false);
      expect(result.canHaveNextStep).toBe(false);
    });

    it('should allow processors to have previous/next steps', () => {
      const result = abstractVisualEntity.getNodeInteraction(
        createMockNodeData({ name: 'to', processorName: 'to', title: 'To' }),
      );
      expect(result.canHavePreviousStep).toBe(true);
      expect(result.canHaveNextStep).toBe(true);
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
      const result = abstractVisualEntity.getNodeInteraction(
        createMockNodeData({
          name: processorName,
          processorName: processorName as keyof ProcessorDefinition,
          title: 'From',
        }),
      );
      expect(result).toMatchSnapshot();
    });
  });

  describe('getNodeValidationText', () => {
    it('should return an `undefined` if the path is `undefined`', () => {
      const result = abstractVisualEntity.getNodeValidationText(undefined);

      expect(result).toBeUndefined();
    });

    it('should return an `undefined` if the path is empty', () => {
      const result = abstractVisualEntity.getNodeValidationText('');

      expect(result).toBeUndefined();
    });

    it('should return a validation text relying on the `validateNodeStatus` method', () => {
      const missingParametersModel = cloneDeep(camelRouteJson.route);
      missingParametersModel.from.uri = '';
      abstractVisualEntity = new CamelRouteVisualEntity(missingParametersModel);

      const result = abstractVisualEntity.getNodeValidationText('route.from');

      expect(result).toBe('1 required parameter is not yet configured: [ uri ]');
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

    it('should assign the provided value without serializing multivalue parameters', () => {
      const parameters = {
        jobParameters: { name: 'daily' },
      };

      abstractVisualEntity.updateModel('route.from.steps.2.to.parameters', parameters);

      expect(abstractVisualEntity.getNodeDefinition('route.from.steps.2.to')).toEqual({
        uri: 'direct',
        parameters: {
          name: 'my-route',
          ...parameters,
        },
      });
    });
  });

  describe('addStep', () => {
    // Suggestion 1: shared definedComponent constant reused across prepend/append/replace/child tests
    const xchangeComponent = { name: 'xchange', type: CatalogKind.Component, definition: undefined };

    // Suggestion 4: shared node data for the two InsertSpecialChildStep tests
    const choiceGroupNodeData = createMockNodeData({
      name: 'choice',
      path: 'route.from.steps.1.choice',
      iconUrl: '/src/assets/eip/choice.png',
      processorName: 'choice',
      componentName: undefined,
      isGroup: true,
    });

    it('should prepend a new step to the model', () => {
      abstractVisualEntity.addStep({
        definedComponent: xchangeComponent,
        mode: AddStepMode.PrependStep,
        data: createMockNodeData({ path: 'route.from.steps.2.to' }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps[2]).toMatchSnapshot();
    });

    it('should append a new step to the model', () => {
      abstractVisualEntity.addStep({
        definedComponent: xchangeComponent,
        mode: AddStepMode.AppendStep,
        data: createMockNodeData({ path: 'route.from.steps.2.to' }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps[3]).toMatchSnapshot();
    });

    it('should replace a step', () => {
      abstractVisualEntity.addStep({
        definedComponent: xchangeComponent,
        mode: AddStepMode.ReplaceStep,
        data: createMockNodeData({ path: 'route.from.steps.0.to' }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[0]).toMatchSnapshot();
    });

    // Suggestion 3 (first half): only asserts the processor replacement and the resulting placeholder
    it('should replace a step with a processor that introduces a placeholder', () => {
      abstractVisualEntity.addStep({
        definedComponent: { name: 'multicast', type: CatalogKind.Processor, definition: undefined },
        mode: AddStepMode.ReplaceStep,
        data: createMockNodeData({
          name: 'choice',
          path: 'route.from.steps.1.choice',
          iconUrl: '/src/assets/components/choice.svg',
          processorName: 'choice',
          componentName: undefined,
          isGroup: false,
        }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    // Suggestion 3 (second half): sets up the multicast precondition, then asserts placeholder replacement
    it('should replace a placeholder step with a component', () => {
      // Setup: replace choice with multicast so a placeholder child exists
      abstractVisualEntity.addStep({
        definedComponent: { name: 'multicast', type: CatalogKind.Processor, definition: undefined },
        mode: AddStepMode.ReplaceStep,
        data: createMockNodeData({
          name: 'choice',
          path: 'route.from.steps.1.choice',
          iconUrl: '/src/assets/components/choice.svg',
          processorName: 'choice',
          componentName: undefined,
          isGroup: false,
        }),
      });

      // Suggestion 2: use createMockNodeData instead of an inline raw object
      abstractVisualEntity.addStep({
        definedComponent: { name: 'log', type: CatalogKind.Component, definition: undefined },
        mode: AddStepMode.ReplaceStep,
        data: createMockNodeData({
          name: PlaceholderType.Placeholder,
          isPlaceholder: true,
          path: 'route.from.steps.1.multicast.steps.0.placeholder',
          componentName: undefined,
        }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    it('should insert a new child step', () => {
      abstractVisualEntity.addStep({
        definedComponent: xchangeComponent,
        mode: AddStepMode.InsertChildStep,
        data: createMockNodeData({
          name: 'timer',
          componentName: 'timer',
          iconUrl: '/src/assets/components/timer.svg',
          path: 'route.from',
          processorName: 'from' as keyof ProcessorDefinition,
        }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps).toMatchSnapshot();
    });

    it('should insert a new special child step belonging to an array like when or doCatch', () => {
      abstractVisualEntity.removeStep('route.from.steps.1.choice.when.0');
      abstractVisualEntity.addStep({
        definedComponent: { name: 'when', type: CatalogKind.Processor, definition: undefined },
        mode: AddStepMode.InsertSpecialChildStep,
        data: choiceGroupNodeData,
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    it('should insert a new special child step belonging to a single property like otherwise or doFinally', () => {
      abstractVisualEntity.removeStep('route.from.steps.1.choice.otherwise');
      abstractVisualEntity.addStep({
        definedComponent: { name: 'otherwise', type: CatalogKind.Processor, definition: undefined },
        mode: AddStepMode.InsertSpecialChildStep,
        data: choiceGroupNodeData,
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });
  });

  describe('pasteStep', () => {
    const LOG_CLIPBOARD_CONTENT = {
      name: 'log',
      definition: {
        id: 'test-id',
        message: 'Test message',
      },
    };

    const CHOICE_NODE_DATA = createMockNodeData({
      name: 'choice',
      path: 'route.from.steps.1.choice',
      iconUrl: '/src/assets/eip/choice.png',
      processorName: 'choice',
      componentName: undefined,
      isGroup: true,
    });

    it('should append a new step to the model', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: LOG_CLIPBOARD_CONTENT,
        mode: AddStepMode.AppendStep,
        data: createMockNodeData({ path: 'route.from.steps.2.to' }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps[3]).toMatchSnapshot();
    });

    it('should insert a new child step', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: LOG_CLIPBOARD_CONTENT,
        mode: AddStepMode.InsertChildStep,
        data: createMockNodeData({
          name: 'timer',
          componentName: 'timer',
          iconUrl: '/src/assets/components/timer.svg',
          path: 'route.from',
          processorName: 'from' as keyof ProcessorDefinition,
        }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(4);
      expect(abstractVisualEntity.entityDef.route.from.steps).toMatchSnapshot();
    });

    it('should insert a new special child step belonging to an array like when or doCatch', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'when',
          definition: {
            expression: 'simple("${body} contains \'test\'")',
          },
        },
        mode: AddStepMode.InsertSpecialChildStep,
        data: CHOICE_NODE_DATA,
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    it('should insert a new special child step belonging to a single property like otherwise or doFinally', () => {
      abstractVisualEntity.removeStep('route.from.steps.1.choice.otherwise');
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'otherwise',
          definition: {
            id: 'test-id',
            steps: [],
          },
        },
        mode: AddStepMode.InsertSpecialChildStep,
        data: CHOICE_NODE_DATA,
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });

    it('should replace the step', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: LOG_CLIPBOARD_CONTENT,
        mode: AddStepMode.ReplaceStep,
        data: createMockNodeData({
          name: 'direct',
          path: 'route.from.steps.2.to',
          componentName: 'direct',
        }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps).toHaveLength(3);
      expect(abstractVisualEntity.entityDef.route.from.steps).toMatchSnapshot();
    });

    it('should replace the special child step belonging to an array like when or doCatch', () => {
      abstractVisualEntity.pasteStep({
        clipboardContent: {
          name: 'when',
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
        data: createMockNodeData({
          name: 'when',
          path: 'route.from.steps.1.choice.when.0',
          iconUrl: '/src/assets/eip/when.png',
          processorName: 'when' as keyof ProcessorDefinition,
          componentName: undefined,
          isGroup: true,
        }),
      });

      expect(abstractVisualEntity.entityDef.route.from.steps[1]).toMatchSnapshot();
    });
  });

  describe('getCopiedContent', () => {
    it('should return the copied content for a step', () => {
      const copiedContent = abstractVisualEntity.getCopiedContent('route.from.steps.2.to', {
        primaryNodeId: { name: 'to', catalogKind: CatalogKind.Processor },
        secondaryNodeId: undefined,
        tertiaryNodeId: undefined,
      });
      expect(copiedContent).toEqual({
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
      const copiedContent = abstractVisualEntity.getCopiedContent('route.from.steps.999.to', {
        primaryNodeId: { name: 'to', catalogKind: CatalogKind.Processor },
        secondaryNodeId: undefined,
        tertiaryNodeId: undefined,
      });
      expect(copiedContent).toEqual({
        name: 'to',
        definition: undefined,
      });
    });
  });

  describe('toVizNode', () => {
    it('should keep isGroup flag when a group has no children since it has placeholders', async () => {
      const routeEntity = new CamelRouteVisualEntity({
        route: {
          id: 'route-1234',
          from: { uri: 'timer:clock', steps: [{ choice: {} }] },
        },
      });

      const routeNode = await routeEntity.toVizNode();
      const choiceNode = routeNode.getChildren()?.[1];

      // Choice has when and otherwise placeholders as children, so it remains a group (isGroup true)
      expect(choiceNode?.data.isGroup).toBe(true);
      expect(choiceNode?.getChildren()?.length).toBe(2);
    });

    it('should set primaryNodeId on the route group node', async () => {
      const routeGroupNode = await abstractVisualEntity.toVizNode();
      expect(routeGroupNode.data.primaryNodeId).toEqual({
        name: abstractVisualEntity.type,
        catalogKind: CatalogKind.Entity,
      });
    });
  });

  describe('fetchNodeSchema', () => {
    it('should return the route Entity schema for the route group node', async () => {
      const routeNode = await abstractVisualEntity.toVizNode();
      const ids = routeNode.data;

      const result = await abstractVisualEntity.fetchNodeSchema(ids);

      // The schema comes straight from the entities catalog entry for 'route'
      const routeEntry = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, 'route');
      expect(result).toEqual(routeEntry!.propertiesSchema);
      // No component parameters injected — the route entity has no secondaryNodeId
      expect(result?.properties?.parameters).toBeUndefined();
    });

    it('should return the from Entity schema merged with the component properties', async () => {
      // abstractVisualEntity uses camelRouteJson whose from.uri is 'timer'
      const routeNode = await abstractVisualEntity.toVizNode();
      const fromNode = routeNode.getChildren()?.[0];
      const ids = fromNode!.data;

      expect(ids.primaryNodeId).toEqual({ name: 'from', catalogKind: CatalogKind.Entity });
      expect(ids.secondaryNodeId).toEqual({ name: 'timer', catalogKind: CatalogKind.Component });
      expect(ids.tertiaryNodeId).toBeUndefined();

      const result = await abstractVisualEntity.fetchNodeSchema(ids);

      const fromEntry = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Entity, 'from');
      expect(result?.type).toBe(fromEntry!.propertiesSchema?.type);

      const timerEntry = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Component, 'timer');
      expect(result?.properties?.parameters?.properties).toEqual(
        expect.objectContaining({ timerName: expect.any(Object) }),
      );
      expect(result?.properties?.parameters?.['x-component-name']).toBe('timer');
      // Consumer-only properties are retained for a `from` node; none are filtered
      expect(result?.properties?.parameters?.required).toEqual(timerEntry!.propertiesSchema.required);
    });

    it('should not mutate the catalog Kamelet definition', async () => {
      // Build a real route entity whose `from` sources from a real catalog kamelet
      const entity = new CamelRouteVisualEntity(cloneDeep(camelRouteWithKameletJson));

      const routeNode = await entity.toVizNode();
      const fromNode = routeNode.getChildren()?.[0];
      const ids = fromNode!.data;

      // Snapshot the live catalog entry before the call
      const kameletEntry = await DynamicCatalogRegistry.get().getEntity(CatalogKind.Kamelet, 'avro-deserialize-action');
      const originalDefinitionSnapshot = cloneDeep(kameletEntry!.spec.definition);

      const result = await entity.fetchNodeSchema(ids);

      // The catalog entry itself must NOT be mutated
      expect(kameletEntry!.spec.definition).toEqual(originalDefinitionSnapshot);
      expect(kameletEntry!.spec.definition).not.toHaveProperty('x-kamelet-name');

      // The returned schema carries the decorations
      expect(result?.properties?.parameters?.['x-kamelet-name']).toBe('avro-deserialize-action');
      expect(result?.properties?.parameters?.type).toBe('object');

      // The result must not be the same object reference as the catalog entry
      expect(result?.properties?.parameters).not.toBe(kameletEntry!.spec.definition);
    });
  });
});
