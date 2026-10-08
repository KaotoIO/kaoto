import { Model, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { EntityType } from '../../../../models/entities';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { createVisualizationNode } from '../../../../models/visualization/visualization-node';
import { EntitiesContext, EntitiesContextResult } from '../../../../providers/entities.provider';
import { createMockEntitiesContext } from '../../../../stubs';
import { useEnableAllSteps } from './enable-all-steps.hook';

/** Creates a visualization node whose definition is the given one */
const createStepNode = (id: string, definition?: Record<string, unknown>): IVisualizationNode => {
  const vizNode: IVisualizationNode = createVisualizationNode(id, {
    name: EntityType.Route,
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
  });
  vizNode.data.definition = definition;

  return vizNode;
};

/** Builds the canvas nodes holding the given visualization nodes */
const toCanvasNodes = (vizNodes: IVisualizationNode[]): Model['nodes'] =>
  vizNodes.map((vizNode, index) => ({ id: `node-${index}`, type: 'node', data: { vizNode } }));

describe('useEnableAllSteps', () => {
  const camelResource = new CamelRouteResource();
  let controller: Visualization;
  let mockEntitiesContext: EntitiesContextResult;

  beforeAll(async () => {
    mockEntitiesContext = await createMockEntitiesContext(camelResource);
  });

  /** Fills the real topology controller graph with the given visualization nodes */
  const setGraphNodes = (vizNodes: IVisualizationNode[]) => {
    controller.fromModel({ graph: { id: 'graph', type: 'graph' }, nodes: toCanvasNodes(vizNodes) }, false);
  };

  beforeEach(() => {
    controller = new Visualization();
    setGraphNodes([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <VisualizationProvider controller={controller}>
      <EntitiesContext.Provider value={mockEntitiesContext}>{children}</EntitiesContext.Provider>
    </VisualizationProvider>
  );

  it('should return onEnableAllSteps function and areMultipleStepsDisabled status', () => {
    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.onEnableAllSteps).toBeDefined();
    expect(result.current.areMultipleStepsDisabled).toBeDefined();
    expect(typeof result.current.onEnableAllSteps).toBe('function');
    expect(typeof result.current.areMultipleStepsDisabled).toBe('boolean');
  });

  it('should return areMultipleStepsDisabled as false when no disabled steps', () => {
    setGraphNodes([createStepNode('enabled-step', { disabled: false })]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.areMultipleStepsDisabled).toBe(false);
  });

  it('should return areMultipleStepsDisabled as false when only one disabled step', () => {
    setGraphNodes([createStepNode('disabled-step', { disabled: true })]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.areMultipleStepsDisabled).toBe(false);
  });

  it('should return areMultipleStepsDisabled as true when multiple disabled steps', () => {
    setGraphNodes([
      createStepNode('disabled-step-1', { disabled: true }),
      createStepNode('disabled-step-2', { disabled: true }),
    ]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.areMultipleStepsDisabled).toBe(true);
  });

  it('should call getVisualizationNodesFromGraph with correct parameters', () => {
    const enabledNode = createStepNode('enabled', { disabled: false });
    const disabledNode = createStepNode('disabled', { disabled: true });
    vi.spyOn(enabledNode, 'updateModel').mockImplementation(() => {});
    vi.spyOn(disabledNode, 'updateModel').mockImplementation(() => {});
    setGraphNodes([enabledNode, disabledNode]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    act(() => {
      result.current.onEnableAllSteps();
    });

    /* Only the nodes of the controller graph whose definition is disabled are collected */
    expect(enabledNode.updateModel).not.toHaveBeenCalled();
    expect(disabledNode.updateModel).toHaveBeenCalledWith({ disabled: false });
  });

  it('should enable all disabled steps when onEnableAllSteps is called', () => {
    const mockDefinition1 = { disabled: true, id: 'step1' };
    const disabledNode1 = createStepNode('disabled-step-1', mockDefinition1);
    vi.spyOn(disabledNode1, 'updateModel').mockImplementation(() => {});

    const mockDefinition2 = { disabled: true, id: 'step2' };
    const disabledNode2 = createStepNode('disabled-step-2', mockDefinition2);
    vi.spyOn(disabledNode2, 'updateModel').mockImplementation(() => {});

    setGraphNodes([disabledNode1, disabledNode2]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    act(() => {
      result.current.onEnableAllSteps();
    });

    expect(mockDefinition1).toEqual({ disabled: false, id: 'step1' });
    expect(mockDefinition2).toEqual({ disabled: false, id: 'step2' });
    expect(disabledNode1.updateModel).toHaveBeenCalledWith(mockDefinition1);
    expect(disabledNode2.updateModel).toHaveBeenCalledWith(mockDefinition2);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should handle nodes with empty definition objects', () => {
    const disabledNode = createStepNode('disabled-step', { disabled: true });
    vi.spyOn(disabledNode, 'updateModel').mockImplementation(() => {});
    setGraphNodes([disabledNode]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    /* The definition changes after the disabled nodes were collected */
    const mockDefinition = {};
    disabledNode.data.definition = mockDefinition;

    act(() => {
      result.current.onEnableAllSteps();
    });

    expect(mockDefinition).toEqual({ disabled: false });
    expect(disabledNode.updateModel).toHaveBeenCalledWith(mockDefinition);
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should handle nodes with undefined definition', () => {
    const disabledNode = createStepNode('disabled-step', { disabled: true });
    vi.spyOn(disabledNode, 'updateModel').mockImplementation(() => {});
    setGraphNodes([disabledNode]);

    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    /* The definition is removed after the disabled nodes were collected */
    disabledNode.data.definition = undefined;

    act(() => {
      result.current.onEnableAllSteps();
    });

    expect(disabledNode.updateModel).toHaveBeenCalledWith({ disabled: false });
    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should not call updateEntitiesFromCamelResource when no disabled steps', () => {
    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    result.current.onEnableAllSteps();

    expect(mockEntitiesContext.updateEntitiesFromCamelResource).toHaveBeenCalled();
  });

  it('should maintain stable reference when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useEnableAllSteps(), { wrapper });

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
  });

  it('should update when disabled nodes change', () => {
    // Start with an empty graph
    const { result } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(result.current.areMultipleStepsDisabled).toBe(false);

    // Now simulate nodes becoming disabled
    setGraphNodes([
      createStepNode('disabled-step-1', { disabled: true }),
      createStepNode('disabled-step-2', { disabled: true }),
    ]);

    // Re-render the hook with new disabled nodes
    const { result: newResult } = renderHook(() => useEnableAllSteps(), { wrapper });

    expect(newResult.current.areMultipleStepsDisabled).toBe(true);
  });
});
