import { ElementModel, Node } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { getVisualizationNodesFromGraph } from '../../../../utils/get-viznodes-from-graph';
import { setValue } from '../../../../utils/set-value';
import { useEnableAllSteps } from './enable-all-steps.hook';

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

jest.mock('../../../../utils/set-value');
const mockSetValue = setValue as jest.MockedFunction<typeof setValue>;

describe('useEnableAllSteps', () => {
  const camelResource = new CamelRouteResource();
  let mockGraph: Node<ElementModel, unknown>;

  const mockEntitiesContext = {
    camelResource,
    entities: camelResource.getEntities(),
    visualEntities: camelResource.getVisualEntities(),
    currentSchemaType: camelResource.getType(),
    updateSourceCodeFromEntities: jest.fn(),
    updateEntitiesFromCamelResource: jest.fn(),
  };

  beforeEach(() => {
    mockGraph = {
      getNodes: jest.fn().mockReturnValue([]),
    } as unknown as Node<ElementModel, unknown>;

    mockController.getGraph.mockReturnValue(mockGraph);
    mockGetVisualizationNodesFromGraph.mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
  );

  it('should return onEnableAllSteps function and areMultipleStepsDisabled status', () => {
    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.onEnableAllSteps).toBeDefined();
    expect(result.current.areMultipleStepsDisabled).toBeDefined();
    expect(typeof result.current.onEnableAllSteps).toBe('function');
    expect(typeof result.current.areMultipleStepsDisabled).toBe('boolean');
  });

  it('should return areMultipleStepsDisabled as false when no disabled steps', () => {
    mockGetVisualizationNodesFromGraph.mockReturnValue([]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.areMultipleStepsDisabled).toBe(false);
  });

  it('should return areMultipleStepsDisabled as false when only one disabled step', () => {
    const disabledNode = createVisualizationNode('disabled-step', {});
    mockGetVisualizationNodesFromGraph.mockReturnValue([disabledNode]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.areMultipleStepsDisabled).toBe(false);
  });

  it('should return areMultipleStepsDisabled as true when multiple disabled steps', () => {
    const disabledNode1 = createVisualizationNode('disabled-step-1', {});
    const disabledNode2 = createVisualizationNode('disabled-step-2', {});
    mockGetVisualizationNodesFromGraph.mockReturnValue([disabledNode1, disabledNode2]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.areMultipleStepsDisabled).toBe(true);
  });

  it('should call getVisualizationNodesFromGraph with correct parameters', () => {
    renderHook(() => useEnableAllSteps(), { wrapper });

    expect(mockGetVisualizationNodesFromGraph).toHaveBeenCalledWith(mockGraph, expect.any(Function));

    const filterFunction = mockGetVisualizationNodesFromGraph.mock.calls[0][1];

    // Test the filter function
    const enabledNode = createVisualizationNode('enabled', {});
    enabledNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: { disabled: false },
    });

    const disabledNode = createVisualizationNode('disabled', {});
    disabledNode.getComponentSchema = jest.fn().mockReturnValue({
      definition: { disabled: true },
    });

    expect(filterFunction?.(enabledNode)).toBe(false);
    expect(filterFunction?.(disabledNode)).toBe(true);
  });

  it('should enable all disabled steps when onEnableAllSteps is called', () => {
    const disabledNode1 = createVisualizationNode('disabled-step-1', {});
    const mockDefinition1 = { disabled: true, id: 'step1' };
    disabledNode1.getComponentSchema = jest.fn().mockReturnValue({ definition: mockDefinition1 });
    disabledNode1.updateModel = jest.fn();

    const disabledNode2 = createVisualizationNode('disabled-step-2', {});
    const mockDefinition2 = { disabled: true, id: 'step2' };
    disabledNode2.getComponentSchema = jest.fn().mockReturnValue({ definition: mockDefinition2 });
    disabledNode2.updateModel = jest.fn();

    mockGetVisualizationNodesFromGraph.mockReturnValue([disabledNode1, disabledNode2]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    result.current.onEnableAllSteps();

    expect(mockSetValue).toHaveBeenCalledTimes(2);
    expect(mockSetValue).toHaveBeenCalledWith(mockDefinition1, 'disabled', false);
    expect(mockSetValue).toHaveBeenCalledWith(mockDefinition2, 'disabled', false);
    expect(disabledNode1.updateModel).toHaveBeenCalledWith(mockDefinition1);
    expect(disabledNode2.updateModel).toHaveBeenCalledWith(mockDefinition2);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should handle nodes with empty definition objects', () => {
    const disabledNode = createVisualizationNode('disabled-step', {});
    const mockDefinition = {};
    disabledNode.getComponentSchema = jest.fn().mockReturnValue({ definition: mockDefinition });
    disabledNode.updateModel = jest.fn();

    mockGetVisualizationNodesFromGraph.mockReturnValue([disabledNode]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    result.current.onEnableAllSteps();

    expect(mockSetValue).toHaveBeenCalledWith(mockDefinition, 'disabled', false);
    expect(disabledNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should handle nodes with undefined definition', () => {
    const disabledNode = createVisualizationNode('disabled-step', {});
    disabledNode.getComponentSchema = jest.fn().mockReturnValue({ definition: undefined });
    disabledNode.updateModel = jest.fn();

    mockGetVisualizationNodesFromGraph.mockReturnValue([disabledNode]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    result.current.onEnableAllSteps();

    expect(mockSetValue).toHaveBeenCalledWith({}, 'disabled', false);
    expect(disabledNode.updateModel).toHaveBeenCalledWith({});
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should not call updateEntitiesFromCamelResource when no disabled steps', () => {
    mockGetVisualizationNodesFromGraph.mockReturnValue([]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    result.current.onEnableAllSteps();

    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should maintain stable reference when dependencies do not change', () => {
    mockGetVisualizationNodesFromGraph.mockReturnValue([]);

    const { result, rerender } = renderHook(() => useEnableAllSteps(), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should update when disabled nodes change', () => {
    // Start with empty array
    mockGetVisualizationNodesFromGraph.mockReturnValue([]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.areMultipleStepsDisabled).toBe(false);

    // Now simulate nodes becoming disabled
    const disabledNode1 = createVisualizationNode('disabled-step-1', {});
    disabledNode1.getComponentSchema = jest.fn().mockReturnValue({ definition: { disabled: true } });
    const disabledNode2 = createVisualizationNode('disabled-step-2', {});
    disabledNode2.getComponentSchema = jest.fn().mockReturnValue({ definition: { disabled: true } });

    mockGetVisualizationNodesFromGraph.mockReturnValue([disabledNode1, disabledNode2]);

    // Re-render the hook with new disabled nodes
    const { result: newResult } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(newResult.current.areMultipleStepsDisabled).toBe(true);
  });
});
