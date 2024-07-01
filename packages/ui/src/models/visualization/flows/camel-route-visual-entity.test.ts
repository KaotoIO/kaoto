import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import cloneDeep from 'lodash/cloneDeep';
import { camelFromJson } from '../../../stubs/camel-from';
import { camelRouteJson } from '../../../stubs/camel-route';
import { ROOT_PATH } from '../../../utils';
import { EntityType } from '../../camel/entities/base-entity';
import { KaotoSchemaDefinition } from '../../kaoto-schema';
import { IVisualizationNode } from '../base-visual-entity';
import { CamelRouteVisualEntity, isCamelFrom, isCamelRoute } from './camel-route-visual-entity';
import { CamelComponentSchemaService } from './support/camel-component-schema.service';

describe('Camel Route', () => {
  let camelEntity: CamelRouteVisualEntity;

  beforeEach(() => {
    camelEntity = new CamelRouteVisualEntity(cloneDeep(camelRouteJson));
  });

  describe('isCamelRoute', () => {
    it.each([
      [{ route: { from: 'direct:foo' } }, true],
      [{ from: 'direct:foo' }, false],
      [{ from: { uri: 'direct:foo', steps: [] } }, false],
      [camelRouteJson, true],
      [camelFromJson, false],
      [undefined, false],
      [null, false],
      [true, false],
      [false, false],
    ])('should mark %s as isCamelRoute: %s', (route, result) => {
      expect(isCamelRoute(route)).toEqual(result);
    });
  });

  describe('isCamelFrom', () => {
    it.each([
      [{ route: { from: 'direct:foo' } }, false],
      [{ from: 'direct:foo' }, false],
      [{ from: { uri: 'direct:foo' } }, true],
      [{ from: { uri: 'direct:foo', steps: [] } }, true],
      [camelRouteJson, false],
      [camelFromJson, true],
      [undefined, false],
      [null, false],
      [true, false],
      [false, false],
    ])('should mark %s as isCamelFrom: %s', (route, result) => {
      expect(isCamelFrom(route)).toEqual(result);
    });
  });

  describe('id', () => {
    it('should have an uuid', () => {
      expect(camelEntity.id).toBeDefined();
      expect(typeof camelEntity.id).toBe('string');
    });

    it('should use a default camel random id if the route id is not provided', () => {
      const route = new CamelRouteVisualEntity({ from: { uri: 'direct:foo', steps: [] } });

      /** This is being mocked at the window.crypto.get */
      expect(route.id).toEqual('route-1234');
    });

    it('should have a type', () => {
      expect(camelEntity.type).toEqual(EntityType.Route);
    });

    it('should return the id', () => {
      expect(camelEntity.getId()).toEqual(expect.any(String));
    });

    it('should change the id', () => {
      camelEntity.setId('camelEntity-12345');
      expect(camelEntity.getId()).toEqual('camelEntity-12345');
    });
  });

  describe('getNodeLabel', () => {
    it('should return an empty string if path is not provided', () => {
      expect(camelEntity.getNodeLabel()).toEqual('');
    });

    it('should delegate the label lookup to the CamelComponentSchemaService.getNodeLabel() method', () => {
      const lookupValue = {
        processorName: 'from' as keyof ProcessorDefinition,
        componentName: 'timer',
      };
      const getNodeLabelSpy = jest.spyOn(CamelComponentSchemaService, 'getNodeLabel');
      jest.spyOn(CamelComponentSchemaService, 'getCamelComponentLookup').mockReturnValueOnce(lookupValue);

      const label = camelEntity.getNodeLabel('from', 'id');

      expect(getNodeLabelSpy).toHaveBeenCalledWith(lookupValue, camelRouteJson.route.from, 'id');
      expect(label).toEqual('timer');
    });
  });

  describe('getComponentSchema', () => {
    it('should return undefined if no path is provided', () => {
      expect(camelEntity.getComponentSchema()).toBeUndefined();
    });

    it('should return undefined if no component model is found', () => {
      const result = camelEntity.getComponentSchema('test');

      expect(result).toEqual({
        title: 'test',
        schema: {},
        definition: undefined,
      });
    });

    it('should return the component schema', () => {
      const spy = jest.spyOn(CamelComponentSchemaService, 'getVisualComponentSchema');
      spy.mockReturnValueOnce({
        title: 'test',
        schema: {} as KaotoSchemaDefinition['schema'],
        definition: {},
      });

      camelEntity.getComponentSchema('from.uri');

      expect(spy).toHaveBeenCalledWith('from.uri', 'timer:tutorial');
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

      camelEntity.updateModel('from.uri', uri);

      expect(camelEntity.route.from?.uri).toEqual(uri);
    });
  });

  describe('removeStep', () => {
    it('should not remove any step if no path is provided', () => {
      const originalObject = cloneDeep(camelRouteJson.route);

      camelEntity.removeStep(undefined);

      expect(originalObject).toEqual(camelEntity.route);
    });

    it('should set the `from.uri` property to an empty string if the path is `from`', () => {
      camelEntity.removeStep('from');

      expect(camelEntity.route.from?.uri).toEqual('');
    });

    it('should remove the step if the path is a number', () => {
      /** Remove `set-header` step */
      camelEntity.removeStep('from.steps.0');

      expect(camelEntity.route.from?.steps).toHaveLength(2);
      expect(camelEntity.route.from?.steps[0].choice).toBeDefined();
    });

    it('should remove the step if the path is a word and the penultimate segment is a number', () => {
      /** Remove `choice` step */
      camelEntity.removeStep('from.steps.1.choice');

      expect(camelEntity.route.from?.steps).toHaveLength(2);
      expect(camelEntity.route.from?.steps[1].to).toBeDefined();
    });

    it('should remove the step if the path is a word and the penultimate segment is a word', () => {
      /** Remove `to` step */
      camelEntity.removeStep('from.steps.1.choice.otherwise');

      expect(camelEntity.route.from?.steps).toHaveLength(3);
      expect(camelEntity.route.from?.steps[1].choice?.otherwise).toBeUndefined();
    });

    it('should remove a nested step', () => {
      /** Remove second `to: amqp` step form the choice.otherwise step */
      camelEntity.removeStep('from.steps.1.choice.otherwise.steps.1.to');

      expect(camelEntity.route.from?.steps).toHaveLength(3);
      expect(camelEntity.route.from?.steps[1].choice?.otherwise?.steps).toHaveLength(2);
    });
  });

  describe('toVizNode', () => {
    it(`should return the group viz node and set the initial path to '${ROOT_PATH}'`, () => {
      const vizNode = camelEntity.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.data.path).toEqual(ROOT_PATH);
    });

    it('should return the group first child and set the initial path to `from`', () => {
      const vizNode = camelEntity.toVizNode();
      const fromNode = vizNode.getChildren()?.[0];

      expect(fromNode).toBeDefined();
      expect(fromNode?.data.path).toEqual('from');
    });

    it('should use the route ID as the group label', () => {
      const vizNode = camelEntity.toVizNode();

      expect(vizNode.getNodeLabel()).toEqual('route-8888');
    });

    it('should use the route description as the group label if available', () => {
      camelEntity.route.description = 'This is a route description';
      const vizNode = camelEntity.toVizNode();

      expect(vizNode.getNodeLabel()).toEqual('This is a route description');
    });

    it('should use the default group label if the id is not available', () => {
      camelEntity.route.id = undefined;
      const vizNode = camelEntity.toVizNode();

      expect(vizNode.getNodeLabel()).toEqual('route');
    });

    it('should use the uri as the node label', () => {
      const vizNode = camelEntity.toVizNode();
      const fromNode = vizNode.getChildren()?.[0];

      expect(fromNode?.getNodeLabel()).toEqual('timer');
    });

    it('should set a default label if the uri is not available', () => {
      camelEntity = new CamelRouteVisualEntity({ from: {} } as RouteDefinition);
      const vizNode = camelEntity.toVizNode();
      const fromNode = vizNode.getChildren()?.[0];

      expect(fromNode?.getNodeLabel()).toEqual('from: Unknown');
    });

    it('should populate the viz node chain with simple steps', () => {
      const vizNode = new CamelRouteVisualEntity({
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
      expect(vizNode.data.path).toEqual('#');
      expect(vizNode.data.isGroup).toBeTruthy();
      expect(vizNode.getNodeLabel()).toEqual('route-1234');
      /** Since this is the root node, there's no previous step */
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeUndefined();
      expect(vizNode.getChildren()).toHaveLength(1);

      /** from */
      expect(fromNode.data.path).toEqual('from');
      expect(fromNode.getNodeLabel()).toEqual('timer');
      /** Since this is the first child node, there's no previous step */
      expect(fromNode.getPreviousNode()).toBeUndefined();
      expect(fromNode.getNextNode()).toBeUndefined();
      expect(fromNode.getChildren()).toHaveLength(1);

      /** choice */
      const choiceNode = fromNode.getChildren()?.[0] as IVisualizationNode;
      expect(choiceNode.data.path).toEqual('from.steps.0.choice');
      expect(choiceNode.getNodeLabel()).toEqual('choice');
      expect(choiceNode.getPreviousNode()).toBeUndefined();
      expect(choiceNode.getNextNode()).toBeUndefined();
      expect(choiceNode.getChildren()).toHaveLength(1);

      /** choice.when */
      const whenNode = choiceNode.getChildren()?.[0];
      expect(whenNode).toBeDefined();
      expect(whenNode!.data.path).toEqual('from.steps.0.choice.when.0');
      expect(whenNode!.getNodeLabel()).toEqual('when');
    });

    it('should populate the viz node chain with the steps', () => {
      const vizNode = camelEntity.toVizNode();
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
      expect(vizNode.data.path).toEqual('#');
      expect(vizNode.data.isGroup).toBeTruthy();
      expect(vizNode.getNodeLabel()).toEqual('route-8888');
      /** Since this is the root node, there's no previous step */
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeUndefined();
      expect(vizNode.getChildren()).toHaveLength(1);

      /** from */
      expect(fromNode.data.path).toEqual('from');
      expect(fromNode.getNodeLabel()).toEqual('timer');
      /** Since this is the first child node, there's no previous step */
      expect(fromNode.getPreviousNode()).toBeUndefined();
      expect(fromNode.getNextNode()).toBeUndefined();
      expect(fromNode.getChildren()).toHaveLength(3);

      /** setHeader */
      const setHeaderNode = fromNode.getChildren()?.[0] as IVisualizationNode;
      expect(setHeaderNode.data.path).toEqual('from.steps.0.set-header');
      expect(setHeaderNode.getNodeLabel()).toEqual('set-header');
      expect(setHeaderNode.getPreviousNode()).toBeUndefined();
      expect(setHeaderNode.getNextNode()).toBeDefined();
      expect(setHeaderNode.getChildren()).toBeUndefined();

      /** choice */
      const choiceNode = setHeaderNode.getNextNode()!;
      expect(choiceNode.data.path).toEqual('from.steps.1.choice');
      expect(choiceNode.getNodeLabel()).toEqual('choice');
      expect(choiceNode.getPreviousNode()).toBe(setHeaderNode);
      expect(choiceNode.getNextNode()).toBeDefined();
      expect(choiceNode.getChildren()).toHaveLength(2);

      /** toDirect */
      const toDirectNode = choiceNode.getNextNode()!;
      expect(toDirectNode.data.path).toEqual('from.steps.2.to');
      expect(toDirectNode.getNodeLabel()).toEqual('direct');
      expect(toDirectNode.getPreviousNode()).toBe(choiceNode);
      expect(toDirectNode.getNextNode()).toBeUndefined();

      /** choice.when */
      const whenNode = choiceNode.getChildren()?.[0];
      expect(whenNode).toBeDefined();
      expect(whenNode!.data.path).toEqual('from.steps.1.choice.when.0');
      expect(whenNode!.getNodeLabel()).toEqual('when');
      /** There's no next step since this spawn a new node's tree */
      expect(whenNode!.getPreviousNode()).toBeUndefined();
      expect(whenNode!.getNextNode()).toBeUndefined();
      expect(whenNode!.getParentNode()).toBe(choiceNode);
      expect(whenNode!.getChildren()).toHaveLength(1);

      /** choice.when.log */
      const logWhenNode = whenNode?.getChildren()?.[0];
      expect(logWhenNode).toBeDefined();
      expect(logWhenNode!.data.path).toEqual('from.steps.1.choice.when.0.steps.0.log');
      expect(logWhenNode!.getNodeLabel()).toEqual('log');
      expect(logWhenNode!.getPreviousNode()).toBeUndefined();
      expect(logWhenNode!.getNextNode()).toBeUndefined();
      expect(logWhenNode!.getParentNode()).toBe(whenNode);
      expect(logWhenNode!.getChildren()).toBeUndefined();

      /** choice.otherwise */
      const otherwiseNode = choiceNode.getChildren()?.[1];
      expect(otherwiseNode).toBeDefined();
      expect(otherwiseNode!.data.path).toEqual('from.steps.1.choice.otherwise');
      expect(otherwiseNode!.getNodeLabel()).toEqual('otherwise');
      expect(otherwiseNode!.getPreviousNode()).toBeUndefined();
      expect(otherwiseNode!.getNextNode()).toBeUndefined();
      expect(otherwiseNode!.getParentNode()).toBe(choiceNode);
      expect(otherwiseNode!.getChildren()).toHaveLength(3);

      /** choice.otherwise.to 1st */
      const firstToOtherwiseNode = otherwiseNode?.getChildren()?.[0];
      expect(firstToOtherwiseNode).toBeDefined();
      expect(firstToOtherwiseNode!.data.path).toEqual('from.steps.1.choice.otherwise.steps.0.to');
      expect(firstToOtherwiseNode!.getNodeLabel()).toEqual('amqp');
      expect(firstToOtherwiseNode!.getPreviousNode()).toBeUndefined();
      expect(firstToOtherwiseNode!.getNextNode()).toBeDefined();
      expect(firstToOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(firstToOtherwiseNode!.getChildren()).toBeUndefined();

      /** choice.otherwise.to 2nd*/
      const secondToOtherwiseNode = otherwiseNode?.getChildren()?.[1];
      expect(secondToOtherwiseNode).toBeDefined();
      expect(secondToOtherwiseNode!.data.path).toEqual('from.steps.1.choice.otherwise.steps.1.to');
      expect(secondToOtherwiseNode!.getNodeLabel()).toEqual('amqp');
      expect(secondToOtherwiseNode!.getPreviousNode()).toBe(firstToOtherwiseNode);
      expect(secondToOtherwiseNode!.getNextNode()).toBeDefined();
      expect(secondToOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(secondToOtherwiseNode!.getChildren()).toBeUndefined();

      /** choice.otherwise.log */
      const logOtherwiseNode = otherwiseNode?.getChildren()?.[2];
      expect(logOtherwiseNode).toBeDefined();
      expect(logOtherwiseNode!.data.path).toEqual('from.steps.1.choice.otherwise.steps.2.log');
      expect(logOtherwiseNode!.getNodeLabel()).toEqual('log');
      expect(logOtherwiseNode!.getPreviousNode()).toBe(secondToOtherwiseNode);
      expect(logOtherwiseNode!.getNextNode()).toBeUndefined();
      expect(logOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(logOtherwiseNode!.getChildren()).toBeUndefined();
    });
  });
});
