import { JSONSchemaType } from 'ajv';
import { camelRouteJson } from '../../../stubs/camel-route';
import { EntityType } from '../../camel/entities/base-entity';
import { CamelComponentSchemaService } from './camel-component-schema.service';
import { CamelRouteVisualEntity, isCamelRoute } from './camel-route-visual-entity';
import { RouteDefinition } from '@kaoto-next/camel-catalog/types';

describe('Camel Route', () => {
  let camelEntity: CamelRouteVisualEntity;

  beforeEach(() => {
    camelEntity = new CamelRouteVisualEntity(JSON.parse(JSON.stringify(camelRouteJson.route)));
  });

  describe('isCamelRoute', () => {
    it.each([
      [{ route: { from: 'direct:foo' } }, true],
      [camelRouteJson, true],
      [undefined, false],
      [null, false],
      [true, false],
      [false, false],
    ])('should mark %s as isCamelRoute: %s', (route, result) => {
      expect(isCamelRoute(route)).toEqual(result);
    });
  });

  describe('id', () => {
    it('should have an uuid', () => {
      expect(camelEntity.id).toBeDefined();
      expect(typeof camelEntity.id).toBe('string');
    });

    it('should use a default camel random id if the route id is not provided', () => {
      const route = new CamelRouteVisualEntity();

      /** This is being mocked at the window.crypto.get */
      expect(route.id).toEqual('route-1234');
    });

    it('should have a type', () => {
      expect(camelEntity.type).toEqual(EntityType.Route);
    });

    it('should return the id', () => {
      expect(camelEntity.getId()).toEqual(expect.any(String));
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
        schema: {} as JSONSchemaType<unknown>,
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
      const originalObject = JSON.parse(JSON.stringify(camelRouteJson.route));

      camelEntity.updateModel(undefined, undefined);

      expect(originalObject).toEqual(camelRouteJson.route);
    });

    it('should update the model', () => {
      const uri = 'amqp:queue:my-queue';

      camelEntity.updateModel('from.uri', uri);

      expect(camelEntity.route.from?.uri).toEqual(uri);
    });
  });

  describe('getSteps', () => {
    it('should return an empty array if there is no route', () => {
      const route = new CamelRouteVisualEntity();

      expect(route.getSteps()).toEqual([]);
    });

    it('should return an empty array if there is no steps', () => {
      const route = new CamelRouteVisualEntity({ from: {} } as RouteDefinition);

      expect(route.getSteps()).toEqual([]);
    });

    it('should return the steps', () => {
      expect(camelEntity.getSteps()).toEqual([
        {
          'set-header': {
            name: 'myChoice',
            simple: '${random(2)}',
          },
        },
        {
          choice: {
            otherwise: {
              steps: [
                {
                  to: {
                    uri: 'amqp:queue:',
                  },
                },
                {
                  to: {
                    uri: 'amqp:queue:',
                  },
                },
                {
                  log: {
                    id: 'log-2',
                    message: 'We got a ${body}',
                  },
                },
              ],
            },
            when: [
              {
                simple: '${header.myChoice} == 1',
                steps: [
                  {
                    log: {
                      id: 'log-1',
                      message: 'We got a one.',
                    },
                  },
                ],
              },
            ],
          },
        },
        {
          to: {
            parameters: {
              bridgeErrorHandler: true,
            },
            uri: 'direct:my-route',
          },
        },
      ]);
    });
  });

  describe('toVizNode', () => {
    it('should return the viz node and set the initial path to `from`', () => {
      const vizNode = camelEntity.toVizNode();

      expect(vizNode).toBeDefined();
      expect(vizNode.path).toEqual('from');
    });

    it('should use the uri as the node label', () => {
      const vizNode = camelEntity.toVizNode();

      expect(vizNode.label).toEqual('timer:tutorial');
    });

    it('should set an empty label if the uri is not available', () => {
      camelEntity = new CamelRouteVisualEntity({ from: {} } as RouteDefinition);
      const vizNode = camelEntity.toVizNode();

      expect(vizNode.label).toEqual('');
    });

    it('should populate the viz node chain with the steps', () => {
      const vizNode = camelEntity.toVizNode();

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

      /** from */
      expect(vizNode.path).toEqual('from');
      expect(vizNode.label).toEqual('timer:tutorial');
      /** Since this is the root node, there's no previous or next step */
      expect(vizNode.getPreviousNode()).toBeUndefined();
      expect(vizNode.getNextNode()).toBeDefined();

      /** setHeader */
      const setHeaderNode = vizNode.getNextNode()!;
      expect(setHeaderNode.path).toEqual('from.steps.0.set-header');
      expect(setHeaderNode.label).toEqual('set-header');
      expect(setHeaderNode.getPreviousNode()).toBe(vizNode);
      expect(setHeaderNode.getNextNode()).toBeDefined();

      /** choice */
      const choiceNode = setHeaderNode.getNextNode()!;
      expect(choiceNode.path).toEqual('from.steps.1.choice');
      expect(choiceNode.label).toEqual('choice');
      expect(choiceNode.getPreviousNode()).toBe(setHeaderNode);
      expect(choiceNode.getNextNode()).toBeDefined();
      expect(choiceNode.getChildren()).toHaveLength(2);

      /** toDirect */
      const toDirectNode = choiceNode.getNextNode()!;
      expect(toDirectNode.path).toEqual('from.steps.2.to');
      expect(toDirectNode.label).toEqual('direct:my-route');
      expect(toDirectNode.getPreviousNode()).toBe(choiceNode);
      expect(toDirectNode.getNextNode()).toBeUndefined();

      /** choice.when */
      const whenNode = choiceNode.getChildren()?.[0];
      expect(whenNode).toBeDefined();
      expect(whenNode!.path).toEqual('from.steps.1.choice.when.0');
      expect(whenNode!.label).toEqual('when');
      /** There's no next step since this spawn a new node's tree */
      expect(whenNode!.getPreviousNode()).toBeUndefined();
      expect(whenNode!.getNextNode()).toBeUndefined();
      expect(whenNode!.getParentNode()).toBe(choiceNode);
      expect(whenNode!.getChildren()).toHaveLength(1);

      /** choice.when.log */
      const logWhenNode = whenNode?.getChildren()?.[0];
      expect(logWhenNode).toBeDefined();
      expect(logWhenNode!.path).toEqual('from.steps.1.choice.when.0.steps.0.log');
      expect(logWhenNode!.label).toEqual('log');
      expect(logWhenNode!.getPreviousNode()).toBeUndefined();
      expect(logWhenNode!.getNextNode()).toBeUndefined();
      expect(logWhenNode!.getParentNode()).toBe(whenNode);
      expect(logWhenNode!.getChildren()).toBeUndefined();

      /** choice.otherwise */
      const otherwiseNode = choiceNode.getChildren()?.[1];
      expect(otherwiseNode).toBeDefined();
      expect(otherwiseNode!.path).toEqual('from.steps.1.choice.otherwise');
      expect(otherwiseNode!.label).toEqual('otherwise');
      expect(otherwiseNode!.getPreviousNode()).toBeUndefined();
      expect(otherwiseNode!.getNextNode()).toBeUndefined();
      expect(otherwiseNode!.getParentNode()).toBe(choiceNode);
      expect(otherwiseNode!.getChildren()).toHaveLength(3);

      /** choice.otherwise.to 1st */
      const firstToOtherwiseNode = otherwiseNode?.getChildren()?.[0];
      expect(firstToOtherwiseNode).toBeDefined();
      expect(firstToOtherwiseNode!.path).toEqual('from.steps.1.choice.otherwise.steps.0.to');
      expect(firstToOtherwiseNode!.label).toEqual('amqp:queue:');
      expect(firstToOtherwiseNode!.getPreviousNode()).toBeUndefined();
      expect(firstToOtherwiseNode!.getNextNode()).toBeDefined();
      expect(firstToOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(firstToOtherwiseNode!.getChildren()).toBeUndefined();

      /** choice.otherwise.to 2nd*/
      const secondToOtherwiseNode = otherwiseNode?.getChildren()?.[1];
      expect(secondToOtherwiseNode).toBeDefined();
      expect(secondToOtherwiseNode!.path).toEqual('from.steps.1.choice.otherwise.steps.1.to');
      expect(secondToOtherwiseNode!.label).toEqual('amqp:queue:');
      expect(secondToOtherwiseNode!.getPreviousNode()).toBe(firstToOtherwiseNode);
      expect(secondToOtherwiseNode!.getNextNode()).toBeDefined();
      expect(secondToOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(secondToOtherwiseNode!.getChildren()).toBeUndefined();

      /** choice.otherwise.log */
      const logOtherwiseNode = otherwiseNode?.getChildren()?.[2];
      expect(logOtherwiseNode).toBeDefined();
      expect(logOtherwiseNode!.path).toEqual('from.steps.1.choice.otherwise.steps.2.log');
      expect(logOtherwiseNode!.label).toEqual('log');
      expect(logOtherwiseNode!.getPreviousNode()).toBe(secondToOtherwiseNode);
      expect(logOtherwiseNode!.getNextNode()).toBeUndefined();
      expect(logOtherwiseNode!.getParentNode()).toBe(otherwiseNode);
      expect(logOtherwiseNode!.getChildren()).toBeUndefined();
    });
  });
});
