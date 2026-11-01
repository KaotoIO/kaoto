import { ContextMenuItem, WithContextMenuProps } from '@patternfly/react-topology';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { FunctionComponent } from 'react';
import type { Mock } from 'vitest';

import { TopologyElementWrapper } from '../../../../stubs/topology-element-wrapper';
import { ControllerService } from '../../Canvas/controller.service';
import { withNodeContextMenu } from './withNodeContextMenu';

describe('withNodeContextMenu', () => {
  const itemA = (
    <ContextMenuItem key="item-a" data-testid="item-a">
      Item A
    </ContextMenuItem>
  );
  const itemB = (
    <ContextMenuItem key="item-b" data-testid="item-b">
      Item B
    </ContextMenuItem>
  );

  const Target: FunctionComponent<WithContextMenuProps> = ({ onContextMenu, contextMenuOpen }) => (
    <g data-testid="target" data-menu-open={String(contextMenuOpen)} onContextMenu={onContextMenu} />
  );

  /** A real controller holding one node, exposed through `ElementContext` like the canvas does */
  const renderWithMenu = (actions: Mock) => {
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

    render(
      <TopologyElementWrapper controller={controller} element={element}>
        <WithMenu />
      </TopologyElementWrapper>,
    );

    return { element, target: screen.getByTestId('target') };
  };

  /** Lets the animation frame that opens the menu, and any follow-up renders, run */
  const settle = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
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
    const actions = vi.fn().mockReturnValue([itemA]);
    const { target } = renderWithMenu(actions);

    fireEvent.contextMenu(target, { clientX: 10, clientY: 20 });
    const item = await screen.findByTestId('item-a');
    await settle();
    await settle();

    expect(screen.getByTestId('item-a')).toBe(item);

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
