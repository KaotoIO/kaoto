import { act, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, useRef } from 'react';

import { CanvasDefaults } from './Canvas/canvas.defaults';
import { useCanvasFocusRescue } from './use-canvas-focus-rescue';

interface HarnessProps {
  showStep?: boolean;
  showNode?: boolean;
  nodeGeneration?: number;
  focusableNode?: boolean;
}

const Harness: FunctionComponent<HarnessProps> = ({
  showStep = true,
  showNode = true,
  nodeGeneration = 1,
  focusableNode = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useCanvasFocusRescue(containerRef);

  return (
    <div ref={containerRef}>
      <div id={CanvasDefaults.CANVAS_MAIN_ID} tabIndex={0} data-testid="canvas" />
      <button data-testid="toolbar-button">Toolbar</button>
      {showStep && <button data-testid="removable-button">Removable</button>}
      <svg>
        {showNode && (
          <g key={nodeGeneration} data-id="route-1|route.from">
            <g
              className="custom-node"
              tabIndex={focusableNode ? -1 : undefined}
              data-testid={`node-${nodeGeneration}`}
            />
          </g>
        )}
      </svg>
    </div>
  );
};

describe('useCanvasFocusRescue', () => {
  beforeEach(() => {
    // The shared test setup replaces MutationObserver with a no-op implementation, the hook needs the real one.
    const { jsdom } = globalThis as unknown as { jsdom: { window: { MutationObserver: typeof MutationObserver } } };
    vi.stubGlobal('MutationObserver', jsdom.window.MutationObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('moves the focus to the canvas when the focused element is removed', async () => {
    const { rerender } = render(<Harness />);
    act(() => {
      screen.getByTestId('removable-button').focus();
    });

    rerender(<Harness showStep={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas')).toHaveFocus();
    });
  });

  it('does not take the focus from a control that stays', async () => {
    const { rerender } = render(<Harness />);
    act(() => {
      screen.getByTestId('toolbar-button').focus();
    });

    rerender(<Harness showStep={false} />);
    /* Let the mutation observer run */
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('toolbar-button')).toHaveFocus();
  });

  it('moves the focus to the redrawn node when the focused node is replaced', async () => {
    const { rerender } = render(<Harness />);
    act(() => {
      screen.getByTestId('node-1').focus();
    });
    expect(screen.getByTestId('node-1')).toHaveFocus();

    rerender(<Harness nodeGeneration={2} />);

    await waitFor(() => {
      expect(screen.getByTestId('node-2')).toHaveFocus();
    });
  });

  it('moves the focus to the canvas when the redrawn node cannot take the focus', async () => {
    const { rerender } = render(<Harness />);
    act(() => {
      screen.getByTestId('node-1').focus();
    });
    expect(screen.getByTestId('node-1')).toHaveFocus();

    rerender(<Harness nodeGeneration={2} focusableNode={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas')).toHaveFocus();
    });
  });

  it('moves the focus to the canvas when the focused node is removed and not redrawn', async () => {
    const { rerender } = render(<Harness />);
    act(() => {
      screen.getByTestId('node-1').focus();
    });
    expect(screen.getByTestId('node-1')).toHaveFocus();

    rerender(<Harness showNode={false} />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas')).toHaveFocus();
    });
  });

  it('moves the focus to the canvas when a canvas context menu item is removed', async () => {
    render(<Harness />);
    const menu = document.createElement('div');
    menu.className = 'pf-topology-context-menu__c-dropdown__menu';
    const item = document.createElement('button');
    menu.appendChild(item);
    document.body.appendChild(menu);

    act(() => {
      item.focus();
    });
    expect(item).toHaveFocus();

    act(() => {
      menu.remove();
    });

    await waitFor(() => {
      expect(screen.getByTestId('canvas')).toHaveFocus();
    });
  });

  it('does not pull the focus back after the window lost it', async () => {
    const { rerender } = render(<Harness />);
    act(() => {
      screen.getByTestId('removable-button').focus();
    });
    expect(screen.getByTestId('removable-button')).toHaveFocus();

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    rerender(<Harness showStep={false} />);
    /* Let the mutation observer run */
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.body).toHaveFocus();
    expect(screen.getByTestId('canvas')).not.toHaveFocus();
  });
});
