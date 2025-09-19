import { renderHook, act } from '@testing-library/react';
import hotkeys from 'hotkeys-js';
import useDeleteHotkey from './delete-hotkey.hook';
import { useDeleteStep } from './delete-step.hook';
import { useDeleteGroup } from './delete-group.hook';
import { IVisualizationNode } from '../../../../models';

// Mock hotkeys-js
jest.mock('hotkeys-js', () => {
  const mockHotkeys = jest.fn();
  const mockUnbind = jest.fn();
  Object.assign(mockHotkeys, { unbind: mockUnbind });
  return mockHotkeys;
});

const mockHotkeys = hotkeys as jest.MockedFunction<typeof hotkeys>;

jest.mock('./delete-step.hook', () => ({
  useDeleteStep: jest.fn(),
}));

jest.mock('./delete-group.hook', () => ({
  useDeleteGroup: jest.fn(),
}));

// Helper to create fake node
function makeNode({ canRemoveStep = false, canRemoveFlow = false } = {}) {
  return {
    getNodeInteraction: () => ({ canRemoveStep, canRemoveFlow }),
  } as unknown as IVisualizationNode;
}

describe('useDeleteHotkey', () => {
  let clearSelected: jest.Mock;
  let onDeleteStep: jest.Mock;
  let onDeleteGroup: jest.Mock;

  beforeEach(() => {
    clearSelected = jest.fn();
    onDeleteStep = jest.fn();
    onDeleteGroup = jest.fn();

    (useDeleteStep as jest.Mock).mockReturnValue({ onDeleteStep });
    (useDeleteGroup as jest.Mock).mockReturnValue({ onDeleteGroup });

    jest.clearAllMocks();
  });

  // Small helper for tests
  function setupHotkey(node?: IVisualizationNode) {
    let capturedHandler;
    mockHotkeys.mockImplementation((_keys, handler) => {
      capturedHandler = handler;
    });

    renderHook(() => useDeleteHotkey(node, clearSelected));
    return capturedHandler!;
  }

  it('should bind and unbind hotkeys on mount/unmount', () => {
    const { unmount } = renderHook(() => useDeleteHotkey(undefined, clearSelected));

    expect(mockHotkeys).toHaveBeenCalledWith('Delete, backspace', expect.any(Function));

    unmount();
    expect(mockHotkeys.unbind).toHaveBeenCalledWith('Delete, backspace');
  });

  it('should do nothing if no node selected', () => {
    const handler = setupHotkey(undefined);

    const preventDefault = jest.fn();
    act(() => handler({ preventDefault }));

    expect(onDeleteStep).not.toHaveBeenCalled();
    expect(onDeleteGroup).not.toHaveBeenCalled();
    expect(clearSelected).not.toHaveBeenCalled();
  });

  it('should call onDeleteStep and clearSelected when canRemoveStep=true', () => {
    const handler = setupHotkey(makeNode({ canRemoveStep: true }));

    const preventDefault = jest.fn();
    act(() => handler({ preventDefault }));

    expect(onDeleteStep).toHaveBeenCalled();
    expect(onDeleteGroup).not.toHaveBeenCalled();
    expect(clearSelected).toHaveBeenCalled();
  });

  it('should call onDeleteGroup and clearSelected when canRemoveFlow=true', () => {
    const handler = setupHotkey(makeNode({ canRemoveFlow: true }));

    const preventDefault = jest.fn();
    act(() => handler({ preventDefault }));

    expect(onDeleteStep).not.toHaveBeenCalled();
    expect(onDeleteGroup).toHaveBeenCalled();
    expect(clearSelected).toHaveBeenCalled();
  });

  it('should do nothing when node cannot be removed', () => {
    const handler = setupHotkey(makeNode({ canRemoveStep: false, canRemoveFlow: false }));

    const preventDefault = jest.fn();
    act(() => handler({ preventDefault }));

    expect(onDeleteStep).not.toHaveBeenCalled();
    expect(onDeleteGroup).not.toHaveBeenCalled();
    expect(clearSelected).not.toHaveBeenCalled();
  });

  it('should call preventDefault on event', () => {
    const handler = setupHotkey(makeNode({ canRemoveStep: true }));

    const preventDefault = jest.fn();
    act(() => handler({ preventDefault }));

    expect(preventDefault).toHaveBeenCalled();
  });
});
