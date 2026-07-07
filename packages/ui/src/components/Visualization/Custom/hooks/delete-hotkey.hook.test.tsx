import { act, renderHook } from '@testing-library/react';
import hotkeys from 'hotkeys-js';
import type { Mock } from 'vitest';

import { IVisualizationNode } from '../../../../models';
import { useDeleteGroup } from './delete-group.hook';
import useDeleteHotkey from './delete-hotkey.hook';
import { useDeleteStep } from './delete-step.hook';

// Mock hotkeys-js
vi.mock('hotkeys-js', () => {
  const mockHotkeys = vi.fn();
  const mockUnbind = vi.fn();
  Object.assign(mockHotkeys, { unbind: mockUnbind });
  return {
    __esModule: true,
    default: mockHotkeys,
  };
});

const mockHotkeys = hotkeys as MockedFunction<typeof hotkeys>;

vi.mock('./delete-step.hook', () => ({
  useDeleteStep: vi.fn(),
}));

vi.mock('./delete-group.hook', () => ({
  useDeleteGroup: vi.fn(),
}));

// Helper to create fake node
function makeNode({ canRemoveStep = false, canRemoveFlow = false } = {}) {
  return {
    getNodeInteraction: () => ({ canRemoveStep, canRemoveFlow }),
  } as unknown as IVisualizationNode;
}

describe('useDeleteHotkey', () => {
  let clearSelected: Mock;
  let onDeleteStep: Mock;
  let onDeleteGroup: Mock;

  beforeEach(() => {
    clearSelected = vi.fn();
    onDeleteStep = vi.fn();
    onDeleteGroup = vi.fn();

    (useDeleteStep as Mock).mockReturnValue({ onDeleteStep });
    (useDeleteGroup as Mock).mockReturnValue({ onDeleteGroup });

    vi.clearAllMocks();
  });

  // Small helper for tests
  function setupHotkey(node?: IVisualizationNode) {
    let capturedHandler: ((event: KeyboardEvent) => void) | undefined;
    mockHotkeys.mockImplementation((_keys: string, handler: (event: KeyboardEvent) => void) => {
      capturedHandler = handler;
    });

    renderHook(() => {
      useDeleteHotkey(node, clearSelected);
    });
    return capturedHandler!;
  }

  it('should bind and unbind hotkeys on mount/unmount', () => {
    const { unmount } = renderHook(() => {
      useDeleteHotkey(undefined, clearSelected);
    });

    expect(mockHotkeys).toHaveBeenCalledWith('Delete, backspace', expect.any(Function));

    unmount();
    expect(mockHotkeys.unbind).toHaveBeenCalledWith('Delete, backspace');
  });

  it('should do nothing if no node selected', async () => {
    const handler = setupHotkey(undefined);

    const preventDefault = vi.fn();
    await act(async () => {
      handler({ preventDefault } as unknown as KeyboardEvent);
    });

    expect(onDeleteStep).not.toHaveBeenCalled();
    expect(onDeleteGroup).not.toHaveBeenCalled();
    expect(clearSelected).not.toHaveBeenCalled();
  });

  it('should call onDeleteStep and clearSelected when canRemoveStep=true', async () => {
    const handler = setupHotkey(makeNode({ canRemoveStep: true }));

    const preventDefault = vi.fn();
    await act(async () => {
      handler({ preventDefault } as unknown as KeyboardEvent);
    });

    expect(onDeleteStep).toHaveBeenCalled();
    expect(onDeleteGroup).not.toHaveBeenCalled();
    expect(clearSelected).toHaveBeenCalled();
  });

  it('should call onDeleteGroup and clearSelected when canRemoveFlow=true', async () => {
    const handler = setupHotkey(makeNode({ canRemoveFlow: true }));

    const preventDefault = vi.fn();
    await act(async () => {
      handler({ preventDefault } as unknown as KeyboardEvent);
    });

    expect(onDeleteStep).not.toHaveBeenCalled();
    expect(onDeleteGroup).toHaveBeenCalled();
    expect(clearSelected).toHaveBeenCalled();
  });

  it('should do nothing when node cannot be removed', async () => {
    const handler = setupHotkey(makeNode({ canRemoveStep: false, canRemoveFlow: false }));

    const preventDefault = vi.fn();
    await act(async () => {
      handler({ preventDefault } as unknown as KeyboardEvent);
    });

    expect(onDeleteStep).not.toHaveBeenCalled();
    expect(onDeleteGroup).not.toHaveBeenCalled();
    expect(clearSelected).not.toHaveBeenCalled();
  });

  it('should call preventDefault on event', async () => {
    const handler = setupHotkey(makeNode({ canRemoveStep: true }));

    const preventDefault = vi.fn();
    await act(async () => {
      handler({ preventDefault } as unknown as KeyboardEvent);
    });

    expect(preventDefault).toHaveBeenCalled();
  });

  it('logs the error and does not clear the selection when deletion fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    onDeleteStep.mockRejectedValue(new Error('delete boom'));
    const handler = setupHotkey(makeNode({ canRemoveStep: true }));

    const preventDefault = vi.fn();
    await act(async () => {
      handler({ preventDefault } as unknown as KeyboardEvent);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete node:', expect.any(Error));
    expect(clearSelected).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
