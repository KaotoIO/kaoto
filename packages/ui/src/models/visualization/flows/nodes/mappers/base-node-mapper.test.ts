import { RouteDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { RootNodeMapper } from '../root-node-mapper';
import { BaseNodeMapper } from './base-node-mapper';

describe('BaseNodeMapper', () => {
  let mapper: BaseNodeMapper;
  let path: string;
  let componentLookup: { primaryNodeId: { name: string; catalogKind: CatalogKind } };
  let entityDefinition: unknown;

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    mapper = new BaseNodeMapper(rootNodeMapper);
    rootNodeMapper.registerDefaultMapper(mapper);

    path = 'to';
    componentLookup = {
      primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
    };
    entityDefinition = { to: { uri: 'timer', parameters: { timerName: 'timerName' } } };
  });

  describe('getVizNodeFromProcessor', () => {
    it('should return a VisualizationNode', async () => {
      const vizNode = await mapper.getVizNodeFromProcessor(path, componentLookup, entityDefinition);

      expect(vizNode).toBeDefined();
      expect(vizNode.data).toMatchObject({
        path,
        name: 'timer',
      });
      expect(vizNode.data.primaryNodeId).toEqual({ name: 'to', catalogKind: CatalogKind.Pattern });
      expect(vizNode.data.secondaryNodeId).toEqual({ name: 'timer', catalogKind: CatalogKind.Component });
      expect(vizNode.data.tertiaryNodeId).toBeUndefined();
    });

    it('should set only primaryNodeId when there is no componentName (processor-only)', async () => {
      const processorOnlyLookup = {
        primaryNodeId: { name: 'log', catalogKind: CatalogKind.Pattern },
      };

      const vizNode = await mapper.getVizNodeFromProcessor('route.log', processorOnlyLookup, {});

      expect(vizNode.data.primaryNodeId).toEqual({ name: 'log', catalogKind: CatalogKind.Pattern });
      expect(vizNode.data.secondaryNodeId).toBeUndefined();
      expect(vizNode.data.tertiaryNodeId).toBeUndefined();
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

      const fromComponentLookup = {
        primaryNodeId: { name: 'from', catalogKind: CatalogKind.Pattern },
      };

      const vizNode = await mapper.getVizNodeFromProcessor('from', fromComponentLookup, routeDefinition);
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

      const fromComponentLookup = {
        primaryNodeId: { name: 'from', catalogKind: CatalogKind.Pattern },
      };

      const vizNode = await mapper.getVizNodeFromProcessor('from', fromComponentLookup, routeDefinition);
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
      const kameletComponentLookup = {
        primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
      };
      const kameletEntityDefinition = {
        route: {
          to: {
            uri: 'kamelet:postgresql-sink',
            parameters: { serverName: 'localhost' },
          },
        },
      };

      const vizNode = await mapper.getVizNodeFromProcessor('route.to', kameletComponentLookup, kameletEntityDefinition);

      expect(vizNode).toBeDefined();
      expect(vizNode.data).toMatchObject({
        path: 'route.to',
        name: 'postgresql-sink', // Should strip 'kamelet:' prefix
      });
      expect(vizNode.data.primaryNodeId).toEqual({ name: 'to', catalogKind: CatalogKind.Pattern });
      expect(vizNode.data.secondaryNodeId).toEqual({ name: 'kamelet', catalogKind: CatalogKind.Component });
      expect(vizNode.data.tertiaryNodeId).toEqual({ name: 'postgresql-sink', catalogKind: CatalogKind.Kamelet });
    });

    it('should handle a bare "kamelet" URI (no specific kamelet selected yet)', async () => {
      const toWithBareKameletLookup = {
        primaryNodeId: { name: 'to', catalogKind: CatalogKind.Pattern },
      };
      const entityDefinition = {
        route: {
          to: {
            uri: 'kamelet',
          },
        },
      };

      const vizNode = await mapper.getVizNodeFromProcessor('route.to', toWithBareKameletLookup, entityDefinition);

      expect(vizNode).toBeDefined();
      // Should label the node as 'kamelet' (the component), not 'to' (the processor)
      expect(vizNode.data.name).toBe('kamelet');
      expect(vizNode.data.primaryNodeId).toEqual({ name: 'to', catalogKind: CatalogKind.Pattern });
      expect(vizNode.data.secondaryNodeId).toEqual({ name: 'kamelet', catalogKind: CatalogKind.Component });
      expect(vizNode.data.tertiaryNodeId).toBeUndefined();
    });
  });
});
