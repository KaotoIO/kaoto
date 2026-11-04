import { ContextMenuItem, ContextMenuSeparator, WithContextMenuProps } from '@patternfly/react-topology';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createContext, useContext, useState } from 'react';

import { useArrowKeyNavigation } from '../../../../hooks/use-arrow-key-navigation.hook';
import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
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

function setup() {
  const user = userEvent.setup();
  const controller = ControllerService.createController();
  controller.fromModel({ graph: { id: 'graph', type: 'graph' }, nodes: [{ id: 'step', type: 'node' }] }, false);
  const element = controller.getNodeById('step')!;
  const Harness = () => {
    const [result, updateResult] = useState('');
    useArrowKeyNavigation();
    return (
      <ActionContext.Provider value={updateResult}>
        <div
          id="canvas-main"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Escape') updateResult('Canvas Escape');
          }}
        >
          <TopologyElementWrapper controller={controller} element={element}>
            {result !== 'Deleted' && <Wrapped />}
            <g className="custom-node" role="button" aria-label="Next step" tabIndex={-1} />
          </TopologyElementWrapper>
        </div>
        <button>Outside</button>
        <output>{result}</output>
        {result === 'Dialog' && <input aria-label="Dialog field" ref={(input) => input?.focus()} />}
      </ActionContext.Provider>
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
