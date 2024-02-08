import { ProcessorDefinition, RouteDefinition } from '@kaoto-next/camel-catalog/types';
import { ICamelElementLookupResult } from './camel-component-types';
import { CamelStepsService } from './camel-steps.service';

describe('CamelStepsService', () => {
  let path: string;
  let componentLookup: ICamelElementLookupResult;
  let entityDefinition: unknown;

  beforeEach(() => {
    path = 'from';
    componentLookup = {
      processorName: 'from' as keyof ProcessorDefinition,
      componentName: 'timer:timerName',
    };
    entityDefinition = { uri: 'timer:timerName', steps: [] };
  });

  describe('getVizNodeFromProcessor', () => {
    it('should return a VisualizationNode', () => {
      const vizNode = CamelStepsService.getVizNodeFromProcessor(path, componentLookup, entityDefinition);

      expect(vizNode).toBeDefined();
      expect(vizNode.data).toMatchObject({
        path,
        icon: expect.any(String),
        processorName: 'from',
        componentName: 'timer:timerName',
      });
    });

    it('should return a VisualizationNode with children', () => {
      const routeDefinition: RouteDefinition = {
        from: {
          uri: 'timer:timerName',
          steps: [{ log: 'logName' }, { to: 'direct:anotherRoute' }],
        },
      };

      const vizNode = CamelStepsService.getVizNodeFromProcessor(path, componentLookup, routeDefinition);
      expect(vizNode.getChildren()).toHaveLength(2);
      expect(vizNode.getChildren()?.[0].data.path).toBe('from.steps.0.log');
      expect(vizNode.getChildren()?.[1].data.path).toBe('from.steps.1.to');
    });

    it('should return a VisualizationNode with special children', () => {
      const routeDefinition: RouteDefinition = {
        from: {
          uri: 'timer:timerName',
          steps: [
            {
              choice: {
                when: [
                  { expression: { simple: { expression: '${body} == 1' } } },
                  { expression: { simple: { expression: '${body} == 2' } } },
                ],
                otherwise: { steps: [{ log: 'logName' }] },
              },
            },
          ],
        },
      };

      const vizNode = CamelStepsService.getVizNodeFromProcessor(path, componentLookup, routeDefinition);
      expect(vizNode.getChildren()).toHaveLength(1);
      expect(vizNode.getChildren()?.[0].data.path).toBe('from.steps.0.choice');

      const choiceNode = vizNode.getChildren()?.[0];
      expect(choiceNode?.getChildren()).toHaveLength(3);
      expect(choiceNode?.getChildren()?.[0].data.path).toBe('from.steps.0.choice.when.0');
      expect(choiceNode?.getChildren()?.[1].data.path).toBe('from.steps.0.choice.when.1');
      expect(choiceNode?.getChildren()?.[2].data.path).toBe('from.steps.0.choice.otherwise');
    });
  });
});
