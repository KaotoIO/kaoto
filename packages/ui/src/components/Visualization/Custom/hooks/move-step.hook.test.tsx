import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { useMoveStep } from './move-step.hook';
import { AddStepMode, IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { getVisualizationNodesFromGraph } from '../../../../utils/get-viznodes-from-graph';
import { getPotentialPath } from '../../../../utils/get-potential-path';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows/camel-route-visual-entity';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { SourceSchemaType } from '../../../../models/camel/source-schema-type';

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
  const vizNode = createVisualizationNode('test', { path: 'route.from.steps.1.to', entity: visualEntity });

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
    <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
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
      mockGetVisualizationNodesFromGraph.mockReturnValue([createVisualizationNode('target', {})]);

      const { result } = renderHook(() => useMoveStep(vizNode, AddStepMode.AppendStep), { wrapper });

      expect(result.current.canBeMoved).toBe(true);
      expect(mockGetPotentialPath).toHaveBeenCalledWith('route.from.steps.1.to', 'forward');
    });

    it('should return true when target node is found for prepend mode', () => {
      mockGetPotentialPath.mockReturnValue('route.from.steps.0');
      mockGetVisualizationNodesFromGraph.mockReturnValue([createVisualizationNode('target', {})]);

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
      const longPathVizNode = createVisualizationNode('longPath', { path: 'route.from.steps.2.choice.when' });
      const shortPathVizNode = createVisualizationNode('shortPath', { path: 'route.from.steps.2.choice' });
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
        getCopiedContent: jest.fn().mockReturnValue(undefined),
        pasteBaseEntityStep: jest.fn(),
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

    it('should call getCopiedContent(), pasteBaseEntityStep() and finally updateEntitiesFromCamelResource()', () => {
      const VizNodeGetCopiedContentSpy = jest
        .spyOn(vizNode, 'getCopiedContent')
        .mockReturnValueOnce(vizNodeCopiedContent);
      const VizNodePasteBaseEntityStepSpy = jest.spyOn(vizNode, 'pasteBaseEntityStep');

      const targetVizNode = {
        getCopiedContent: jest.fn().mockReturnValue(targetVizNodeCopiedContent),
        pasteBaseEntityStep: jest.fn(),
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
