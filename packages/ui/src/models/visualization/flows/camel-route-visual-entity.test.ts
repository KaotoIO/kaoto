import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteDefinition } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';

import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { mockRandomValues } from '../../../stubs';
import { camelRouteJson } from '../../../stubs/camel-route';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../stubs/test-load-catalog';
import { CatalogKind } from '../../catalog-kind';
import { EntityType } from '../../entities/base-entity';
import { NodeLabelType } from '../../settings/settings.model';
import { IVisualizationNode } from '../base-visual-entity';
import { CamelRouteVisualEntity } from './camel-route-visual-entity';

describe('Camel Route', () => {
  let camelEntity: CamelRouteVisualEntity;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  beforeEach(() => {
    camelEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJson));
  });

  describe('id', () => {
    it('should have an uuid', () => {
      expect(camelEntity.id).toBeDefined();
      expect(typeof camelEntity.id).toBe('string');
    });

    it('should use a default camel random id if the route id is not provided', () => {
      mockRandomValues();
      const route = new CamelRouteVisualEntity({ from: { uri: 'direct:foo', steps: [] } });

      /** This is being mocked at the window.crypto.get */
      expect(route.id).toBe('route-1234');
    });

    it('should have a type', () => {
      expect(camelEntity.type).toEqual(EntityType.Route);
    });

    it('should return the id', () => {
      expect(camelEntity.getId()).toEqual(expect.any(String));
    });

    it('should change the id', () => {
      camelEntity.setId('camelEntity-12345');
      expect(camelEntity.getId()).toBe('camelEntity-12345');
    });
  });

  describe('getNodeLabel', () => {
    it('should return an empty string if path is not provided', () => {
      expect(camelEntity.getNodeLabel()).toBe('');
    });

    it('should return empty string when called without ids', () => {
      const label = camelEntity.getNodeLabel('route.from', NodeLabelType.Id);

      expect(label).toBe('');
    });
  });

  describe('fetchNodeSchema', () => {
    it('should return undefined if no primaryNodeId is provided', async () => {
      expect(await camelEntity.fetchNodeSchema({})).toBeUndefined();
    });

    it('should return schema for the from node with component merge', async () => {
      const routeNode = await camelEntity.toVizNode();
      const fromNode = routeNode.getChildren()?.[0];
      const result = await camelEntity.fetchNodeSchema(fromNode!.data);

      expect(result?.properties?.parameters?.['x-component-name']).toBe('timer');
    });
  });

  describe('getNodeDefinition', () => {
    const toStepIds = {
      primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
      secondaryNodeId: { name: 'direct', catalogKind: CatalogKind.Component },
    };

    const fromStepIds = {
      primaryNodeId: { name: 'from', catalogKind: CatalogKind.Entity },
      secondaryNodeId: { name: 'timer', catalogKind: CatalogKind.Component },
    };

    const logStepIds = {
      primaryNodeId: { name: 'log', catalogKind: CatalogKind.Pattern },
    };

    it('should return undefined if no path is provided', () => {
      expect(camelEntity.getNodeDefinition()).toBeUndefined();
    });

    it('should return undefined if path does not exist in the entity', () => {
      const result = camelEntity.getNodeDefinition('invalid.path');

      expect(result).toBeUndefined();
    });

    it('should return the raw definition for a valid path', () => {
      const result = camelEntity.getNodeDefinition('route.from.steps.2.to', toStepIds);

      // getNodeDefinition returns raw form — URI is not split here
      expect(result).toEqual({
        uri: 'direct:my-route',
        parameters: {
          bridgeErrorHandler: true,
        },
      });
    });

    it('should override null parameters with an empty object', () => {
      const clonedRoute = cloneDeep(camelRouteJson);
      (clonedRoute.route.from as unknown as Record<string, unknown>).parameters = null;
      const entity = new CamelRouteVisualEntity(clonedRoute);

      const result = entity.getNodeDefinition('route.from', fromStepIds);

      expect((result as Record<string, unknown>).parameters).toEqual({});
    });

    it('should handle nested step definitions', () => {
      const result = camelEntity.getNodeDefinition('route.from.steps.1.choice.when.0.steps.0.log', logStepIds);

      expect(result).toEqual({ message: 'We got a one.', id: 'log-1' });
    });

    it('should return raw definition when parameters is present', () => {
      const result = camelEntity.getNodeDefinition('route.from.steps.2.to', toStepIds);

      // getNodeDefinition returns raw — uri is 'direct:my-route' not split
      expect(result).toMatchObject({ uri: 'direct:my-route' });
    });
  });

  it('should return the json', () => {
    expect(camelEntity.toJSON()).toEqual({
      route: camelRouteJson.route,
    });
  });

  describe('updateModel', () => {
    it('should not update the model if no path is provided', () => {
      const originalObject = cloneDeep(camelRouteJson.route);

      camelEntity.updateModel(undefined, undefined);

      expect(originalObject).toEqual(camelRouteJson.route);
    });

    it('should update the model', () => {
      const uri = 'amqp:queue:my-queue';

      camelEntity.updateModel('route.from.uri', uri);

      expect(camelEntity.entityDef.route.from?.uri).toEqual(uri);
    });
  });

  describe('removeStep', () => {
    it('should not remove any step if no path is provided', () => {
      const originalObject = cloneDeep(camelRouteJson);

      camelEntity.removeStep(undefined);

      expect(originalObject).toEqual(camelEntity.entityDef);
    });

    it('should set the `route.from.uri` property to an empty string if the path is `from`', () => {
      camelEntity.removeStep('route.from');

      expect(camelEntity.entityDef.route.from?.uri).toBe('');
    });

    it('should remove the step if the path is a number', () => {
      /** Remove `set-header` step */
      camelEntity.removeStep('route.from.steps.0');

      expect(camelEntity.entityDef.route.from?.steps).toHaveLength(2);
      expect(camelEntity.entityDef.route.from?.steps[0].choice).toBeDefined();
    });

    it('should remove the step if the path is a word and the penultimate segment is a number', () => {
      /** Remove `choice` step */
      camelEntity.removeStep('route.from.steps.1.choice');

      expect(camelEntity.entityDef.route.from?.steps).toHaveLength(2);
      expect(camelEntity.entityDef.route.from?.steps[1].to).toBeDefined();
    });

    it('should remove the step if the path is a word and the penultimate segment is a word', () => {
      /** Remove `to` step */
      camelEntity.removeStep('route.from.steps.1.choice.otherwise');

      expect(camelEntity.entityDef.route.from?.steps).toHaveLength(3);
      expect(camelEntity.entityDef.route.from?.steps[1].choice?.otherwise).toBeUndefined();
    });

    it('should remove a nested step', () => {
      /** Remove second `to: amqp` step form the choice.otherwise step */
      camelEntity.removeStep('route.from.steps.1.choice.otherwise.steps.1.to');

      expect(camelEntity.entityDef.route.from?.steps).toHaveLength(3);
      expect(camelEntity.entityDef.route.from?.steps[1].choice?.otherwise?.steps).toHaveLength(2);
    });
  });

  describe('toVizNode', () => {
    it(`should return the group viz node and set the initial path to '${CamelRouteVisualEntity.ROOT_PATH}'`, async () => {
      const vizNode = await camelEntity.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.data.path).toEqual(CamelRouteVisualEntity.ROOT_PATH);
    });

    it('should return the group first child and set the initial path to `route.from`', async () => {
      const vizNode = await camelEntity.toVizNode();
      const fromNode = vizNode.getChildren()?.[0];

      expect(fromNode).toBeDefined();
      expect(fromNode?.data.path).toBe('route.from');
    });

    it('should use the route ID as the group label', async () => {
      const vizNode = await camelEntity.toVizNode();

      expect(vizNode.getNodeLabel()).toBe('route-8888');
    });

    it('should use the route description as the group label if available', async () => {
      camelEntity.entityDef.route.description = 'This is a route description';
      const vizNode = await camelEntity.toVizNode();

      expect(vizNode.getNodeLabel(NodeLabelType.Description)).toBe('This is a route description');
    });

    it('should use the default group label if the id is not available', async () => {
      camelEntity.entityDef.route.id = undefined;
      const vizNode = await camelEntity.toVizNode();

      expect(vizNode.getNodeLabel()).toBe('route-8888');
    });

    it('should use the uri as the node label', async () => {
      const vizNode = await camelEntity.toVizNode();
      const fromNode = vizNode.getChildren()?.[0];

      expect(fromNode?.getNodeLabel()).toBe('timer');
    });

    it('should set a default label if the uri is not available', async () => {
      camelEntity = new CamelRouteVisualEntity({ from: {} } as RouteDefinition);
      const vizNode = await camelEntity.toVizNode();
      const fromNode = vizNode.getChildren()?.[0];

      expect(fromNode?.getNodeLabel()).toBe('from: Unknown');
    });

    it('should populate the viz node chain with simple steps', async () => {
      const vizNode = await new CamelRouteVisualEntity({
        route: {
          id: 'route-1234',
          from: { uri: 'timer', steps: [{ choice: { when: [{ steps: [{ log: { message: 'We got a one.' } }] }] } }] },
        },
      }).toVizNode();
      const fromNode = vizNode.getChildren()![0];

      /** Given a structure of
       * from
       *  - choice
       *    - when
       *      - log
       */

      /** group node */
      expect(vizNode.data.path).toEqual(CamelRouteVisualEntity.ROOT_PATH);
      expect(vizNode.data.isGroup).toBeTruthy();
      expect(vizNode.getNodeLabel()).toBe('route-1234');
      /** Since this is the root node, there's no previous step */
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeUndefined();

      /** from node and choice group */
      expect(vizNode.getChildren()).toHaveLength(3);
      expect(vizNode.getChildren()?.[0].data.path).toBe('route.from');
      expect(vizNode.getChildren()?.[1].data.path).toBe('route.from.steps.0.choice');
      expect(vizNode.getChildren()?.[2].data.isPlaceholder).toBe(true);

      /** from */
      expect(fromNode.data.path).toBe('route.from');
      expect(fromNode.getNodeLabel()).toBe('timer');
      /** Since this is the first child node, there's no previous step */
      expect(fromNode.getPreviousNode()).toBeUndefined();
      expect(fromNode.getNextNode()).toBeDefined();
      expect(fromNode.getChildren()).toHaveLength(0);

      /** choice */
      const choiceNode = vizNode.getChildren()?.[1] as IVisualizationNode;
      expect(choiceNode.data.path).toBe('route.from.steps.0.choice');
      expect(choiceNode.getNodeLabel()).toBe('choice');
      expect(choiceNode.getPreviousNode()).toBe(fromNode);
      expect(choiceNode.getNextNode()?.data.isPlaceholder).toBe(true);
      expect(choiceNode.getChildren()).toHaveLength(3); // when placeholder, when, otherwise placeholder
      /** choice.when (index 0 is when placeholder, index 1 is the actual when) */
      const whenNode = choiceNode.getChildren()?.[1];
      expect(whenNode).toBeDefined();
      expect(whenNode!.data.path).toBe('route.from.steps.0.choice.when.0');
      expect(whenNode!.getNodeLabel()).toBe('when');
    });

    it('should populate the viz node chain with the steps', async () => {
      const vizNode = await camelEntity.toVizNode();
      const fromNode = vizNode.getChildren()![0];

      /** Given a structure of
       * from
       *  - setHeader
       *  - choice
       *    - when
       *      - log
       *   - otherwise
       *    - to
       *    - to
       *    - log
       * - toDirect
       */

      /** group node */
      expect(vizNode.data.path).toEqual(CamelRouteVisualEntity.ROOT_PATH);
      expect(vizNode.data.isGroup).toBeTruthy();
      expect(vizNode.getNodeLabel()).toBe('route-8888');
      /** Since this is the root node, there's no previous step */
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeUndefined();
      expect(vizNode.getChildren()).toHaveLength(5);
      expect(vizNode.getChildren()?.[4].data.isPlaceholder).toBe(true);

      /** from */
      expect(fromNode.data.path).toBe('route.from');
      expect(fromNode.getNodeLabel()).toBe('timer');
      /** Since this is the first child node, there's no previous step */
      expect(fromNode.getPreviousNode()).toBeUndefined();
      expect(fromNode.getNextNode()).toBeDefined();
      expect(fromNode.getChildren()).toHaveLength(0);

      /** setHeader */
      const setHeaderNode = vizNode.getChildren()?.[1] as IVisualizationNode;
      expect(setHeaderNode.data.path).toBe('route.from.steps.0.set-header');
      expect(setHeaderNode.getNodeLabel()).toBe('set-header');
      expect(setHeaderNode.getPreviousNode()).toBe(fromNode);
      expect(setHeaderNode.getNextNode()).toBeDefined();
      expect(setHeaderNode.getChildren()).toBeUndefined();

      /** choice */
      const choiceNode = setHeaderNode.getNextNode()!;
      expect(choiceNode.data.path).toBe('route.from.steps.1.choice');
      expect(choiceNode.getNodeLabel()).toBe('choice');
      expect(choiceNode.getPreviousNode()).toBe(setHeaderNode);
      expect(choiceNode.getNextNode()).toBeDefined();
      expect(choiceNode.getChildren()).toHaveLength(3); // when placeholder, when, otherwise

      /** toDirect */
      const toDirectNode = choiceNode.getNextNode()!;
      expect(toDirectNode.data.path).toBe('route.from.steps.2.to');
      expect(toDirectNode.getNodeLabel()).toBe('direct');
      expect(toDirectNode.getPreviousNode()).toBe(choiceNode);
      expect(toDirectNode.getNextNode()?.data.isPlaceholder).toBe(true);

      /** choice.when (index 0 is when placeholder, index 1 is the actual when) */
      const whenNode = choiceNode.getChildren()?.[1];
      expect(whenNode).toBeDefined();
      expect(whenNode!.data.path).toBe('route.from.steps.1.choice.when.0');
      expect(whenNode!.getNodeLabel()).toBe('when');
      /** There's no next step since this spawn a new node's tree */
      expect(whenNode!.getPreviousNode()).toBeUndefined();
      expect(whenNode!.getNextNode()).toBeUndefined();
      expect(whenNode!.getParentNode()).toBe(choiceNode);
      expect(whenNode!.getChildren()).toHaveLength(2);
      expect(whenNode!.getChildren()?.[1].data.isPlaceholder).toBe(true);

      /** choice.when.log */
      const logWhenNode = whenNode?.getChildren()?.[0];
      expect(logWhenNode).toBeDefined();
      expect(logWhenNode!.data.path).toBe('route.from.steps.1.choice.when.0.steps.0.log');
      expect(logWhenNode!.getNodeLabel()).toBe('log');
      expect(logWhenNode!.getPreviousNode()).toBeUndefined();
      expect(logWhenNode!.getNextNode()?.data.isPlaceholder).toBe(true);
      expect(logWhenNode!.getParentNode()).toBe(whenNode);
      expect(logWhenNode!.getChildren()).toBeUndefined();

      /** choice.otherwise (index 2: when placeholder, when, otherwise) */
      const otherwiseNode = choiceNode.getChildren()?.[2];
      expect(otherwiseNode).toBeDefined();
      expect(otherwiseNode!.data.path).toBe('route.from.steps.1.choice.otherwise');
      expect(otherwiseNode!.getNodeLabel()).toBe('otherwise');
      expect(otherwiseNode!.getPreviousNode()).toBeUndefined();
      expect(otherwiseNode!.getNextNode()).toBeUndefined();
      expect(otherwiseNode!.getParentNode()).toBe(choiceNode);
      expect(otherwiseNode!.getChildren()).toHaveLength(4);
      expect(otherwiseNode!.getChildren()?.[3].data.isPlaceholder).toBe(true);

      /** choice.otherwise.to 1st */
      const firstToOtherwiseNode = otherwiseNode?.getChildren()?.[0];
      expect(firstToOtherwiseNode).toBeDefined();
      expect(firstToOtherwiseNode!.data.path).toBe('route.from.steps.1.choice.otherwise.steps.0.to');
      expect(firstToOtherwiseNode!.getNodeLabel()).toBe('amqp');
      expect(firstToOtherwiseNode!.getPreviousNode()).toBeUndefined();
      expect(firstToOtherwiseNode!.getNextNode()).toBeDefined();
      expect(firstToOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(firstToOtherwiseNode!.getChildren()).toBeUndefined();

      /** choice.otherwise.to 2nd*/
      const secondToOtherwiseNode = otherwiseNode?.getChildren()?.[1];
      expect(secondToOtherwiseNode).toBeDefined();
      expect(secondToOtherwiseNode!.data.path).toBe('route.from.steps.1.choice.otherwise.steps.1.to');
      expect(secondToOtherwiseNode!.getNodeLabel()).toBe('amqp');
      expect(secondToOtherwiseNode!.getPreviousNode()).toBe(firstToOtherwiseNode);
      expect(secondToOtherwiseNode!.getNextNode()).toBeDefined();
      expect(secondToOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(secondToOtherwiseNode!.getChildren()).toBeUndefined();

      /** choice.otherwise.log */
      const logOtherwiseNode = otherwiseNode?.getChildren()?.[2];
      expect(logOtherwiseNode).toBeDefined();
      expect(logOtherwiseNode!.data.path).toBe('route.from.steps.1.choice.otherwise.steps.2.log');
      expect(logOtherwiseNode!.getNodeLabel()).toBe('log');
      expect(logOtherwiseNode!.getPreviousNode()).toBe(secondToOtherwiseNode);
      expect(logOtherwiseNode!.getNextNode()?.data.isPlaceholder).toBe(true);
      expect(logOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(logOtherwiseNode!.getChildren()).toBeUndefined();
    });
  });
});
