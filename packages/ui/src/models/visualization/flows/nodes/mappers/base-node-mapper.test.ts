import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';

import { ICamelElementLookupResult } from '../../support/camel-component-types';
import { RootNodeMapper } from '../root-node-mapper';
import { BaseNodeMapper } from './base-node-mapper';

describe('BaseNodeMapper', () => {
  let mapper: BaseNodeMapper;
  let path: string;
  let componentLookup: ICamelElementLookupResult;
  let entityDefinition: unknown;

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    mapper = new BaseNodeMapper(rootNodeMapper);
    rootNodeMapper.registerDefaultMapper(mapper);

    path = 'from';
    componentLookup = {
      processorName: 'from' as keyof ProcessorDefinition,
      componentName: 'timer',
    };
    entityDefinition = { uri: 'timer', parameters: { timerName: 'timerName' }, steps: [] };
  });

  describe('getVizNodeFromProcessor', () => {
    it('should return a VisualizationNode', async () => {
      const vizNode = await mapper.getVizNodeFromProcessor(path, componentLookup, entityDefinition);

      expect(vizNode).toBeDefined();
      expect(vizNode.data).toMatchObject({
        path,
        name: 'timer',
        processorName: 'from',
        componentName: 'timer',
      });
    });

    it('should return a VisualizationNode with children', async () => {
      const routeDefinition: RouteDefinition = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'timerName',
          },
          steps: [{ log: 'logName' }, { to: 'direct:anotherRoute' }],
        },
      };

      const vizNode = await mapper.getVizNodeFromProcessor(path, componentLookup, routeDefinition);
      expect(vizNode.getChildren()).toHaveLength(3);
      expect(vizNode.getChildren()?.[0].data.path).toBe('from.steps.0.log');
      expect(vizNode.getChildren()?.[1].data.path).toBe('from.steps.1.to');
      expect(vizNode.getChildren()?.[2].data.isPlaceholder).toBe(true);
    });

    it('should return a VisualizationNode with special children', async () => {
      const routeDefinition: RouteDefinition = {
        from: {
          uri: 'timer',
          parameters: {
            timerName: 'timerName',
          },
          steps: [
            {
              doTry: {
                doCatch: [{ exception: ['java.lang.RuntimeException'] }, { exception: ['java.lang.RuntimeException'] }],
                doFinally: { steps: [{ log: 'logName' }] },
              },
            },
          ],
        },
      };

      const vizNode = await mapper.getVizNodeFromProcessor(path, componentLookup, routeDefinition);
      expect(vizNode.getChildren()).toHaveLength(2);
      expect(vizNode.getChildren()?.[0].data.path).toBe('from.steps.0.doTry');
      expect(vizNode.getChildren()?.[1].data.isPlaceholder).toBe(true);

      const doTryNode = vizNode.getChildren()?.[0];
      expect(doTryNode?.getChildren()).toHaveLength(5);
      expect(doTryNode?.getChildren()?.[0].data.path).toBe('from.steps.0.doTry.steps.0.placeholder');
      expect(doTryNode?.getChildren()?.[1].data.path).toBe('from.steps.0.doTry.doCatch');
      expect(doTryNode?.getChildren()?.[1].data.isPlaceholder).toBe(true);
      expect(doTryNode?.getChildren()?.[2].data.path).toBe('from.steps.0.doTry.doCatch.0');
      expect(doTryNode?.getChildren()?.[3].data.path).toBe('from.steps.0.doTry.doCatch.1');
      expect(doTryNode?.getChildren()?.[4].data.path).toBe('from.steps.0.doTry.doFinally');
    });

    it('should handle kamelet components correctly', async () => {
      const kameletComponentLookup: ICamelElementLookupResult = {
        processorName: 'to' as keyof ProcessorDefinition,
        componentName: 'kamelet:postgresql-sink',
      };
      const kameletEntityDefinition = {
        uri: 'kamelet:postgresql-sink',
        parameters: { serverName: 'localhost' },
      };

      const vizNode = await mapper.getVizNodeFromProcessor('route.to', kameletComponentLookup, kameletEntityDefinition);

      expect(vizNode).toBeDefined();
      expect(vizNode.data).toMatchObject({
        path: 'route.to',
        name: 'postgresql-sink', // Should strip 'kamelet:' prefix
        processorName: 'to',
        componentName: 'kamelet:postgresql-sink',
      });
    });
  });
});
