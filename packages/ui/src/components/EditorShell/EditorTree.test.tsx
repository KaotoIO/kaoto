import { TreeNode } from '@carbon/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { EditorTree, EditorTreeProps } from './EditorTree';

const renderTree = (props: Partial<EditorTreeProps> = {}) => {
  const resolveSelection = vi.fn((treeItem: HTMLElement) => treeItem.id !== 'unknown');
  const onDelete = vi.fn();
  const result = render(
    <EditorTree
      label="Test tree"
      menuLabel="Test actions"
      resolveSelection={resolveSelection}
      onDelete={onDelete}
      {...props}
    >
      <TreeNode id="row-0" label="first" />
      <TreeNode id="row-1" label="second" />
      <TreeNode id="unknown" label="mystery" />
    </EditorTree>,
  );
  return { ...result, resolveSelection, onDelete };
};

describe('EditorTree', () => {
  it('renders the tree with its label and children', () => {
    renderTree();

    expect(screen.getByRole('tree', { name: 'Test tree' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem')).toHaveLength(3);
    expect(screen.getByText('first')).toBeInTheDocument();
  });

  it('applies className to the wrapper element', () => {
    const { container } = renderTree({ className: 'my-tree' });

    expect(container.firstElementChild).toHaveClass('my-tree');
  });

  it('marks the node matching activeId as active and follows it across rerenders', () => {
    const { container, rerender, resolveSelection, onDelete } = renderTree({ activeId: 'row-1' });

    expect(container.querySelector('#row-1')).toHaveClass('cds--tree-node--active');
    expect(container.querySelector('#row-0')).not.toHaveClass('cds--tree-node--active');

    rerender(
      <EditorTree
        label="Test tree"
        menuLabel="Test actions"
        activeId="row-0"
        resolveSelection={resolveSelection}
        onDelete={onDelete}
      >
        <TreeNode id="row-0" label="first" />
        <TreeNode id="row-1" label="second" />
        <TreeNode id="unknown" label="mystery" />
      </EditorTree>,
    );

    expect(container.querySelector('#row-0')).toHaveClass('cds--tree-node--active');
    expect(container.querySelector('#row-1')).not.toHaveClass('cds--tree-node--active');
  });

  it('opens the menu on right-click and asks the editor to resolve the clicked tree item', async () => {
    const { resolveSelection } = renderTree();

    fireEvent.contextMenu(screen.getByText('second'), { clientX: 120, clientY: 80 });

    const menu = await screen.findByRole('menu', { name: 'Test actions' });
    expect(menu).toBeInTheDocument();
    expect(resolveSelection).toHaveBeenCalledOnce();
    expect(resolveSelection.mock.calls[0][0].id).toBe('row-1');

    const deleteAction = screen.getByRole('menuitem', { name: /Delete/ });
    expect(deleteAction).toHaveClass('cds--menu-item--danger');
    expect(deleteAction.querySelector('svg')).toBeInTheDocument();
  });

  it('does not open the menu when the editor rejects the tree item', () => {
    const { resolveSelection } = renderTree();

    fireEvent.contextMenu(screen.getByText('mystery'));

    expect(resolveSelection).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu', { name: 'Test actions' })).not.toBeInTheDocument();
  });

  it('ignores right-clicks that are not on a tree item', () => {
    const { resolveSelection } = renderTree();

    fireEvent.contextMenu(screen.getByRole('tree', { name: 'Test tree' }));

    expect(resolveSelection).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu', { name: 'Test actions' })).not.toBeInTheDocument();
  });

  it('calls onDelete and closes the menu when Delete is clicked', async () => {
    const { onDelete } = renderTree();

    fireEvent.contextMenu(screen.getByText('first'));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete/ }));

    expect(onDelete).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'Test actions' })).not.toBeInTheDocument();
    });
  });

  it('puts deleteTestId on the Delete menu item', async () => {
    renderTree({ deleteTestId: 'custom-delete-btn' });

    fireEvent.contextMenu(screen.getByText('first'));

    expect(await screen.findByTestId('custom-delete-btn')).toHaveTextContent('Delete');
  });

  it('moves the single open menu when another row is right-clicked', async () => {
    renderTree();

    fireEvent.contextMenu(screen.getByText('first'), { clientX: 20, clientY: 30 });
    await waitFor(() => {
      expect(screen.getByRole('menu', { name: 'Test actions' })).toHaveStyle({
        insetInlineStart: '20px',
        insetBlockStart: '30px',
      });
    });

    fireEvent.contextMenu(screen.getByText('second'), { clientX: 220, clientY: 230 });

    await waitFor(() => {
      expect(screen.getAllByRole('menu', { name: 'Test actions' })).toHaveLength(1);
      expect(screen.getByRole('menu', { name: 'Test actions' })).toHaveStyle({
        insetInlineStart: '220px',
        insetBlockStart: '230px',
      });
    });
  });

  it('closes the menu with Escape (returning focus to the row) and with a pointer down outside', async () => {
    renderTree();

    const treeItem = screen.getByText('first').closest('[role="treeitem"]');
    if (!(treeItem instanceof HTMLElement)) expect.unreachable('tree item not found');

    fireEvent.contextMenu(treeItem);
    const deleteAction = await screen.findByRole('menuitem', { name: /Delete/ });
    await waitFor(() => {
      expect(deleteAction).toHaveFocus();
    });
    fireEvent.keyDown(deleteAction, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'Test actions' })).not.toBeInTheDocument();
    });
    expect(treeItem).toHaveFocus();

    fireEvent.contextMenu(screen.getByText('first'));
    expect(await screen.findByRole('menu', { name: 'Test actions' })).toBeInTheDocument();
    fireEvent.pointerDown(globalThis.document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'Test actions' })).not.toBeInTheDocument();
    });
  });
});
