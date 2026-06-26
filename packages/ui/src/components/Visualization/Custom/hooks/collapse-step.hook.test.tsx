import type { Controller, ElementModel, Graph, GraphElement, Node } from '@patternfly/react-topology';
import { Dimensions } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';

import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { useCollapseStep } from './collapse-step.hook';

describe('useCollapseStep', () => {
  let mockElement: Node<ElementModel, unknown>;
  let mockController: Controller;
  let mockGraph: Graph;

  beforeEach(() => {
    mockGraph = {
      layout: vi.fn(),
    } as unknown as Graph;

    mockController = {
      getGraph: vi.fn().mockReturnValue(mockGraph),
      getState: vi.fn().mockReturnValue({ collapsedIds: [] }),
      setState: vi.fn(),
    } as unknown as Controller;

    mockElement = {
      setDimensions: vi.fn(),
      setCollapsed: vi.fn(),
      getController: vi.fn().mockReturnValue(mockController),
      getKind: vi.fn().mockReturnValue('node'),
      getId: vi.fn().mockReturnValue('mock-node-id'),
      getData: vi.fn().mockReturnValue({
        vizNode: {
          getNodeDefinition: vi.fn().mockReturnValue({ id: 'mock-node-id' }),
        },
      }),
    } as unknown as Node<ElementModel, unknown>;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when element is not a node', () => {
    vi.spyOn(console, 'error').mockImplementation(() => null);

    const nonNodeElement = {
      getKind: vi.fn().mockReturnValue('edge'),
    } as unknown as GraphElement<ElementModel, unknown>;

    expect(() => {
      renderHook(() => useCollapseStep(nonNodeElement));
    }).toThrow('useCollapseStep must be used only on Node elements');
  });

  it('should return onExpandNode and onCollapseNode functions', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));

    expect(result.current.onExpandNode).toBeDefined();
    expect(result.current.onCollapseNode).toBeDefined();
    expect(typeof result.current.onExpandNode).toBe('function');
    expect(typeof result.current.onCollapseNode).toBe('function');
  });

  it('should collapse node, set dimensions and update the state when onCollapseNode is called', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));

    result.current.onCollapseNode();

    expect(mockElement.setDimensions).toHaveBeenCalledWith(
      new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT),
    );
    expect(mockElement.setCollapsed).toHaveBeenCalledWith(true);
    expect(mockGraph.layout).toHaveBeenCalled();
    expect(mockElement.getController).toHaveBeenCalled();
    expect(mockController.getState).toHaveBeenCalled();
    expect(mockElement.getData).toHaveBeenCalled();
    expect(mockController.setState).toHaveBeenCalledWith({ collapsedIds: ['mock-node-id'] });
  });

  it('should collapse node, set dimensions and not update the state when the node is already collapsed', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));
    mockController.getState = vi.fn().mockReturnValue({ collapsedIds: ['mock-node-id'] });

    result.current.onCollapseNode();

    expect(mockElement.setDimensions).toHaveBeenCalledWith(
      new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT),
    );
    expect(mockElement.setCollapsed).toHaveBeenCalledWith(true);
    expect(mockGraph.layout).toHaveBeenCalled();
    expect(mockElement.getController).toHaveBeenCalled();
    expect(mockController.getState).toHaveBeenCalled();
    expect(mockElement.getData).toHaveBeenCalled();
    expect(mockController.setState).not.toHaveBeenCalled();
  });

  it('should collapse node, set dimensions and not update state when node id is not found', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));
    mockElement.getData = vi.fn().mockReturnValue(undefined);

    result.current.onCollapseNode();

    expect(mockElement.setDimensions).toHaveBeenCalledWith(
      new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT),
    );
    expect(mockElement.setCollapsed).toHaveBeenCalledWith(true);
    expect(mockGraph.layout).toHaveBeenCalled();
    expect(mockElement.getController).toHaveBeenCalled();
    expect(mockElement.getData).toHaveBeenCalled();
    expect(mockController.getState).not.toHaveBeenCalled();
    expect(mockController.setState).not.toHaveBeenCalled();
  });

  it('should expand node without setting dimensions, but updating the state when onExpandNode is called', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));
    mockController.getState = vi.fn().mockReturnValue({ collapsedIds: ['mock-node-id'] });

    result.current.onExpandNode();

    expect(mockElement.setDimensions).not.toHaveBeenCalled();
    expect(mockElement.setCollapsed).toHaveBeenCalledWith(false);
    expect(mockElement.getController).toHaveBeenCalled();
    expect(mockController.getState).toHaveBeenCalled();
    expect(mockElement.getData).toHaveBeenCalled();
    expect(mockController.setState).toHaveBeenCalledWith({ collapsedIds: [] });
    expect(mockGraph.layout).toHaveBeenCalled();
  });

  it('should maintain stable references when dependencies do not change', () => {
    const { result, rerender } = renderHook(() => useCollapseStep(mockElement));

    const firstResult = result.current;
    rerender();

    expect(result.current).toBe(firstResult);
    expect(result.current.onExpandNode).toBe(firstResult.onExpandNode);
    expect(result.current.onCollapseNode).toBe(firstResult.onCollapseNode);
  });

  it('should update references when element changes', () => {
    const { result, rerender } = renderHook(({ element }) => useCollapseStep(element), {
      initialProps: { element: mockElement },
    });

    const firstResult = result.current;

    const newMockElement = {
      ...mockElement,
      setDimensions: vi.fn(),
      setCollapsed: vi.fn(),
    };

    rerender({ element: newMockElement });

    expect(result.current).not.toBe(firstResult);
  });

  it('should handle multiple collapse operations correctly', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));

    // Collapse the node
    result.current.onCollapseNode();

    expect(mockController.setState).toHaveBeenCalledWith({ collapsedIds: ['mock-node-id'] });

    // Update mock state to reflect the change
    mockController.getState = vi.fn().mockReturnValue({ collapsedIds: ['mock-node-id'] });
    mockController.setState = vi.fn();

    // Try to collapse again - should not update state
    result.current.onCollapseNode();

    expect(mockController.setState).not.toHaveBeenCalled();
  });

  it('should handle expand of non-collapsed node', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));
    mockController.getState = vi.fn().mockReturnValue({ collapsedIds: [] });

    // Expand a node that is not collapsed
    result.current.onExpandNode();

    expect(mockElement.setCollapsed).toHaveBeenCalledWith(false);
    expect(mockController.setState).toHaveBeenCalledWith({ collapsedIds: [] });
    expect(mockGraph.layout).toHaveBeenCalled();
  });

  it('should handle state with multiple collapsed nodes', () => {
    mockController.getState = vi.fn().mockReturnValue({ collapsedIds: ['other-node-1', 'other-node-2'] });

    const { result } = renderHook(() => useCollapseStep(mockElement));

    // Collapse this node - should add to existing collapsed nodes
    result.current.onCollapseNode();

    expect(mockController.setState).toHaveBeenCalledWith({
      collapsedIds: ['other-node-1', 'other-node-2', 'mock-node-id'],
    });
  });

  it('should remove only the target node from collapsed state on expand', () => {
    mockController.getState = vi.fn().mockReturnValue({
      collapsedIds: ['other-node-1', 'mock-node-id', 'other-node-2'],
    });

    const { result } = renderHook(() => useCollapseStep(mockElement));

    // Expand this node - should remove only this node
    result.current.onExpandNode();

    expect(mockController.setState).toHaveBeenCalledWith({
      collapsedIds: ['other-node-1', 'other-node-2'],
    });
  });

  it('should handle rapid collapse and expand operations', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));

    // Rapid collapse
    result.current.onCollapseNode();
    expect(mockElement.setCollapsed).toHaveBeenCalledWith(true);

    // Update state to reflect collapse
    mockController.getState = vi.fn().mockReturnValue({ collapsedIds: ['mock-node-id'] });
    mockController.setState = vi.fn();
    (mockElement.setCollapsed as Mock).mockClear();

    // Rapid expand
    result.current.onExpandNode();
    expect(mockElement.setCollapsed).toHaveBeenCalledWith(false);
    expect(mockController.setState).toHaveBeenCalledWith({ collapsedIds: [] });
  });

  it('should handle elements with no node definition id', () => {
    mockElement.getData = vi.fn().mockReturnValue({
      vizNode: {
        getNodeDefinition: vi.fn().mockReturnValue({}),
      },
    });

    const { result } = renderHook(() => useCollapseStep(mockElement));

    result.current.onCollapseNode();

    expect(mockElement.setCollapsed).toHaveBeenCalledWith(true);
    expect(mockController.setState).not.toHaveBeenCalled();
  });

  it('should preserve immutability when updating collapsed state', () => {
    const initialState = ['node-1', 'node-2'];
    mockController.getState = vi.fn().mockReturnValue({ collapsedIds: initialState });

    const { result } = renderHook(() => useCollapseStep(mockElement));

    result.current.onCollapseNode();

    // Verify the original array was not mutated
    expect(initialState).toEqual(['node-1', 'node-2']);
    expect(mockController.setState).toHaveBeenCalledWith({
      collapsedIds: ['node-1', 'node-2', 'mock-node-id'],
    });
  });
});
