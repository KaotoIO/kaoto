import { CatalogKind } from '../../../../catalog-kind';
import { RootNodeMapper } from '../root-node-mapper';
import { LoadBalanceNodeMapper } from './loadbalance-node-mapper';
import { MulticastNodeMapper } from './multicast-node-mapper';

describe('ParallelProcessorBaseNodeMapper', () => {
  let mapper: MulticastNodeMapper | LoadBalanceNodeMapper;
  let path: string;
  let routeDefinition: unknown;

  describe.each([
    ['multicast', MulticastNodeMapper],
    ['loadBalance', LoadBalanceNodeMapper],
  ])("with '%s'", (processorName, Mapper) => {
    beforeEach(() => {
      const rootNodeMapper = new RootNodeMapper();
      rootNodeMapper.registerDefaultMapper(mapper);

      mapper = new Mapper(rootNodeMapper);

      path = `from.steps.0.${processorName}`;
    });

    describe('getVizNodeFromProcessor', () => {
      it('should return a VisualizationNode', async () => {
        routeDefinition = {
          from: {
            uri: 'timer',
            parameters: {
              timerName: 'timerName',
            },
            steps: [
              {
                [processorName]: {
                  id: `${processorName}-123`,
                },
              },
            ],
          },
        };
        const vizNode = await mapper.getVizNodeFromProcessor(
          path,
          { primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern } },
          routeDefinition,
        );

        expect(vizNode).toBeDefined();
        expect(vizNode.data).toMatchObject({
          path,
          name: processorName,
          isGroup: true,
        });
        // catalogKind is not set when lookup doesn't have componentName
        expect(vizNode.data.catalogKind).toBeUndefined();
        expect(vizNode.data.primaryNodeId).toEqual({ name: processorName, catalogKind: CatalogKind.Pattern });
        expect(vizNode.data.secondaryNodeId).toBeUndefined();
      });

      it('should return a VisualizationNode with children', async () => {
        routeDefinition = {
          from: {
            uri: 'timer',
            parameters: {
              timerName: 'timerName',
            },
            steps: [
              {
                [processorName]: {
                  id: `${processorName}-123`,
                  steps: [
                    {
                      log: {
                        id: 'log-123',
                        message: 'test',
                      },
                    },
                    {
                      log: {
                        id: 'log-456',
                        message: 'test',
                      },
                    },
                  ],
                },
              },
            ],
          },
        };

        const vizNode = await mapper.getVizNodeFromProcessor(
          path,
          { primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern } },
          routeDefinition,
        );
        expect(vizNode.getChildren()).toHaveLength(3);
        expect(vizNode.getChildren()?.[0].getNextNode()).toBeUndefined();
        expect(vizNode.getChildren()?.[1].getPreviousNode()).toBeUndefined();
        expect(vizNode.getChildren()?.[2].data.isPlaceholder).toBe(true);
      });
    });
  });
});
