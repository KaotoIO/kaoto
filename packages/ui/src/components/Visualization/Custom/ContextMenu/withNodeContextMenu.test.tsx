import { ContextMenuItem, WithContextMenuProps } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FunctionComponent } from 'react';
import type { Mock } from 'vitest';

import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import { withNodeContextMenu } from './withNodeContextMenu';

describe('withNodeContextMenu', () => {
  const createItem = (id: string, label: string) => (
    <ContextMenuItem key={id} data-testid={id}>
      {label}
    </ContextMenuItem>
  );
  const itemA = createItem('item-a', 'Item A');
  const itemB = createItem('item-b', 'Item B');

  interface TargetProps extends WithContextMenuProps {
    count?: number;
  }

  const Target: FunctionComponent<TargetProps> = ({ onContextMenu, contextMenuOpen, count }) => (
    <g
      data-testid="target"
      data-menu-open={String(contextMenuOpen)}
      data-count={count !== undefined ? String(count) : undefined}
      onContextMenu={onContextMenu}
    />
  );

  /** A real controller holding one node, exposed through `ElementContext` like the canvas does */
  const renderWithMenu = (actions: Mock, initialProps: { count?: number } = {}) => {
    const controller = ControllerService.createController();
    controller.fromModel(
      {
        graph: { id: 'g1', type: 'graph' },
        nodes: [{ id: 'node-1', type: 'node', x: 0, y: 0, width: 90, height: 75 }],
      },
      false,
    );
    const element = controller.getNodeById('node-1')!;
    const WithMenu = withNodeContextMenu(actions)(Target);

    const renderResult = render(
      <TopologyElementWrapper controller={controller} element={element}>
        <WithMenu {...initialProps} />
      </TopologyElementWrapper>,
    );

    const rerender = (newProps: { count?: number } = {}) => {
      renderResult.rerender(
        <TopologyElementWrapper controller={controller} element={element}>
          <WithMenu {...newProps} />
        </TopologyElementWrapper>,
      );
    };

    return { element, target: screen.getByTestId('target'), rerender };
  };

  /** Lets the animation frame that opens the menu, and any follow-up renders, run */
  const settle = async () => {
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
  };

  it('builds the actions once per right-click and shows them', async () => {
    const actions = vi.fn().mockReturnValue([itemA]);
    const { element, target } = renderWithMenu(actions);
    expect(target).toHaveAttribute('data-menu-open', 'false');

    fireEvent.contextMenu(target, { clientX: 10, clientY: 20 });

    expect(await screen.findByTestId('item-a')).toBeInTheDocument();
    expect(target).toHaveAttribute('data-menu-open', 'true');
    expect(actions).toHaveBeenCalledTimes(1);
    expect(actions).toHaveBeenCalledWith(element);
  });

  it('keeps the same item element in the DOM from the moment it appears until the menu closes', async () => {
    const actions = vi.fn().mockImplementation(() => [createItem('item-a', 'Item A')]);
    const { target, rerender } = renderWithMenu(actions, { count: 1 });

    fireEvent.contextMenu(target, { clientX: 10, clientY: 20 });
    const item = await screen.findByTestId('item-a');
    expect(target).toHaveAttribute('data-count', '1');

    rerender({ count: 2 });
    await settle();

    expect(target).toHaveAttribute('data-count', '2');
    expect(screen.getByTestId('item-a')).toBe(item);
    expect(actions).toHaveBeenCalledTimes(1);

    fireEvent.click(within(item).getByRole('menuitem'));
    expect(screen.queryByTestId('item-a')).not.toBeInTheDocument();
    expect(target).toHaveAttribute('data-menu-open', 'false');
  });

  it('removes the previous menu as soon as another right-click opens a new one', async () => {
    const actions = vi.fn().mockReturnValueOnce([itemA]).mockReturnValueOnce([itemB]);
    const { target } = renderWithMenu(actions);

    fireEvent.contextMenu(target, { clientX: 10, clientY: 20 });
    const item = await screen.findByTestId('item-a');

    fireEvent.contextMenu(target, { clientX: 30, clientY: 40 });

    /* The first menu's items are gone before the new menu opens, so nothing stale can be clicked */
    expect(item).not.toBeInTheDocument();
    expect(await screen.findByTestId('item-b')).toBeInTheDocument();
    expect(actions).toHaveBeenCalledTimes(2);
  });

  it('replaces the menu when the closing mousedown and the next contextmenu arrive in one batch, like a real right-click', async () => {
    const actions = vi.fn().mockReturnValueOnce([itemA]).mockReturnValueOnce([itemB]);
    const { target } = renderWithMenu(actions);

    fireEvent.contextMenu(target, { clientX: 10, clientY: 20 });
    const item = await screen.findByTestId('item-a');
    await settle();

    /* A right-click on the node fires mousedown (the Popper closes on it) and contextmenu in the same task */
    act(() => {
      target.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      target.dispatchEvent(
        new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 10, clientY: 20 }),
      );
    });

    expect(item).not.toBeInTheDocument();
    expect(await screen.findByTestId('item-b')).toBeInTheDocument();
    expect(actions).toHaveBeenCalledTimes(2);
  });

  it('focuses the first enabled action and skips disabled ones with the arrow keys, Home and End', async () => {
    const createDisabledItem = (id: string, label: string) => (
      <ContextMenuItem key={id} data-testid={id} isDisabled>
        {label}
      </ContextMenuItem>
    );
    const actions = vi
      .fn()
      .mockReturnValue([
        createDisabledItem('disabled-first', 'Disabled first'),
        itemA,
        createDisabledItem('disabled-middle', 'Disabled middle'),
        itemB,
        createDisabledItem('disabled-last', 'Disabled last'),
      ]);
    const { target } = renderWithMenu(actions);
    const user = userEvent.setup();

    fireEvent.contextMenu(target, { clientX: 10, clientY: 20 });
    await screen.findByTestId('item-a');
    await settle();
    const menu = screen.getByRole('menu', { name: 'Step actions' });
    const itemAButton = within(menu).getByRole('menuitem', { name: 'Item A' });
    const itemBButton = within(menu).getByRole('menuitem', { name: 'Item B' });
    expect(itemAButton).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(itemBButton).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(itemAButton).toHaveFocus();
    await user.keyboard('{End}');
    expect(itemBButton).toHaveFocus();
    await user.keyboard('{Home}');
    expect(itemAButton).toHaveFocus();
  });

  it('names the menu with the given label', async () => {
    const actions = vi.fn().mockReturnValue([itemA]);
    const controller = ControllerService.createController();
    controller.fromModel({ graph: { id: 'g1', type: 'graph' }, nodes: [{ id: 'node-1', type: 'node' }] }, false);
    const WithMenu = withNodeContextMenu(actions, { label: 'Route actions' })(Target);
    render(
      <TopologyElementWrapper controller={controller} element={controller.getNodeById('node-1')!}>
        <WithMenu />
      </TopologyElementWrapper>,
    );

    fireEvent.contextMenu(screen.getByTestId('target'), { clientX: 10, clientY: 20 });
    await screen.findByTestId('item-a');

    expect(screen.getByRole('menu', { name: 'Route actions' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const actions = vi.fn().mockReturnValue([itemA]);
    const { target } = renderWithMenu(actions);

    fireEvent.contextMenu(target, { clientX: 10, clientY: 20 });
    await screen.findByTestId('item-a');
    await settle();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('item-a')).not.toBeInTheDocument();
    expect(target).toHaveAttribute('data-menu-open', 'false');
  });
});
