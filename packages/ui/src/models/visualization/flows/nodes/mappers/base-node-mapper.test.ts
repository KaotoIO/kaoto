import { RouteDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { NodeIdentity } from '../../../node-identity';
import { RootNodeMapper } from '../root-node-mapper';
import { BaseNodeMapper } from './base-node-mapper';

describe('BaseNodeMapper', () => {
  let mapper: BaseNodeMapper;
  let path: string;
  let primaryNodeId: NodeIdentity;
  let secondaryNodeId: NodeIdentity;
  let entityDefinition: unknown;

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    mapper = new BaseNodeMapper(rootNodeMapper);
    rootNodeMapper.registerDefaultMapper(mapper);

    path = 'from';
    primaryNodeId = { name: 'from', catalogKind: CatalogKind.Pattern };
    secondaryNodeId = { name: 'timer', catalogKind: CatalogKind.Component };
    entityDefinition = { uri: 'timer', parameters: { timerName: 'timerName' }, steps: [] };
  });

  describe('getVizNodeFromProcessor', () => {
    it('should return a VisualizationNode', async () => {
      const vizNode = await mapper.getVizNodeFromProcessor(path, primaryNodeId, entityDefinition, secondaryNodeId);

      expect(vizNode).toBeDefined();
      expect(vizNode.data).toMatchObject({
        path,
        name: 'timer',
        processorName: 'from',
      });
      expect(vizNode.data.primaryNodeId).toEqual({ name: 'from', catalogKind: CatalogKind.Pattern });
      expect(vizNode.data.secondaryNodeId).toEqual({ name: 'timer', catalogKind: CatalogKind.Component });
      expect(vizNode.data.tertiaryNodeId).toBeUndefined();
    });

    it('should set only primaryNodeId when there is no secondaryNodeId (processor-only)', async () => {
      const processorOnlyId: NodeIdentity = { name: 'log', catalogKind: CatalogKind.Pattern };

      const vizNode = await mapper.getVizNodeFromProcessor('route.log', processorOnlyId, {});

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

      const vizNode = await mapper.getVizNodeFromProcessor(path, primaryNodeId, routeDefinition, secondaryNodeId);
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

      const vizNode = await mapper.getVizNodeFromProcessor(path, primaryNodeId, routeDefinition, secondaryNodeId);
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
      const kameletPrimaryId: NodeIdentity = { name: 'to', catalogKind: CatalogKind.Pattern };
      const kameletSecondaryId: NodeIdentity = { name: 'kamelet', catalogKind: CatalogKind.Component };
      const kameletTertiaryId: NodeIdentity = { name: 'postgresql-sink', catalogKind: CatalogKind.Kamelet };
      const kameletEntityDefinition = {
        uri: 'kamelet:postgresql-sink',
        parameters: { serverName: 'localhost' },
      };

      const vizNode = await mapper.getVizNodeFromProcessor(
        'route.to',
        kameletPrimaryId,
        kameletEntityDefinition,
        kameletSecondaryId,
        kameletTertiaryId,
      );

      expect(vizNode).toBeDefined();
      expect(vizNode.data).toMatchObject({
        path: 'route.to',
        name: 'postgresql-sink',
        processorName: 'to',
      });
      expect(vizNode.data.primaryNodeId).toEqual({ name: 'to', catalogKind: CatalogKind.Pattern });
      expect(vizNode.data.secondaryNodeId).toEqual({ name: 'kamelet', catalogKind: CatalogKind.Component });
      expect(vizNode.data.tertiaryNodeId).toEqual({ name: 'postgresql-sink', catalogKind: CatalogKind.Kamelet });
    });
  });
});
