import { act, render } from '@testing-library/react';
import { FunctionComponent, useRef } from 'react';

import { CanvasDefaults } from './Canvas/canvas.defaults';
import { useCanvasFocusRescue } from './use-canvas-focus-rescue';

const Harness: FunctionComponent = () => {
  const ref = useRef<HTMLDivElement>(null);
  useCanvasFocusRescue(ref);
  return (
    <div ref={ref}>
      <div id={CanvasDefaults.CANVAS_MAIN_ID} tabIndex={0}>
        <svg>
          <g data-id="route|route.from">
            <g className="custom-node" tabIndex={0} data-testid="node" />
          </g>
        </svg>
      </div>
      <button data-testid="toolbar">Toolbar</button>
      <button data-testid="removable">Removable</button>
    </div>
  );
};

describe('useCanvasFocusRescue', () => {
  /** The shared test setup replaces MutationObserver with a no-op; the test reports the changes itself */
  let notify: (() => void) | undefined;
  beforeEach(() => {
    notify = undefined;
    vi.spyOn(globalThis, 'MutationObserver').mockImplementation(function (callback) {
      const observer = { observe: vi.fn(), disconnect: vi.fn(), takeRecords: vi.fn() };
      notify = () => {
        callback([], observer as unknown as MutationObserver);
      };
      return observer;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const setup = () => {
    const result = render(<Harness />);
    const get = (testId: string) => result.getByTestId(testId);
    const focus = (element: Element) => {
      act(() => {
        (element as HTMLElement).focus();
      });
    };
    /** Removes the element like a re-render would, and lets the observer react */
    const remove = async (element: Element) => {
      await act(async () => {
        element.remove();
        notify?.();
      });
    };
    return { ...result, get, focus, remove };
  };

  it('focuses the canvas when the focused element is removed', async () => {
    const { get, focus, remove } = setup();
    const removable = get('removable');
    focus(removable);

    await remove(removable);

    expect(document.activeElement?.id).toBe(CanvasDefaults.CANVAS_MAIN_ID);
  });

  it('focuses the last focused node when it still exists', async () => {
    const { get, focus, remove } = setup();
    focus(get('node'));
    const removable = get('removable');
    focus(removable);

    await remove(removable);

    expect(get('node')).toHaveFocus();
  });

  it('focuses the canvas when the focused node is removed', async () => {
    const { get, focus, remove } = setup();
    const node = get('node');
    focus(node);

    await remove(node.parentElement!);

    expect(document.activeElement?.id).toBe(CanvasDefaults.CANVAS_MAIN_ID);
  });

  it('focuses the canvas when a focused item of a canvas context menu is removed', async () => {
    const { focus, remove } = setup();
    // PatternFly renders the canvas context menus in a popper outside the canvas
    const menu = document.createElement('div');
    menu.className = 'pf-topology-context-menu__c-dropdown__menu';
    const item = document.createElement('button');
    menu.append(item);
    document.body.append(menu);
    focus(item);

    await remove(menu);

    expect(document.activeElement?.id).toBe(CanvasDefaults.CANVAS_MAIN_ID);
  });

  it('leaves the focus alone when the focused element stays connected', async () => {
    const { get, focus, remove } = setup();
    const toolbar = get('toolbar');
    focus(toolbar);

    await remove(get('removable'));

    expect(toolbar).toHaveFocus();
  });

  it('does nothing once the focus moved to another element', async () => {
    const { get, focus, remove } = setup();
    const removable = get('removable');
    focus(removable);
    const outside = document.createElement('button');
    document.body.append(outside);
    focus(outside);

    await remove(removable);

    expect(outside).toHaveFocus();
    outside.remove();
  });
});
