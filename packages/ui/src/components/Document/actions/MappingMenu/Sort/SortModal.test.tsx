import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../../models/datamapper/document';
import { ForEachItem, MappingTree, SortItem } from '../../../../../models/datamapper/mapping';
import {
  createSortModalWrapper,
  endSortKeyDrag,
  startSortKeyDrag,
  typeInXPathEditor,
} from '../../../../../stubs/datamapper/sort-modal-test-helpers';
import { SortModal } from './SortModal';

const getExpressionInput = (index: number) =>
  screen.getByTestId(`sort-expression-${index}`).querySelector('input') as HTMLInputElement;

describe('SortModal', () => {
  // Never leave a drag running: it would swallow the clicks of later tests (see endPointerDrag)
  afterEach(async () => {
    await endSortKeyDrag();
  });

  let mappingTree: MappingTree;
  let forEachItem: ForEachItem;
  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(() => {
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    forEachItem = new ForEachItem(mappingTree);
    forEachItem.expression = '/items/item';

    wrapper = createSortModalWrapper(mappingTree);
  });

  it('should render when isOpen is true', () => {
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('sort-modal')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<SortModal isOpen={false} onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.queryByTestId('sort-modal')).not.toBeInTheDocument();
  });

  it('should display for-each expression in subtitle', () => {
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });
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

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });

    expect(getExpressionInput(0).value).toBe('Title');
    expect(getExpressionInput(1).value).toBe('Price');

    const orderBtn1 = screen.getByTestId('sort-order-1');
    expect(orderBtn1).toHaveAttribute('aria-label', 'Sort order 2: descending');
  });

  it('should start with one empty sort key when no existing sort items', () => {
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('sort-expression-0')).toBeInTheDocument();
    expect(screen.queryByTestId('sort-expression-1')).not.toBeInTheDocument();
  });

  it('should add a new sort key', () => {
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });
    fireEvent.click(screen.getByTestId('sort-add-key'));
    expect(screen.getByTestId('sort-expression-1')).toBeInTheDocument();
  });

  it('should remove a sort key', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.getByTestId('sort-expression-0')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sort-remove-0'));
    expect(screen.queryByTestId('sort-expression-0')).not.toBeInTheDocument();
  });

  it('should save sort items to mapping on Save', async () => {
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    render(<SortModal isOpen onClose={onClose} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.change(getExpressionInput(0), { target: { value: 'Title' } });

    fireEvent.click(screen.getByTestId('sort-save-btn'));

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
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    render(<SortModal isOpen onClose={onClose} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.change(getExpressionInput(0), { target: { value: 'something' } });

    fireEvent.click(screen.getByTestId('sort-cancel-btn'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(forEachItem.sortItems).toHaveLength(0);
  });

  it('should filter out empty expressions on Save', async () => {
    const onUpdate = vi.fn();
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-add-key'));

    fireEvent.change(getExpressionInput(1), { target: { value: 'Price' } });

    fireEvent.click(screen.getByTestId('sort-save-btn'));

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

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });

    const orderBtn = screen.getByTestId('sort-order-0');
    expect(orderBtn).toHaveAttribute('aria-label', 'Sort order 1: ascending');

    fireEvent.click(orderBtn);

    expect(screen.getByTestId('sort-order-0')).toHaveAttribute('aria-label', 'Sort order 1: descending');
  });

  it('should not call onClose when drag just ended', () => {
    const onClose = vi.fn();
    render(<SortModal isOpen onClose={onClose} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });

    startSortKeyDrag(0);

    fireEvent.keyDown(screen.getByTestId('sort-modal'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should reorder entries on drop', async () => {
    const sort1 = new SortItem();
    sort1.expression = 'Title';
    const sort2 = new SortItem();
    sort2.expression = 'Price';
    forEachItem.sortItems = [sort1, sort2];

    const onUpdate = vi.fn();
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    expect(getExpressionInput(0).value).toBe('Title');
    expect(getExpressionInput(1).value).toBe('Price');

    // Drag the second entry (Price) and drop it onto the first one (Title)
    startSortKeyDrag(1);
    await endSortKeyDrag();

    fireEvent.click(screen.getByTestId('sort-save-btn'));

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

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sort-edit-xpath-0'));

    expect(screen.getByTestId('xpath-editor-modal')).toBeInTheDocument();
    expect(screen.getByText('XPath Editor: Sort key 1')).toBeInTheDocument();
  });

  it('should close XPath editor on close callback', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-edit-xpath-0'));
    expect(screen.getByTestId('xpath-editor-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-xpath-editor-btn'));
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();
  });

  it('should apply XPath editor expression on update callback', async () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    const onUpdate = vi.fn();
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-edit-xpath-0'));

    const newExpression = 'Price';
    await typeInXPathEditor(newExpression);

    fireEvent.click(screen.getByTestId('sort-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachItem.sortItems[0].expression).toBe(newExpression);
  });

  it('should toggle advanced panel on SettingsAdjust click', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });
    expect(screen.queryByTestId('sort-advanced-panel-0')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sort-advanced-0'));
    expect(screen.getByTestId('sort-advanced-panel-0')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('sort-advanced-0'));
    expect(screen.queryByTestId('sort-advanced-panel-0')).not.toBeInTheDocument();
  });

  it('should save advanced properties to mapping on Save', async () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    sort.lang = 'en';
    sort.dataType = 'number';
    forEachItem.sortItems = [sort];

    const onUpdate = vi.fn();
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachItem.sortItems[0].lang).toBe('en');
    expect(forEachItem.sortItems[0].dataType).toBe('number');
  });

  it('should preserve advanced properties across expression changes', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    sort.lang = 'de';
    sort.dataType = 'text';
    sort.caseOrder = 'upper-first';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });

    fireEvent.change(getExpressionInput(0), { target: { value: 'Price' } });

    fireEvent.click(screen.getByTestId('sort-advanced-0'));

    const langInput = screen.getByTestId('sort-lang-0').querySelector('input') as HTMLInputElement;
    expect(langInput.value).toBe('de');
  });

  it('should preserve advanced properties across order toggles', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    sort.stable = 'yes';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-order-0'));

    fireEvent.click(screen.getByTestId('sort-advanced-0'));

    const stableToggle = screen.getByTestId('sort-stable-toggle-0');
    expect(stableToggle).toHaveTextContent('yes');
  });

  it('should show settings-configured indicator when advanced properties are set', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    sort.lang = 'en';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });

    const advancedBtn = screen.getByTestId('sort-advanced-0');
    expect(advancedBtn).toHaveClass('sort-modal__settings-configured');
  });

  it('should update lang via advanced panel and save', async () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    const onUpdate = vi.fn();
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-advanced-0'));

    const langInput = screen.getByTestId('sort-lang-0').querySelector('input') as HTMLInputElement;
    fireEvent.change(langInput, { target: { value: 'de' } });

    fireEvent.click(screen.getByTestId('sort-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachItem.sortItems[0].lang).toBe('de');
  });

  it('should update collation via advanced panel and save', async () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    const onUpdate = vi.fn();
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-advanced-0'));

    const collationInput = screen.getByTestId('sort-collation-0') as HTMLInputElement;
    fireEvent.change(collationInput, { target: { value: 'http://example.com/collation' } });

    fireEvent.click(screen.getByTestId('sort-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachItem.sortItems[0].collation).toBe('http://example.com/collation');
  });

  it('should update case order via Select in advanced panel', async () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    const onUpdate = vi.fn();
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-advanced-0'));

    fireEvent.click(screen.getByTestId('sort-case-order-toggle-0'));

    fireEvent.click(screen.getByText('upper-first'));

    fireEvent.click(screen.getByTestId('sort-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachItem.sortItems[0].caseOrder).toBe('upper-first');
  });

  it('should update stable via Select in advanced panel', async () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    const onUpdate = vi.fn();
    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={onUpdate} />, { wrapper });

    fireEvent.click(screen.getByTestId('sort-advanced-0'));

    fireEvent.click(screen.getByTestId('sort-stable-toggle-0'));

    fireEvent.click(screen.getByText('yes'));

    fireEvent.click(screen.getByTestId('sort-save-btn'));

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachItem.sortItems[0].stable).toBe('yes');
  });

  it('should not show settings-configured indicator when no advanced properties', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachItem.sortItems = [sort];

    render(<SortModal isOpen onClose={vi.fn()} mapping={forEachItem} onUpdate={vi.fn()} />, { wrapper });

    const advancedBtn = screen.getByTestId('sort-advanced-0');
    expect(advancedBtn).not.toHaveClass('sort-modal__settings-configured');
  });
});
