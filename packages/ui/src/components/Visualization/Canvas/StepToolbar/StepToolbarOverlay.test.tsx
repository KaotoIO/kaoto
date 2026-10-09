import { act, render } from '@testing-library/react';

import { IVisualizationNode } from '../../../../models';
import * as StepToolbarModule from './StepToolbar';
import { StepToolbarOverlay } from './StepToolbarOverlay';

describe('StepToolbarOverlay', () => {
  let resize: () => void;
  let width: number;
  let height: number;
  const disconnect = vi.fn();
  const originalResizeObserver = globalThis.ResizeObserver;

  beforeEach(() => {
    vi.spyOn(StepToolbarModule, 'StepToolbar').mockImplementation(({ toolbarRef }) => (
      <div ref={toolbarRef}>
        <button>Toolbar action</button>
      </div>
    ));
    width = 180;
    height = 48;
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => width);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resize = () => {
          callback([], this);
        };
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnect;
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.ResizeObserver = originalResizeObserver;
    disconnect.mockClear();
  });

  const renderOverlay = () =>
    render(
      <svg>
        <StepToolbarOverlay centerX={100} bottomY={200} vizNode={{} as IVisualizationNode} />
      </svg>,
    );

  it('centers the measured toolbar and keeps its shadow inside the SVG paint bounds as actions change', () => {
    const { container } = renderOverlay();
    const viewport = container.querySelector('foreignObject');
    expect(viewport).toHaveAttribute('x', '-14');
    expect(viewport).toHaveAttribute('y', '122');
    expect(viewport).toHaveAttribute('width', '228');
    expect(viewport).toHaveAttribute('height', '96');
    expect(viewport).toHaveStyle({ overflow: 'hidden', pointerEvents: 'none' });

    act(() => {
      width = 300;
      height = 64;
      resize();
    });

    expect(viewport).toHaveAttribute('x', '-74');
    expect(viewport).toHaveAttribute('y', '106');
    expect(viewport).toHaveAttribute('width', '348');
    expect(viewport).toHaveAttribute('height', '112');
  });

  it('retains the last measured bounds when temporarily hidden', () => {
    const { container } = renderOverlay();
    act(() => {
      width = 0;
      height = 0;
      resize();
    });
    expect(container.querySelector('foreignObject')).toHaveAttribute('width', '228');
  });

  it('disconnects the observer when the toolbar closes', () => {
    const { unmount } = renderOverlay();
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
