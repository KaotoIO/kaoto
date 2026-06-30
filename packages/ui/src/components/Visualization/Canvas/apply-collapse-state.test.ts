import type { Controller } from '@patternfly/react-topology';
import { Dimensions, ModelKind } from '@patternfly/react-topology';
import type { Mock } from 'vitest';

import { applyCollapseState } from './apply-collapse-state';
import { CanvasDefaults } from './canvas.defaults';
import { COLLAPSE_STATE } from './collapse-handler-state';

const createMockNode = (nodeId: string, setCollapsed: Mock, setDimensions: Mock) => ({
  getKind: () => ModelKind.node,
  getData: () => ({ vizNode: { getNodeDefinition: () => ({ id: nodeId }) } }),
  setCollapsed,
  setDimensions,
});

describe('applyCollapseState', () => {
  it('does nothing when collapsedIds is undefined', () => {
    const setCollapsed = vi.fn();
    const setDimensions = vi.fn();
    const mockNode = createMockNode('node-1', setCollapsed, setDimensions);
    const controller = {
      getState: vi.fn().mockReturnValue({}),
      getElements: vi.fn().mockReturnValue([mockNode]),
    } as unknown as Controller;

    applyCollapseState(controller);

    expect(controller.getState).toHaveBeenCalled();
    expect(setCollapsed).not.toHaveBeenCalled();
    expect(setDimensions).not.toHaveBeenCalled();
  });

  it('does nothing when collapsedIds is empty', () => {
    const setCollapsed = vi.fn();
    const setDimensions = vi.fn();
    const mockNode = createMockNode('node-1', setCollapsed, setDimensions);
    const controller = {
      getState: vi.fn().mockReturnValue({ [COLLAPSE_STATE]: [] }),
      getElements: vi.fn().mockReturnValue([mockNode]),
    } as unknown as Controller;

    applyCollapseState(controller);

    expect(setCollapsed).not.toHaveBeenCalled();
    expect(setDimensions).not.toHaveBeenCalled();
  });

  it('calls setCollapsed and setDimensions for each matching node', () => {
    const setCollapsed1 = vi.fn();
    const setDimensions1 = vi.fn();
    const setCollapsed2 = vi.fn();
    const setDimensions2 = vi.fn();
    const setCollapsed3 = vi.fn();
    const setDimensions3 = vi.fn();
    const node1 = createMockNode('choice-1', setCollapsed1, setDimensions1);
    const node2 = createMockNode('choice-2', setCollapsed2, setDimensions2);
    const node3 = createMockNode('choice-3', setCollapsed3, setDimensions3);
    const controller = {
      getState: vi.fn().mockReturnValue({ [COLLAPSE_STATE]: ['choice-1', 'choice-3'] }),
      getElements: vi.fn().mockReturnValue([node1, node2, node3]),
    } as unknown as Controller;

    applyCollapseState(controller);

    // Node 1 should be collapsed
    expect(setCollapsed1).toHaveBeenCalledWith(true);
    expect(setDimensions1).toHaveBeenCalledWith(
      new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT),
    );
    // Node 2 should not be collapsed
    expect(setCollapsed2).not.toHaveBeenCalled();
    expect(setDimensions2).not.toHaveBeenCalled();
    // Node 3 should be collapsed
    expect(setCollapsed3).toHaveBeenCalledWith(true);
    expect(setDimensions3).toHaveBeenCalledWith(
      new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT),
    );
  });

  it('handles nodes without vizNode data gracefully', () => {
    const setCollapsed = vi.fn();
    const setDimensions = vi.fn();
    const mockNode = {
      getKind: () => ModelKind.node,
      getData: () => ({ vizNode: null }),
      setCollapsed,
      setDimensions,
    };

    const controller = {
      getState: vi.fn().mockReturnValue({ [COLLAPSE_STATE]: ['node-1'] }),
      getElements: vi.fn().mockReturnValue([mockNode]),
    } as unknown as Controller;

    applyCollapseState(controller);

    expect(setCollapsed).not.toHaveBeenCalled();
    expect(setDimensions).not.toHaveBeenCalled();
  });

  it('handles nodes without valid node id', () => {
    const setCollapsed = vi.fn();
    const setDimensions = vi.fn();
    const mockNode = {
      getKind: () => ModelKind.node,
      getData: () => ({ vizNode: { getNodeDefinition: () => ({ id: undefined }) } }),
      setCollapsed,
      setDimensions,
    };

    const controller = {
      getState: vi.fn().mockReturnValue({ [COLLAPSE_STATE]: ['node-1'] }),
      getElements: vi.fn().mockReturnValue([mockNode]),
    } as unknown as Controller;

    applyCollapseState(controller);

    expect(setCollapsed).not.toHaveBeenCalled();
    expect(setDimensions).not.toHaveBeenCalled();
  });

  it('filters out non-node elements', () => {
    const setCollapsed = vi.fn();
    const setDimensions = vi.fn();
    const mockNode = createMockNode('choice-1', setCollapsed, setDimensions);
    const mockEdge = {
      getKind: () => ModelKind.edge,
      getData: () => ({ vizNode: { getNodeDefinition: () => ({ id: 'edge-1' }) } }),
    };

    const controller = {
      getState: vi.fn().mockReturnValue({ [COLLAPSE_STATE]: ['choice-1', 'edge-1'] }),
      getElements: vi.fn().mockReturnValue([mockNode, mockEdge]),
    } as unknown as Controller;

    applyCollapseState(controller);

    // Only the node should be processed
    expect(setCollapsed).toHaveBeenCalledWith(true);
    expect(setDimensions).toHaveBeenCalledWith(
      new Dimensions(CanvasDefaults.DEFAULT_NODE_WIDTH, CanvasDefaults.DEFAULT_NODE_HEIGHT),
    );
  });

  it('handles duplicate ids in collapsedIds array', () => {
    const setCollapsed = vi.fn();
    const setDimensions = vi.fn();
    const node = createMockNode('choice-1', setCollapsed, setDimensions);

    const controller = {
      getState: vi.fn().mockReturnValue({ [COLLAPSE_STATE]: ['choice-1', 'choice-1', 'choice-1'] }),
      getElements: vi.fn().mockReturnValue([node]),
    } as unknown as Controller;

    applyCollapseState(controller);

    // Should be called multiple times (once per occurrence in array)
    expect(setCollapsed).toHaveBeenCalledTimes(3);
    expect(setDimensions).toHaveBeenCalledTimes(3);
    expect(setCollapsed).toHaveBeenCalledWith(true);
  });

  it('handles empty controller elements array', () => {
    const controller = {
      getState: vi.fn().mockReturnValue({ [COLLAPSE_STATE]: ['choice-1'] }),
      getElements: vi.fn().mockReturnValue([]),
    } as unknown as Controller;

    // Should not throw
    expect(() => {
      applyCollapseState(controller);
    }).not.toThrow();
    expect(controller.getElements).toHaveBeenCalled();
  });

  it('handles null or undefined node data', () => {
    const setCollapsed = vi.fn();
    const setDimensions = vi.fn();
    const mockNode = {
      getKind: () => ModelKind.node,
      getData: () => null,
      setCollapsed,
      setDimensions,
    };

    const controller = {
      getState: vi.fn().mockReturnValue({ [COLLAPSE_STATE]: ['node-1'] }),
      getElements: vi.fn().mockReturnValue([mockNode]),
    } as unknown as Controller;

    applyCollapseState(controller);

    expect(setCollapsed).not.toHaveBeenCalled();
    expect(setDimensions).not.toHaveBeenCalled();
  });
});
