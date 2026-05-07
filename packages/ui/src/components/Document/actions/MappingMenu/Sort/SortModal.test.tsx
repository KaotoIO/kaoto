import { DraggableObject } from '@patternfly/react-drag-drop';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent } from 'react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../../models/datamapper/document';
import { ForEachItem, MappingTree, SortItem } from '../../../../../models/datamapper/mapping';
import { SortModal } from './SortModal';

jest.mock('@patternfly/react-drag-drop', () => ({
  DragDropSort: (({
    items,
    onDrag,
    onDrop,
  }: {
    items: DraggableObject[];
    onDrag?: () => void;
    onDrop?: (event: unknown, newItems: DraggableObject[]) => void;
  }) => (
    <div data-testid="drag-drop-sort">
      {onDrag && <button data-testid="mock-drag-trigger" onClick={() => onDrag()} />}
      {onDrop && (
        <button data-testid="mock-drop-trigger" onClick={() => onDrop(undefined, [...items].reverse())} />
      )}
      {items.map((item) => (
        <div key={item.id}>{item.content}</div>
      ))}
    </div>
  )) as FunctionComponent<{
    items: DraggableObject[];
    onDrag?: () => void;
    onDrop?: (event: unknown, newItems: DraggableObject[]) => void;
  }>,
}));

jest.mock('../../../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

jest.mock('../../../../XPath/XPathEditorModal', () => ({
  XPathEditorModal: ({
    onClose,
    onUpdate,
    title,
  }: {
    onClose: () => void;
    onUpdate: () => void;
    title: string;
  }) => (
    <div data-testid="xpath-editor-modal">
      <span>{title}</span>
      <button data-testid="xpath-editor-update" onClick={onUpdate} />
      <button data-testid="xpath-editor-close" onClick={onClose} />
    </div>
  ),
}));

const getExpressionInput = (index: number) =>
  screen.getByTestId(`sort-expression-${index}`).querySelector('input') as HTMLInputElement;

describe('SortModal', () => {
  let mappingTree: MappingTree;
  let forEachItem: ForEachItem;

  beforeEach(() => {
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    forEachItem = new ForEachItem(mappingTree);
    forEachItem.expression = '/items/item';

    const { useDataMapper } = jest.requireMock('../../../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      sourceBodyDocument: { fields: [], getReferenceId: () => '' },
      sourceParameterMap: new Map(),
      mappingTree: { namespaceMap: {} },
    });
  });

  it('should render when isOpen is true', () => {
    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('sort-modal')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<SortModal isOpen={false} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);
    expect(screen.queryByTestId('sort-modal')).not.toBeInTheDocument();
  });

  it('should display for-each expression in subtitle', () => {
    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);
    expect(screen.getByText('for-each: /items/item')).toBeInTheDocument();
  });

  it('should display existing sort items', () => {
    const sort1 = new SortItem();
    sort1.expression = 'Title';
    sort1.order = 'ascending';
    const sort2 = new SortItem();
    sort2.expression = 'Price';
    sort2.order = 'descending';
    forEachItem.sortItems = [sort1, sort2];

    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);

    expect(getExpressionInput(0).value).toBe('Title');
    expect(getExpressionInput(1).value).toBe('Price');

    const orderBtn1 = screen.getByTestId('sort-order-1');
    expect(orderBtn1).toHaveAttribute('aria-label', 'Sort order 2: descending');
  });

  it('should start with one empty sort key when no existing sort items', () => {
    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('sort-expression-0')).toBeInTheDocument();
    expect(screen.queryByTestId('sort-expression-1')).not.toBeInTheDocument();
  });

  it('should add a new sort key', () => {
    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);
    act(() => {
      fireEvent.click(screen.getByTestId('sort-add-key'));
    });
    expect(screen.getByTestId('sort-expression-1')).toBeInTheDocument();
  });

  it('should remove a sort key', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);
    expect(screen.getByTestId('sort-expression-0')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('sort-remove-0'));
    });
    expect(screen.queryByTestId('sort-expression-0')).not.toBeInTheDocument();
  });

  it('should save sort items to mapping on Save', async () => {
    const onUpdate = jest.fn();
    const onClose = jest.fn();
    render(<SortModal isOpen={true} onClose={onClose} mapping={forEachItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.change(getExpressionInput(0), { target: { value: 'Title' } });
    });

    act(() => {
      fireEvent.click(screen.getByTestId('sort-save-btn'));
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    expect(forEachItem.sortItems).toHaveLength(1);
    expect(forEachItem.sortItems[0].expression).toBe('Title');
    expect(forEachItem.sortItems[0].order).toBe('ascending');
  });

  it('should not modify mapping on Cancel', async () => {
    forEachItem.sortItems = [];
    const onUpdate = jest.fn();
    const onClose = jest.fn();
    render(<SortModal isOpen={true} onClose={onClose} mapping={forEachItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.change(getExpressionInput(0), { target: { value: 'something' } });
    });

    act(() => {
      fireEvent.click(screen.getByTestId('sort-cancel-btn'));
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(forEachItem.sortItems).toHaveLength(0);
  });

  it('should filter out empty expressions on Save', async () => {
    const onUpdate = jest.fn();
    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.click(screen.getByTestId('sort-add-key'));
    });

    act(() => {
      fireEvent.change(getExpressionInput(1), { target: { value: 'Price' } });
    });

    act(() => {
      fireEvent.click(screen.getByTestId('sort-save-btn'));
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachItem.sortItems).toHaveLength(1);
    expect(forEachItem.sortItems[0].expression).toBe('Price');
  });

  it('should toggle sort order on click', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);

    const orderBtn = screen.getByTestId('sort-order-0');
    expect(orderBtn).toHaveAttribute('aria-label', 'Sort order 1: ascending');

    act(() => {
      fireEvent.click(orderBtn);
    });

    expect(screen.getByTestId('sort-order-0')).toHaveAttribute('aria-label', 'Sort order 1: descending');
  });

  it('should not call onClose when drag just ended', () => {
    const onClose = jest.fn();
    render(<SortModal isOpen={true} onClose={onClose} mapping={forEachItem} onUpdate={jest.fn()} />);

    act(() => {
      fireEvent.click(screen.getByTestId('mock-drag-trigger'));
    });

    act(() => {
      fireEvent.keyDown(screen.getByTestId('sort-modal'), { key: 'Escape' });
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should reorder entries on drop', async () => {
    const sort1 = new SortItem();
    sort1.expression = 'Title';
    const sort2 = new SortItem();
    sort2.expression = 'Price';
    forEachItem.sortItems = [sort1, sort2];

    const onUpdate = jest.fn();
    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={onUpdate} />);

    expect(getExpressionInput(0).value).toBe('Title');
    expect(getExpressionInput(1).value).toBe('Price');

    act(() => {
      fireEvent.click(screen.getByTestId('mock-drop-trigger'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('sort-save-btn'));
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachItem.sortItems[0].expression).toBe('Price');
    expect(forEachItem.sortItems[1].expression).toBe('Title');
  });

  it('should open XPath editor on edit button click', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('sort-edit-xpath-0'));
    });

    expect(screen.getByTestId('xpath-editor-modal')).toBeInTheDocument();
    expect(screen.getByText('Sort key 1')).toBeInTheDocument();
  });

  it('should close XPath editor on close callback', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={jest.fn()} />);

    act(() => {
      fireEvent.click(screen.getByTestId('sort-edit-xpath-0'));
    });
    expect(screen.getByTestId('xpath-editor-modal')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('xpath-editor-close'));
    });
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();
  });

  it('should apply XPath editor expression on update callback', async () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    const onUpdate = jest.fn();
    render(<SortModal isOpen={true} onClose={jest.fn()} mapping={forEachItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.click(screen.getByTestId('sort-edit-xpath-0'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('xpath-editor-update'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('sort-save-btn'));
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
  });
});
