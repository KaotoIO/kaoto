import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../../models/datamapper/document';
import { ForEachGroupItem, GroupingStrategy, MappingTree, SortItem } from '../../../../../models/datamapper/mapping';
import {
  createSortModalWrapper,
  endSortKeyDrag,
  startSortKeyDrag,
  typeInXPathEditor,
} from '../../../../../stubs/datamapper/sort-modal-test-helpers';
import { ForEachGroupModal } from './ForEachGroupModal';

describe('ForEachGroupModal', () => {
  // Never leave a drag running: it would swallow the clicks of later tests (see endPointerDrag)
  afterEach(async () => {
    await endSortKeyDrag();
  });

  let mappingTree: MappingTree;
  let forEachGroupItem: ForEachGroupItem;
  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(() => {
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    forEachGroupItem = new ForEachGroupItem(mappingTree);
    forEachGroupItem.expression = '/Orders/Order';
    forEachGroupItem.groupingStrategy = GroupingStrategy.GROUP_BY;
    forEachGroupItem.groupingExpression = 'Category';

    wrapper = createSortModalWrapper(mappingTree);
  });

  it('should render when isOpen is true', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('for-each-group-modal')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<ForEachGroupModal isOpen={false} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, {
      wrapper,
    });
    expect(screen.queryByTestId('for-each-group-modal')).not.toBeInTheDocument();
  });

  it('should display for-each-group expression in description', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByText('for-each-group: /Orders/Order')).toBeInTheDocument();
  });

  it('should display current grouping strategy in dropdown', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('for-each-group-strategy-toggle')).toHaveTextContent('Group By');
  });

  it('should display current grouping expression in input', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Category');
  });

  it('should disable Save when grouping expression is empty', () => {
    forEachGroupItem.groupingExpression = '';
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('for-each-group-save-btn')).toBeDisabled();
  });

  it('should enable Save when grouping expression is non-empty', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('for-each-group-save-btn')).toBeEnabled();
  });

  it('should disable Save when grouping expression is cleared', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });

    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });

    expect(screen.getByTestId('for-each-group-save-btn')).toBeDisabled();
  });

  it('should change grouping strategy via dropdown', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });

    fireEvent.click(screen.getByTestId('for-each-group-strategy-toggle'));

    fireEvent.click(screen.getByText('Group Adjacent'));

    expect(screen.getByTestId('for-each-group-strategy-toggle')).toHaveTextContent('Group Adjacent');
  });

  it('should update grouping expression input', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });

    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '@customerId' } });

    expect(input.value).toBe('@customerId');
  });

  it('should save grouping strategy and expression to mapping on Save', async () => {
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    render(<ForEachGroupModal isOpen onClose={onClose} mapping={forEachGroupItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('for-each-group-strategy-toggle'));

    fireEvent.click(screen.getByText('Group Adjacent'));

    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '@type' } });

    fireEvent.click(screen.getByTestId('for-each-group-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    expect(forEachGroupItem.groupingStrategy).toBe(GroupingStrategy.GROUP_ADJACENT);
    expect(forEachGroupItem.groupingExpression).toBe('@type');
  });

  it('should not modify mapping on Cancel', async () => {
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    render(<ForEachGroupModal isOpen onClose={onClose} mapping={forEachGroupItem} onUpdate={onUpdate} />, { wrapper });

    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'something-else' } });

    fireEvent.click(screen.getByTestId('for-each-group-cancel-btn'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(forEachGroupItem.groupingStrategy).toBe(GroupingStrategy.GROUP_BY);
    expect(forEachGroupItem.groupingExpression).toBe('Category');
  });

  it('should open XPath editor for grouping expression', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('for-each-group-edit-expression'));

    expect(screen.getByTestId('xpath-editor-modal')).toBeInTheDocument();
    expect(screen.getByText('XPath Editor: Grouping expression')).toBeInTheDocument();
  });

  it('should apply XPath editor expression to grouping expression', async () => {
    const onUpdate = vi.fn();
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('for-each-group-edit-expression'));

    await typeInXPathEditor('NewExpression');

    fireEvent.click(screen.getByTestId('for-each-group-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachGroupItem.groupingExpression).toBe('NewExpression');
  });

  it('should close XPath editor on close callback', () => {
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });

    fireEvent.click(screen.getByTestId('for-each-group-edit-expression'));
    expect(screen.getByTestId('xpath-editor-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-xpath-editor-btn'));
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();
  });

  it('should start with no sort keys when mapping has none', () => {
    forEachGroupItem.sortItems = [];
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.queryByTestId('sort-expression-0')).not.toBeInTheDocument();
  });

  it('should display existing sort items', () => {
    const sort1 = new SortItem();
    sort1.expression = 'Title';
    const sort2 = new SortItem();
    sort2.expression = 'Price';
    forEachGroupItem.sortItems = [sort1, sort2];

    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });

    const getInput = (idx: number) =>
      screen.getByTestId(`sort-expression-${idx}`).querySelector('input') as HTMLInputElement;
    expect(getInput(0).value).toBe('Title');
    expect(getInput(1).value).toBe('Price');
  });

  it('should add a sort key', () => {
    forEachGroupItem.sortItems = [];
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-add-key'));
    expect(screen.getByTestId('sort-expression-0')).toBeInTheDocument();
  });

  it('should remove a sort key', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachGroupItem.sortItems = [sort];

    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('sort-expression-0')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sort-remove-0'));
    expect(screen.queryByTestId('sort-expression-0')).not.toBeInTheDocument();
  });

  it('should save sort items to mapping on Save', async () => {
    forEachGroupItem.sortItems = [];
    const onUpdate = vi.fn();
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-add-key'));

    const getInput = (idx: number) =>
      screen.getByTestId(`sort-expression-${idx}`).querySelector('input') as HTMLInputElement;

    fireEvent.change(getInput(0), { target: { value: 'Title' } });

    fireEvent.click(screen.getByTestId('for-each-group-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachGroupItem.sortItems).toHaveLength(1);
    expect(forEachGroupItem.sortItems[0].expression).toBe('Title');
  });

  it('should filter out empty sort expressions on Save', async () => {
    forEachGroupItem.sortItems = [];
    const onUpdate = vi.fn();
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-add-key'));
    fireEvent.click(screen.getByTestId('sort-add-key'));

    const getInput = (idx: number) =>
      screen.getByTestId(`sort-expression-${idx}`).querySelector('input') as HTMLInputElement;

    fireEvent.change(getInput(1), { target: { value: 'Price' } });

    fireEvent.click(screen.getByTestId('for-each-group-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachGroupItem.sortItems).toHaveLength(1);
    expect(forEachGroupItem.sortItems[0].expression).toBe('Price');
  });

  it('should not call onClose when drag just ended', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachGroupItem.sortItems = [sort];
    const onClose = vi.fn();
    render(<ForEachGroupModal isOpen onClose={onClose} mapping={forEachGroupItem} onUpdate={vi.fn()} />, { wrapper });

    startSortKeyDrag(0);

    fireEvent.keyDown(screen.getByTestId('for-each-group-modal'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should reorder sort entries on drop', async () => {
    const sort1 = new SortItem();
    sort1.expression = 'Title';
    const sort2 = new SortItem();
    sort2.expression = 'Price';
    forEachGroupItem.sortItems = [sort1, sort2];

    const onUpdate = vi.fn();
    render(<ForEachGroupModal isOpen onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={onUpdate} />, { wrapper });

    // Drag the second entry (Price) and drop it onto the first one (Title)
    startSortKeyDrag(1);
    await endSortKeyDrag();

    fireEvent.click(screen.getByTestId('for-each-group-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachGroupItem.sortItems[0].expression).toBe('Price');
    expect(forEachGroupItem.sortItems[1].expression).toBe('Title');
  });
});
