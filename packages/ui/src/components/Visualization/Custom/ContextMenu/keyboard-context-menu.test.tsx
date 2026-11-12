import { Divider } from '@patternfly/react-core';
import { ContextMenuItem, WithContextMenuProps } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createContext, useCallback, useContext, useState } from 'react';

import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';
import { CanvasFocusProvider, useCanvasFocusTarget } from '../../Canvas/canvas-focus-handoff';
import { ControllerService } from '../../Canvas/controller.service';
import { CanvasContextMenu, CanvasContextSubMenu as ContextSubMenuItem } from './CanvasContextMenu';
import { withNodeContextMenu } from './withNodeContextMenu';

const Target = ({ onContextMenu, name = 'Step' }: WithContextMenuProps & { name?: string }) => (
  <g
    tabIndex={0}
    role="button"
    aria-label={name}
    onContextMenu={onContextMenu}
    onKeyDown={(event) => {
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        onContextMenu?.(event as unknown as React.MouseEvent);
      }
    }}
  />
);

const ActionContext = createContext<(() => void) | undefined>(undefined);
const ActionItem = () => {
  const activate = useContext(ActionContext);
  return <ContextMenuItem onClick={activate}>First</ContextMenuItem>;
};

function setup(
  submenus = false,
  outcome: 'action' | 'delete' | 'dialog' = 'action',
  secondTrigger = false,
  canvasBackground = false,
) {
  const action = vi.fn();
  const canvasEscape = vi.fn();
  const controller = ControllerService.createController();
  controller.fromModel({ graph: { id: 'graph', type: 'graph' }, nodes: [{ id: 'step', type: 'node' }] }, false);
  const WithMenu = withNodeContextMenu(
    () => [
      <ContextMenuItem key="disabled" isDisabled>
        Unavailable
      </ContextMenuItem>,
      <ActionItem key="first" />,
      <Divider key="divider" />,
      <ContextMenuItem key="last" onClick={action}>
        Last
      </ContextMenuItem>,
      ...(submenus
        ? [
            <ContextSubMenuItem key="new" label="New">
              <ContextMenuItem key="disabled" isDisabled>
                Disabled child
              </ContextMenuItem>
              <ContextMenuItem key="child" onClick={action}>
                Child
              </ContextMenuItem>
              <ContextSubMenuItem key="nested" label="Nested">
                <ContextMenuItem key="nested-child" onClick={action}>
                  Nested child
                </ContextMenuItem>
              </ContextSubMenuItem>
            </ContextSubMenuItem>,
          ]
        : []),
    ],
    { canvasBackground },
  )(Target);
  const Surface = () => {
    const [result, setResult] = useState('');
    const activate = useCallback(() => {
      action();
      setResult(outcome);
    }, []);
    return (
      <ActionContext.Provider value={activate}>
        <div
          id={canvasBackground ? CanvasDefaults.CANVAS_MAIN_ID : undefined}
          ref={useCanvasFocusTarget(true)}
          tabIndex={0}
          aria-label="Canvas"
          onKeyDown={(event) => {
            if (event.key === 'Escape') canvasEscape();
          }}
        >
          <TopologyElementWrapper controller={controller} element={controller.getNodeById('step')!}>
            <g className={canvasBackground ? 'pf-topology-content' : undefined}>
              {result !== 'delete' && <WithMenu />}
              {secondTrigger && <WithMenu name="Other step" />}
            </g>
          </TopologyElementWrapper>
        </div>
        {result === 'dialog' && (
          <div role="dialog" aria-label="Edit">
            <input autoFocus aria-label="Dialog field" />
          </div>
        )}
      </ActionContext.Provider>
    );
  };
  render(
    <CanvasFocusProvider>
      <Surface />
      <button>Outside</button>
    </CanvasFocusProvider>,
  );
  const trigger = screen.getByRole('button', { name: 'Step' });
  trigger.focus();
  return { user: userEvent.setup(), trigger, action, canvasEscape };
}

const settle = async () => {
  await act(async () => {
    await new Promise(requestAnimationFrame);
  });
};

it.each(['{Shift>}{F10}{/Shift}', '{ContextMenu}'])('focuses the first enabled action on %s', async (keys) => {
  const { user } = setup();
  await user.keyboard(keys);
  expect(await screen.findByRole('menuitem', { name: 'First' })).toHaveFocus();
});

it('keeps navigation within enabled actions and wraps', async () => {
  const { user } = setup();
  await user.keyboard('{ContextMenu}');
  await screen.findByRole('menuitem', { name: 'First' });
  await user.keyboard('{ArrowUp}');
  expect(screen.getByRole('menuitem', { name: 'Last' })).toHaveFocus();
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus();
  await user.keyboard('{End}');
  expect(screen.getByRole('menuitem', { name: 'Last' })).toHaveFocus();
  await user.keyboard('{Home}');
  expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus();
});

it.each(['{ArrowLeft}', '{ArrowRight}'])('keeps a root leaf focused without activating it on %s', async (key) => {
  const { user, action } = setup();
  await user.keyboard('{ContextMenu}');
  const first = await screen.findByRole('menuitem', { name: 'First' });
  await user.keyboard(key);
  expect(first).toHaveFocus();
  expect(screen.getByRole('menu')).toBeInTheDocument();
  expect(action).not.toHaveBeenCalled();
});

it('keeps keyboard focus on the menu list when all actions are disabled', async () => {
  render(
    <CanvasContextMenu
      reference={{ x: 30, y: 40 }}
      keyboard
      label="Unavailable actions"
      onClose={vi.fn()}
      onTab={vi.fn()}
    >
      {[
        <ContextMenuItem key="disabled" isDisabled>
          Unavailable
        </ContextMenuItem>,
      ]}
    </CanvasContextMenu>,
  );
  const menu = await screen.findByRole('menu', { name: 'Unavailable actions' });
  expect(menu).toHaveFocus();
  await userEvent.setup().keyboard('{ArrowUp}{ArrowDown}{Home}{End}');
  expect(menu).toHaveFocus();
});

it.each(['{Enter}', ' '])('activates a leaf exactly once using %s and returns focus', async (keys) => {
  const { user, trigger, action } = setup();
  await user.keyboard('{ContextMenu}');
  await screen.findByRole('menuitem', { name: 'First' });
  await user.keyboard(keys);
  await settle();
  expect(action).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('consumes Escape and returns focus to the exact originating step', async () => {
  const { user, trigger, canvasEscape } = setup();
  await user.keyboard('{ContextMenu}');
  await screen.findByRole('menuitem', { name: 'First' });
  await user.keyboard('{Escape}');
  await settle();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(canvasEscape).not.toHaveBeenCalled();
});

it('keeps pointer opening positioned without focusing an action', async () => {
  const { trigger } = setup();
  fireEvent.contextMenu(trigger, { clientX: 30, clientY: 40 });
  const first = await screen.findByRole('menuitem', { name: 'First' });
  expect(first).not.toHaveFocus();
  await waitFor(() =>
    expect(screen.getByRole('menu').closest('.pf-v6-c-menu')?.parentElement).toHaveStyle({ position: 'absolute' }),
  );
  fireEvent.keyDown(document, { key: 'Escape' });
  await settle();
  expect(trigger).toHaveFocus();
});

it.each([
  { key: '{ArrowUp}', action: 'New' },
  { key: '{ArrowDown}', action: 'First' },
])('starts pointer-opened menu navigation with $key at $action', async ({ key, action }) => {
  const { user, trigger } = setup(true);
  fireEvent.contextMenu(trigger, { clientX: 30, clientY: 40 });
  const menu = await screen.findByRole('menu');
  expect(menu).toHaveFocus();
  await user.keyboard(key);
  expect(screen.getByRole('menuitem', { name: action })).toHaveFocus();
});

it.each([false, true])('enters nested menus including previously hovered flyouts (%s)', async (hover) => {
  const { user, trigger, action } = setup(true);
  await user.keyboard('{ContextMenu}');
  const newItem = await screen.findByText('New');
  if (hover) await user.hover(newItem);
  await user.keyboard('{End}{ArrowRight}');
  await settle();
  expect(await screen.findByRole('menuitem', { name: 'Child' })).toHaveFocus();
  await user.keyboard('{ArrowUp}');
  const nested = screen.getByRole('menuitem', { name: 'Nested' });
  expect(nested).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  await settle();
  expect(await screen.findByRole('menuitem', { name: 'Nested child' })).toHaveFocus();
  await user.keyboard('{ArrowLeft}');
  expect(nested).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.getByRole('menuitem', { name: 'New' })).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  await settle();
  await user.keyboard('{Enter}');
  await settle();
  expect(action).toHaveBeenCalledTimes(1);
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('cancels pending flyout focus when the menu closes before the next frame', async () => {
  const { user, trigger } = setup(true);
  await user.keyboard('{ContextMenu}{End}');
  const submenu = await screen.findByRole('menuitem', { name: 'New' });
  fireEvent.keyDown(submenu, { key: 'ArrowRight' });
  fireEvent.keyDown(submenu, { key: 'Escape' });
  await settle();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it.each([false, true])('dismisses on Tab without preventing native traversal (%s)', async (shiftKey) => {
  const { user, trigger } = setup();
  await user.keyboard('{ContextMenu}');
  const item = await screen.findByRole('menuitem', { name: 'First' });
  const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
  act(() => {
    item.dispatchEvent(event);
  });
  expect(event.defaultPrevented).toBe(false);
  expect(trigger).toHaveFocus();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('dismisses on outside pointer interaction without returning focus', async () => {
  const { user } = setup();
  await user.keyboard('{ContextMenu}');
  await screen.findByRole('menuitem', { name: 'First' });
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  await settle();
  expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('activates a pointer-selected action and restores its originating step', async () => {
  const { user, trigger, action } = setup();
  fireEvent.contextMenu(trigger, { clientX: 30, clientY: 40 });
  await user.click(await screen.findByRole('menuitem', { name: 'First' }));
  await settle();
  expect(action).toHaveBeenCalledExactlyOnceWith();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('retains pending flyout focus across repeated ArrowRight presses', async () => {
  const { user } = setup(true);
  await user.keyboard('{ContextMenu}{End}');
  const submenu = await screen.findByRole('menuitem', { name: 'New' });
  fireEvent.keyDown(submenu, { key: 'ArrowRight' });
  fireEvent.keyDown(submenu, { key: 'ArrowRight' });
  await settle();
  expect(screen.getByRole('menuitem', { name: 'Child' })).toHaveFocus();
});

it.each([true, false])(
  'positions the keyboard canvas menu at the drawing surface or its canvas fallback (%s)',
  async (drawingSurface) => {
    const { user } = setup(false, 'action', false, true);
    const canvas = screen.getByLabelText('Canvas');
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue(new DOMRect(20, 30, 500, 400));
    const graph = canvas.querySelector<SVGElement>('.pf-topology-content')!;
    if (drawingSurface) vi.spyOn(graph, 'getBoundingClientRect').mockReturnValue(new DOMRect(80, 90, 300, 200));
    else graph.removeAttribute('class');
    canvas.focus();
    await user.keyboard('{ContextMenu}');
    const menu = await screen.findByRole('menu', { name: 'Canvas actions' });
    await waitFor(() =>
      expect(menu.closest('.pf-v6-c-menu')?.parentElement).toHaveStyle({
        transform: drawingSurface ? 'translate(80px, 90px)' : 'translate(20px, 30px)',
      }),
    );
    expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await settle();
    expect(canvas).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  },
);

it.each(['{Enter}', ' '])('enters a submenu at its first enabled item with %s', async (keys) => {
  const { user } = setup(true);
  await user.keyboard('{ContextMenu}');
  await screen.findByText('New');
  await user.keyboard('{End}');
  await user.keyboard(keys);
  await settle();
  expect(await screen.findByRole('menuitem', { name: 'Child' })).toHaveFocus();
});

it.each(['{Enter}', ' '])('enters a hovered submenu using %s', async (keys) => {
  const { user } = setup(true);
  await user.keyboard('{ContextMenu}');
  const item = await screen.findByRole('menuitem', { name: 'New' });
  await user.hover(item);
  await user.keyboard('{End}');
  await user.keyboard(keys);
  await settle();
  expect(await screen.findByRole('menuitem', { name: 'Child' })).toHaveFocus();
});

it('falls back to the canvas when a leaf action removes its originating step', async () => {
  const { user } = setup(false, 'delete');
  await user.keyboard('{ContextMenu}');
  await screen.findByRole('menuitem', { name: 'First' });
  await user.keyboard('{Enter}');
  await settle();
  expect(screen.queryByRole('button', { name: 'Step' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Canvas')).toHaveFocus();
});

it('preserves action-created dialog focus and discards the return request after blur', async () => {
  const { user } = setup(false, 'dialog');
  await user.keyboard('{ContextMenu}');
  await screen.findByRole('menuitem', { name: 'First' });
  await user.keyboard('{Enter}');
  await settle();
  const input = screen.getByRole('textbox', { name: 'Dialog field' });
  expect(input).toHaveFocus();
  input.blur();
  await settle();
  expect(document.body).toHaveFocus();
});

it('replaces a different trigger menu without returning stale focus', async () => {
  const { user } = setup(false, 'action', true);
  await user.keyboard('{ContextMenu}');
  const previous = await screen.findByRole('menuitem', { name: 'First' });
  const other = screen.getByRole('button', { name: 'Other step' });
  fireEvent.contextMenu(other, { clientX: 100, clientY: 120 });
  expect(previous).not.toBeInTheDocument();
  await screen.findByRole('menuitem', { name: 'First' });
  await user.keyboard('{Escape}');
  await settle();
  expect(other).toHaveFocus();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

it('does not return stale focus when Escape is pressed after focus has moved outside', async () => {
  const { user } = setup();
  await user.keyboard('{ContextMenu}');
  await screen.findByRole('menuitem', { name: 'First' });
  const outside = screen.getByRole('button', { name: 'Outside' });
  outside.focus();
  fireEvent.keyDown(outside, { key: 'Escape' });
  outside.blur();
  await settle();
  expect(document.body).toHaveFocus();
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});
