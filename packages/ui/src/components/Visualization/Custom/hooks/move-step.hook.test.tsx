import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CatalogKind } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows/camel-route-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { camelRouteJson, camelRouteJsonWithDM } from '../../../../stubs/camel-route';
import { getPotentialPath } from '../../../../utils/get-potential-path';
import { getVisualizationNodesFromGraph } from '../../../../utils/get-viznodes-from-graph';
import { NodeInteractionAddonProvider } from '../../../registers/interactions/node-interaction-addon.provider';
import { RegisterNodeInteractionAddons } from '../../../registers/RegisterNodeInteractionAddons';
import { useMoveStep } from './move-step.hook';

const mockController = {
  getGraph: jest.fn(),
};

jest.mock('@patternfly/react-topology', () => ({
  useVisualizationController: () => mockController,
}));

jest.mock('../../../../utils/get-viznodes-from-graph');
const mockGetVisualizationNodesFromGraph = getVisualizationNodesFromGraph as jest.MockedFunction<
  typeof getVisualizationNodesFromGraph
>;

jest.mock('../../../../utils/get-potential-path');
const mockGetPotentialPath = getPotentialPath as jest.MockedFunction<typeof getPotentialPath>;

describe('useMoveStep', () => {
  const visualEntity = new CamelRouteVisualEntity(camelRouteJson);
  const vizNode = createVisualizationNode('test', {
    catalogKind: CatalogKind.Processor,
    name: 'to',
    path: 'route.from.steps.1.to',
    entity: visualEntity,
  });

  const camelResource = new CamelRouteResource();
  const mockEntitiesContext = {
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: jest.fn(),
    updateEntitiesFromCamelResource: jest.fn(),
  };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <NodeInteractionAddonProvider>
      <RegisterNodeInteractionAddons>
        <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
      </RegisterNodeInteractionAddons>
    </NodeInteractionAddonProvider>
  );

  const vizNodeCopiedContent = {
    type: SourceSchemaType.Route,
    name: 'exampleVizNode',
    definition: { id: 'vizNode', Parameters: 'testParameters' },
  };

  const targetVizNodeCopiedContent = {
    type: SourceSchemaType.Route,
    name: 'exampleTargetVizNode',
    definition: { id: 'targetVizNode', type: 'testExampleType' },
  };

  beforeEach(() => {
    jest.spyOn(vizNode, 'getNodeDefinition').mockReturnValue({ id: 'testSchema' });
    jest.clearAllMocks();
  });

  it('should maintain stable reference when dependencies do not change', () => {
    mockGetPotentialPath.mockReturnValue(undefined);

    const { result, rerender } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), {
      wrapper,
    });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  describe('canBeMoved logic', () => {
    it('should return true when target node is found for append mode', () => {
      mockGetPotentialPath.mockReturnValue('route.from.steps.2');
      mockGetVisualizationNodesFromGraph.mockReturnValue([
        createVisualizationNode('target', { catalogKind: CatalogKind.Processor, name: 'target' }),
      ]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(true);
      expect(mockGetPotentialPath).toHaveBeenCalledWith('route.from.steps.1.to', 'forward');
    });

    it('should return false when target node is found for append mode but is a placeholder node', () => {
      mockGetPotentialPath.mockReturnValue('route.from.steps.2');
      mockGetVisualizationNodesFromGraph.mockReturnValue([
        createVisualizationNode('target', { catalogKind: CatalogKind.Processor, name: 'target', isPlaceholder: true }),
      ]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(false);
      expect(mockGetPotentialPath).toHaveBeenCalledWith('route.from.steps.1.to', 'forward');
    });

    it('should return true when target node is found for prepend mode', () => {
      mockGetPotentialPath.mockReturnValue('route.from.steps.0');
      mockGetVisualizationNodesFromGraph.mockReturnValue([
        createVisualizationNode('target', { catalogKind: CatalogKind.Processor, name: 'target' }),
      ]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.PrependStep), { wrapper });

      expect(result.current.canBeMoved).toBe(true);
      expect(mockGetPotentialPath).toHaveBeenCalledWith('route.from.steps.1.to', 'backward');
    });

    it('should return false when no potential path is found', () => {
      mockGetPotentialPath.mockReturnValue(undefined);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(false);
    });

    it('should return false when no matching nodes are found', () => {
      mockGetPotentialPath.mockReturnValue('route.from.steps.2');
      mockGetVisualizationNodesFromGraph.mockReturnValue([]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(false);
    });

    it('should find shortest path when multiple nodes match', () => {
      const longPathVizNode = createVisualizationNode('longPath', {
        catalogKind: CatalogKind.Processor,
        name: 'when',
        path: 'route.from.steps.2.choice.when',
      });
      const shortPathVizNode = createVisualizationNode('shortPath', {
        catalogKind: CatalogKind.Processor,
        name: 'choice',
        path: 'route.from.steps.2.choice',
      });
      const longPathVizNodeSpy = jest.spyOn(longPathVizNode, 'getCopiedContent');
      const shortPathVizNodeSpy = jest.spyOn(shortPathVizNode, 'getCopiedContent');

      mockGetPotentialPath.mockReturnValue('route.from.steps.2');
      mockGetVisualizationNodesFromGraph.mockReturnValue([longPathVizNode, shortPathVizNode]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });
      result.current.onMoveStep();

      // shortPathVizNode.getCopiedContent() call indicates that it was chosen as the target node
      expect(shortPathVizNodeSpy).toHaveBeenCalled();
      expect(longPathVizNodeSpy).not.toHaveBeenCalled();
    });
  });

  describe('onMoveStep functionality', () => {
    it('should return without calling pasteBaseEntityStep() and updateEntitiesFromCamelResource()', () => {
      const VizNodeGetCopiedContentSpy = jest
        .spyOn(vizNode, 'getCopiedContent')
        .mockReturnValueOnce(vizNodeCopiedContent);
      const VizNodePasteBaseEntityStepSpy = jest.spyOn(vizNode, 'pasteBaseEntityStep');

      const targetVizNode = {
        data: {},
        getCopiedContent: jest.fn().mockReturnValue(undefined),
        pasteBaseEntityStep: jest.fn(),
        getNodeDefinition: jest.fn().mockReturnValue({ id: 'test' }),
      } as unknown as IVisualizationNode;

      mockGetPotentialPath.mockReturnValue('route.from.steps.2');
      mockGetVisualizationNodesFromGraph.mockReturnValue([targetVizNode]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });
      result.current.onMoveStep();

      expect(VizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(targetVizNode.getCopiedContent).toHaveBeenCalledTimes(1);

      expect(VizNodePasteBaseEntityStepSpy).not.toHaveBeenCalled();
      expect(targetVizNode.pasteBaseEntityStep).not.toHaveBeenCalled();

      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).not.toHaveBeenCalled();
    });

    it('should call getCopiedContent(), processOnCopyAddon(), pasteBaseEntityStep() and finally updateEntitiesFromCamelResource() in case of datamapper step', () => {
      const visualEntity = new CamelRouteVisualEntity(camelRouteJsonWithDM);
      const dataMapperVizNode = createVisualizationNode('test-DM', {
        catalogKind: CatalogKind.Processor,
        name: 'step',
        path: 'route.from.steps.0.step',
        entity: visualEntity,
        isPlaceholder: false,
      });

      const dataMapperVizNodeCopiedContent = {
        type: 'Route',
        name: 'kaoto-datamapper',
        definition: {
          id: 'kaoto-datamapper-657b6637',
          steps: [
            {
              to: {
                id: 'kaoto-datamapper-xslt-3158',
                uri: 'xslt-saxon',
                parameters: {
                  failOnNullBody: false,
                },
              },
            },
          ],
        },
      };

      const dataMapperUpdatedVizNodeCopiedContent = {
        type: 'Route',
        name: 'step',
        definition: {
          id: 'kaoto-datamapper-657b6637',
          steps: [
            {
              to: {
                id: 'kaoto-datamapper-xslt-3158',
                uri: 'xslt-saxon',
                parameters: {
                  failOnNullBody: false,
                },
              },
            },
          ],
        },
      };

      const dataMapperVizNodeGetCopiedContentSpy = jest.spyOn(dataMapperVizNode, 'getCopiedContent');
      const dataMapperVizNodePasteBaseEntityStepSpy = jest.spyOn(dataMapperVizNode, 'pasteBaseEntityStep');

      const targetVizNode = {
        data: {},
        getCopiedContent: jest.fn().mockReturnValue(targetVizNodeCopiedContent),
        pasteBaseEntityStep: jest.fn(),
        getNodeDefinition: jest.fn().mockReturnValue({ id: 'test' }),
      } as unknown as IVisualizationNode;

      mockGetPotentialPath.mockReturnValue('route.from.steps.1');
      mockGetVisualizationNodesFromGraph.mockReturnValue([targetVizNode]);

      const { result } = renderHook(() => useMoveStep(dataMapperVizNode, AddStepMode.AppendStep), { wrapper });
      result.current.onMoveStep();

      expect(dataMapperVizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(dataMapperVizNodeGetCopiedContentSpy).toHaveReturnedWith(dataMapperVizNodeCopiedContent);
      expect(targetVizNode.getCopiedContent).toHaveBeenCalledTimes(1);

      expect(dataMapperVizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(targetVizNode.pasteBaseEntityStep).toHaveBeenCalledWith(
        dataMapperUpdatedVizNodeCopiedContent,
        AddStepMode.ReplaceStep,
      );

      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
    });

    it('should call getCopiedContent(), pasteBaseEntityStep() and finally updateEntitiesFromCamelResource()', () => {
      const VizNodeGetCopiedContentSpy = jest
        .spyOn(vizNode, 'getCopiedContent')
        .mockReturnValueOnce(vizNodeCopiedContent);
      const VizNodePasteBaseEntityStepSpy = jest.spyOn(vizNode, 'pasteBaseEntityStep');

      const targetVizNode = {
        data: {},
        getCopiedContent: jest.fn().mockReturnValue(targetVizNodeCopiedContent),
        pasteBaseEntityStep: jest.fn(),
        getNodeDefinition: jest.fn().mockReturnValue({ id: 'test' }),
      } as unknown as IVisualizationNode;

      mockGetPotentialPath.mockReturnValue('route.from.steps.2');
      mockGetVisualizationNodesFromGraph.mockReturnValue([targetVizNode]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });
      result.current.onMoveStep();

      expect(VizNodeGetCopiedContentSpy).toHaveBeenCalledTimes(1);
      expect(targetVizNode.getCopiedContent).toHaveBeenCalledTimes(1);

      expect(VizNodePasteBaseEntityStepSpy).toHaveBeenCalledTimes(1);
      expect(targetVizNode.pasteBaseEntityStep).toHaveBeenCalledTimes(1);

      expect(mockEntitiesContext.updateEntitiesFromCamelResource as jest.Mock).toHaveBeenCalledTimes(1);
    });
  });
});
