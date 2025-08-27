import type { Controller, ElementModel, Graph, GraphElement, Node } from '@patternfly/react-topology';
import { Dimensions } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { useCollapseStep } from './collapse-step.hook';

describe('useCollapseStep', () => {
  let mockElement: Node<ElementModel, unknown>;
  let mockController: Controller;
  let mockGraph: Graph;

  beforeEach(() => {
    mockGraph = {
      layout: jest.fn(),
    } as unknown as Graph;

    mockController = {
      getGraph: jest.fn().mockReturnValue(mockGraph),
    } as unknown as Controller;

    mockElement = {
      setDimensions: jest.fn(),
      setCollapsed: jest.fn(),
      getController: jest.fn().mockReturnValue(mockController),
      getKind: jest.fn().mockReturnValue('node'),
    } as unknown as Node<ElementModel, unknown>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when element is not a node', () => {
    const nonNodeElement = {
      getKind: jest.fn().mockReturnValue('edge'),
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

  it('should collapse node and set dimensions when onCollapseNode is called', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));

    result.current.onCollapseNode();

    expect(mockElement.setDimensions).toHaveBeenCalledWith(
      new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT),
    );
    expect(mockElement.setCollapsed).toHaveBeenCalledWith(true);
    expect(mockGraph.layout).toHaveBeenCalled();
  });

  it('should expand node without setting dimensions when onExpandNode is called', () => {
    const { result } = renderHook(() => useCollapseStep(mockElement));

    result.current.onExpandNode();

    expect(mockElement.setDimensions).not.toHaveBeenCalled();
    expect(mockElement.setCollapsed).toHaveBeenCalledWith(false);
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
      setDimensions: jest.fn(),
      setCollapsed: jest.fn(),
    };

    rerender({ element: newMockElement });

    expect(result.current).not.toBe(firstResult);
  });
});
