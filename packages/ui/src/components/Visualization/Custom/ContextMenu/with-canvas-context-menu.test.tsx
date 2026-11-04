import { ContextMenuItem, ContextMenuSeparator, WithContextMenuProps } from '@patternfly/react-topology';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createContext, useContext, useState } from 'react';

import { useArrowKeyNavigation } from '../../../../hooks/use-arrow-key-navigation.hook';
import { EntityType } from '../../../../models/entities';
import { VisibleFlowsContext, VisibleFlowsContextResult } from '../../../../providers';
import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import { GraphContextMenuFn } from '../Graph/CustomGraph';
import { generateEntityContextMenu } from '../Graph/generateEntityContextMenu';
import { withCanvasContextMenu } from './with-canvas-context-menu';

const Trigger = ({ onContextMenu }: WithContextMenuProps) => (
  <g
    className="custom-node"
    role="button"
    aria-label="Step"
    tabIndex={0}
    onContextMenu={onContextMenu}
    onKeyDown={(event) => {
      if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
        onContextMenu?.({
          type: event.type,
          preventDefault: () => {
            event.preventDefault();
          },
          stopPropagation: () => {
            event.stopPropagation();
          },
          clientX: 10,
          clientY: 20,
          currentTarget: event.currentTarget,
        } as unknown as React.MouseEvent);
      }
    }}
  />
);

const visibleFlows = { visualFlowsApi: {} } as VisibleFlowsContextResult;

const ActionContext = createContext<(value: string) => void>(() => {});

const Actions = () => {
  const setResult = useContext(ActionContext);
  return (
    <>
      <ContextMenuItem isDisabled>Unavailable</ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          setResult('First action');
        }}
      >
        First action
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem
        onClick={() => {
          setResult('Second action');
        }}
      >
        Second action
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          setResult('Dialog');
        }}
      >
        Open dialog
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => {
          setResult('Deleted');
        }}
      >
        Delete step
      </ContextMenuItem>
    </>
  );
};

const Wrapped = withCanvasContextMenu(() => [<Actions key="actions" />])(Trigger);

const SubmenuActions = () => {
  const setResult = useContext(ActionContext);
  return (
    <>
      {GraphContextMenuFn({
        entityContextMenuFn: () =>
          generateEntityContextMenu({
            commonEntities: [{ name: 'route' as EntityType, title: 'Route', description: 'Create a route' }],
            groupedEntities: {
              Configuration: [
                {
                  name: 'routeConfiguration' as EntityType,
                  title: 'Route configuration',
                  description: 'Create a configuration',
                },
              ],
            },
            createEntity: setResult,
          }),
      })}
    </>
  );
};
const WrappedSubmenu = withCanvasContextMenu(() => [<SubmenuActions key="actions" />])(Trigger);

function setup(submenu = false) {
  const user = userEvent.setup();
  const controller = ControllerService.createController();
  controller.fromModel({ graph: { id: 'graph', type: 'graph' }, nodes: [{ id: 'step', type: 'node' }] }, false);
  const element = controller.getNodeById('step')!;
  const Harness = () => {
    const [result, updateResult] = useState('');
    useArrowKeyNavigation();
    return (
      <VisibleFlowsContext.Provider value={visibleFlows}>
        <ActionContext.Provider value={updateResult}>
          <div
            id="canvas-main"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Escape') updateResult('Canvas Escape');
            }}
          >
            <TopologyElementWrapper controller={controller} element={element}>
              {result !== 'Deleted' && (submenu ? <WrappedSubmenu /> : <Wrapped />)}
              <g className="custom-node" role="button" aria-label="Next step" tabIndex={-1} />
            </TopologyElementWrapper>
          </div>
          <button>Outside</button>
          <output>{result}</output>
          {result === 'Dialog' && <input aria-label="Dialog field" ref={(input) => input?.focus()} />}
        </ActionContext.Provider>
      </VisibleFlowsContext.Provider>
    );
  };
  render(<Harness />);
  const trigger = screen.getByRole('button', { name: 'Step' });
  trigger.focus();
  return { user, trigger };
}

async function openMenu(key = 'F10') {
  const context = setup();
  fireEvent.keyDown(context.trigger, { key, shiftKey: key === 'F10' });
  await waitFor(() => expect(screen.getByRole('menuitem', { name: 'First action' })).toHaveFocus());
  return context;
}

it.each(['F10', 'ContextMenu'])('focuses the first enabled action when opened with %s', async (key) => {
  await openMenu(key);
});

it('navigates actions with arrow keys without navigating canvas steps', async () => {
  const { user } = await openMenu();
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('menuitem', { name: 'Second action' })).toHaveFocus();
  await user.keyboard('{ArrowUp}');
  expect(screen.getByRole('menuitem', { name: 'First action' })).toHaveFocus();
  await user.keyboard('{ArrowUp}');
  expect(screen.getByRole('menuitem', { name: 'Delete step' })).toHaveFocus();
});

it.each(['{Enter}', ' '])('activates the focused action with %s and restores node focus', async (key) => {
  const { user, trigger } = await openMenu();
  await user.keyboard(key);
  expect(screen.getByRole('status')).toHaveTextContent('First action');
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
});

it('closes on Escape and restores focus to the originating SVG node', async () => {
  const { user, trigger } = await openMenu();
  await user.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

it.each([false, true])('closes on Tab (shift=%s) without preventing native tab navigation', async (shiftKey) => {
  const { trigger } = await openMenu();
  // user-event cannot emulate native tab traversal from an SVG <g>.
  // Browser coverage verifies the destination; here verify our close/focus contract.
  const allowed = fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey });
  expect(allowed).toBe(true);
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it('does not steal focus from an action that opens a dialog', async () => {
  const { user } = await openMenu();
  await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Dialog field' })).toHaveFocus());
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
});

it('returns focus to the canvas when an action removes the originating node', async () => {
  const { user } = await openMenu();
  await user.keyboard('{ArrowUp}{Enter}');
  await waitFor(() => expect(document.getElementById('canvas-main')).toHaveFocus());
  expect(screen.queryByRole('button', { name: 'Step' })).not.toBeInTheDocument();
});

it('allows an outside click to move focus away from the menu', async () => {
  const { user } = await openMenu();
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus());
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
});

it('still opens with the mouse and executes an action', async () => {
  const { user, trigger } = setup();
  fireEvent.contextMenu(trigger, { button: 2, clientX: 10, clientY: 20 });
  const firstAction = await screen.findByRole('menuitem', { name: 'First action' });
  expect(firstAction).not.toHaveFocus();
  await user.hover(screen.getByRole('menuitem', { name: 'Second action' }));
  expect(firstAction).not.toHaveFocus();
  await user.click(await screen.findByRole('menuitem', { name: 'Second action' }));
  expect(screen.getByRole('status')).toHaveTextContent('Second action');
});

it('closes a mouse-opened menu on Escape and restores node focus', async () => {
  const { user, trigger } = setup();
  fireEvent.contextMenu(trigger, { button: 2, clientX: 10, clientY: 20 });
  await screen.findByRole('menuitem', { name: 'First action' });
  await user.keyboard('{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

async function openNewMenu() {
  const context = setup(true);
  fireEvent.keyDown(context.trigger, { key: 'F10', shiftKey: true });
  await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Show all' })).toHaveFocus());
  await context.user.keyboard('{ArrowUp}');
  expect(screen.getByText('New').closest('button')).toHaveFocus();
  return context;
}

it.each(['{Enter}', '{ArrowRight}', ' '])('opens New with %s and activates a route', async (key) => {
  const { user, trigger } = await openNewMenu();
  await user.keyboard(key);
  const route = await screen.findByRole('menuitem', { name: 'Route Create a route' });
  expect(route).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('status')).toHaveTextContent('route');
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByText('New')).not.toBeInTheDocument();
});

it('navigates nested entity menus and activates a grouped entity with the keyboard', async () => {
  const { user, trigger } = await openNewMenu();
  await user.keyboard('{ArrowRight}{ArrowDown}{Enter}');
  const item = await screen.findByRole('menuitem', { name: 'Route configuration Create a configuration' });
  expect(item).toHaveFocus();
  await user.keyboard('{ArrowLeft}');
  expect(screen.getByText('Configuration').closest('button')).toHaveFocus();
  await user.keyboard('{ArrowRight}{Enter}');
  expect(screen.getByRole('status')).toHaveTextContent('routeConfiguration');
  await waitFor(() => expect(trigger).toHaveFocus());
});

it('opens New with the mouse and activates a grouped entity', async () => {
  const { user } = await openNewMenu();
  await user.click(screen.getByText('New'));
  await user.hover(await screen.findByText('Configuration'));
  await user.click(await screen.findByText('Route configuration'));
  expect(screen.getByRole('status')).toHaveTextContent('routeConfiguration');
  expect(screen.queryByText('New')).not.toBeInTheDocument();
});

it('returns from New to its trigger with ArrowLeft', async () => {
  const { user } = await openNewMenu();
  await user.keyboard('{ArrowRight}{ArrowLeft}');
  expect(screen.getByText('New').closest('button')).toHaveFocus();
  expect(screen.queryByText('Route')).not.toBeInTheDocument();
});

it('closes a nested menu with Escape and restores canvas focus', async () => {
  const { user, trigger } = await openNewMenu();
  await user.keyboard('{ArrowRight}{ArrowDown}{ArrowRight}{Escape}');
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(screen.queryByText('New')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
});

it('opens New on hover and activates a route with the mouse', async () => {
  const { user } = await openNewMenu();
  await user.hover(screen.getByText('New'));
  await user.click(await screen.findByText('Route'));
  expect(screen.getByRole('status')).toHaveTextContent('route');
  expect(screen.queryByText('New')).not.toBeInTheDocument();
});

it('keeps arrow navigation within the open submenu', async () => {
  const { user } = await openNewMenu();
  await user.keyboard('{ArrowRight}{ArrowUp}');
  expect(screen.getByText('Configuration').closest('button')).toHaveFocus();
  await user.keyboard('{ArrowDown}');
  expect(screen.getByRole('menuitem', { name: 'Route Create a route' })).toHaveFocus();
  await user.keyboard('{ArrowDown}{ArrowRight}{ArrowDown}');
  expect(screen.getByRole('menuitem', { name: 'Route configuration Create a configuration' })).toHaveFocus();
});

it.each(['{Enter}', '{ArrowRight}', ' '])('focuses an already hovered submenu with %s', async (key) => {
  const { user } = await openNewMenu();
  await user.hover(screen.getByText('New'));
  await user.keyboard(key);
  expect(screen.getByRole('menuitem', { name: 'Route Create a route' })).toHaveFocus();
});

it('restores the trigger when leaving a submenu opened by hover', async () => {
  const { user } = await openNewMenu();
  await user.hover(screen.getByText('New'));
  await user.keyboard('{ArrowRight}{ArrowLeft}');
  expect(screen.getByText('New').closest('button')).toHaveFocus();
  expect(screen.queryByText('Route')).not.toBeInTheDocument();
});
