import { fireEvent, render, screen } from '@testing-library/react';

import { BeanTreeList } from './BeanTreeList';
import { BeanTreeToolbar } from './BeanTreeToolbar';

const required = ['name', 'type'];
const twoBeansModel = [
  { name: 'bean1', type: 'type1' },
  { name: 'bean2', type: 'type2' },
];

describe('BeanTreeToolbar', () => {
  test('Add bean menu item has correct data-testid', () => {
    render(<BeanTreeToolbar name="Beans" selected={-1} onAddBean={() => {}} onDeleteBean={() => {}} />);
    // Open the MenuButton
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByTestId('metadata-add-Beans-btn')).toBeInTheDocument();
  });

  test('Delete menu item is disabled when nothing is selected', () => {
    render(<BeanTreeToolbar name="Beans" selected={-1} onAddBean={() => {}} onDeleteBean={() => {}} />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByTestId('metadata-delete-btn')).toHaveAttribute('aria-disabled', 'true');
  });

  test('Delete menu item carries index data-testid when a bean is selected', () => {
    render(<BeanTreeToolbar name="Beans" selected={0} onAddBean={() => {}} onDeleteBean={() => {}} />);
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getByTestId('metadata-delete-0-btn')).toBeInTheDocument();
  });

  test('clicking Add calls onAddBean', () => {
    const onAdd = vi.fn();
    render(<BeanTreeToolbar name="Beans" selected={-1} onAddBean={onAdd} onDeleteBean={() => {}} />);
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByTestId('metadata-add-Beans-btn'));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  test('clicking Delete calls onDeleteBean', () => {
    const onDelete = vi.fn();
    render(<BeanTreeToolbar name="Beans" selected={1} onAddBean={() => {}} onDeleteBean={onDelete} />);
    fireEvent.click(screen.getByText('Actions'));
    fireEvent.click(screen.getByTestId('metadata-delete-1-btn'));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});

describe('BeanTreeList', () => {
  test.each([
    ['empty', []],
    ['populated', twoBeansModel],
  ])('always renders the "Beans" label when the list is %s', (_state, model) => {
    render(
      <BeanTreeList
        model={model}
        required={required}
        name="Beans"
        selected={-1}
        onSelected={() => {}}
        onAddBean={() => {}}
        onDeleteBean={() => {}}
      />,
    );
    expect(screen.getByText('Beans')).toBeInTheDocument();
    expect(screen.queryByText(/No beans/i)).not.toBeInTheDocument();
  });

  test('empty list has a single add entry point: the toolbar menu', () => {
    render(
      <BeanTreeList
        model={[]}
        required={required}
        name="beans"
        selected={-1}
        onSelected={() => {}}
        onAddBean={() => {}}
        onDeleteBean={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('Actions'));
    expect(screen.getAllByTestId('metadata-add-beans-btn')).toHaveLength(1);
  });

  test('renders one tree node per bean with its primary and secondary label', () => {
    render(
      <BeanTreeList
        model={twoBeansModel}
        required={required}
        name="beans"
        selected={-1}
        onSelected={() => {}}
        onAddBean={() => {}}
        onDeleteBean={() => {}}
      />,
    );
    expect(screen.getByTestId('metadata-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-row-1')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-row-0')).toHaveTextContent('bean1');
    expect(screen.getByTestId('metadata-row-0')).toHaveTextContent('type1');
  });

  test('clicking a tree node calls onSelected with its index', () => {
    const onSelected = vi.fn();
    render(
      <BeanTreeList
        model={twoBeansModel}
        required={required}
        name="beans"
        selected={-1}
        onSelected={onSelected}
        onAddBean={() => {}}
        onDeleteBean={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('metadata-row-1'));
    expect(onSelected).toHaveBeenCalledWith(1);
  });

  test('the active tree node follows the selected prop across rerenders', () => {
    const props = {
      model: twoBeansModel,
      required,
      name: 'beans',
      onSelected: () => {},
      onAddBean: () => {},
      onDeleteBean: () => {},
    };
    const { rerender } = render(<BeanTreeList {...props} selected={0} />);
    expect(screen.getByTestId('metadata-row-0')).toHaveClass('cds--tree-node--active');
    expect(screen.getByTestId('metadata-row-1')).not.toHaveClass('cds--tree-node--active');

    rerender(<BeanTreeList {...props} selected={1} />);
    expect(screen.getByTestId('metadata-row-0')).not.toHaveClass('cds--tree-node--active');
    expect(screen.getByTestId('metadata-row-1')).toHaveClass('cds--tree-node--active');

    rerender(<BeanTreeList {...props} selected={-1} />);
    expect(screen.getByTestId('metadata-row-0')).not.toHaveClass('cds--tree-node--active');
    expect(screen.getByTestId('metadata-row-1')).not.toHaveClass('cds--tree-node--active');
  });

  describe('context menu', () => {
    const renderList = (selected: number, onSelected = vi.fn(), onDeleteBean = vi.fn()) =>
      render(
        <BeanTreeList
          model={twoBeansModel}
          required={required}
          name="beans"
          selected={selected}
          onSelected={onSelected}
          onAddBean={() => {}}
          onDeleteBean={onDeleteBean}
        />,
      );

    test('right-clicking a row selects it and opens a menu with Delete', async () => {
      const onSelected = vi.fn();
      renderList(-1, onSelected);

      fireEvent.contextMenu(screen.getByText('bean2'));

      expect(await screen.findByRole('menu', { name: 'Bean actions' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /Delete/ })).toBeInTheDocument();
      expect(onSelected).toHaveBeenCalledExactlyOnceWith(1);
    });

    test('right-clicking the already selected row does not select it again', async () => {
      const onSelected = vi.fn();
      renderList(1, onSelected);

      fireEvent.contextMenu(screen.getByText('bean2'));

      expect(await screen.findByRole('menu', { name: 'Bean actions' })).toBeInTheDocument();
      expect(onSelected).not.toHaveBeenCalled();
    });
  });
});
