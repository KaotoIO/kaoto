import { act, render } from '@testing-library/react';
import hotkeys from 'hotkeys-js';
import { KeyboardShortcutsProvider } from './keyboard-shortcuts.provider';

// Mock the useUndoRedo hook
const mockUndo = jest.fn();
const mockRedo = jest.fn();

jest.mock('../hooks/undo-redo.hook', () => ({
  useUndoRedo: () => ({
    undo: mockUndo,
    redo: mockRedo,
  }),
}));

// Mock hotkeys
jest.mock('hotkeys-js', () => {
  const hotkeyMock = jest.fn();
  (hotkeyMock as unknown as typeof hotkeys).unbind = jest.fn();

  return {
    __esModule: true,
    default: hotkeyMock,
  };
});

const mockHotkeys = hotkeys as jest.MockedFunction<typeof hotkeys>;

describe('KeyboardShortcutsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children', () => {
    const { getByTestId } = render(
      <KeyboardShortcutsProvider>
        <div data-testid="test-child">Test Content</div>
      </KeyboardShortcutsProvider>,
    );

    expect(getByTestId('test-child')).toBeInTheDocument();
  });

  it('should register undo shortcut (ctrl+z, command+z)', () => {
    act(() => {
      render(
        <KeyboardShortcutsProvider>
          <div>Test</div>
        </KeyboardShortcutsProvider>,
      );
    });

    expect(mockHotkeys).toHaveBeenCalledWith('ctrl+z,command+z', expect.any(Function));
  });

  it('should register redo shortcut (ctrl+shift+z, command+shift+z)', () => {
    act(() => {
      render(
        <KeyboardShortcutsProvider>
          <div>Test</div>
        </KeyboardShortcutsProvider>,
      );
    });

    expect(mockHotkeys).toHaveBeenCalledWith('ctrl+shift+z,command+shift+z', expect.any(Function));
  });
});
