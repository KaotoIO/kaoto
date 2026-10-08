import { Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { render as rtlRender } from '@testing-library/react';
import hotkeys from 'hotkeys-js';
import { PropsWithChildren, ReactElement } from 'react';

import { KeyboardShortcutsProvider } from './keyboard-shortcuts.provider';

/* hotkeys-js is mocked globally in vitest-mocks-setup.ts */
const mockHotkeys = vi.mocked(hotkeys);

describe('KeyboardShortcutsProvider', () => {
  /** The real useUndoRedo hook needs a topology controller */
  const render = (ui: ReactElement) => {
    const controller = new Visualization();
    return rtlRender(ui, {
      wrapper: ({ children }: PropsWithChildren) => (
        <VisualizationProvider controller={controller}>{children}</VisualizationProvider>
      ),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
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
    render(
      <KeyboardShortcutsProvider>
        <div>Test</div>
      </KeyboardShortcutsProvider>,
    );

    expect(mockHotkeys).toHaveBeenCalledWith('ctrl+z,command+z', expect.any(Function));
  });

  it('should register redo shortcut (ctrl+shift+z, command+shift+z)', () => {
    render(
      <KeyboardShortcutsProvider>
        <div>Test</div>
      </KeyboardShortcutsProvider>,
    );

    expect(mockHotkeys).toHaveBeenCalledWith('ctrl+shift+z,command+shift+z', expect.any(Function));
  });
});
