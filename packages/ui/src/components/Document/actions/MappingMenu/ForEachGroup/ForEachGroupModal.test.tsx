import { DraggableObject } from '@patternfly/react-drag-drop';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent } from 'react';

import { useDataMapper } from '../../../../../hooks/useDataMapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
} from '../../../../../models/datamapper/document';
import { ForEachGroupItem, GroupingStrategy, MappingTree, SortItem } from '../../../../../models/datamapper/mapping';
import { IDataMapperContext } from '../../../../../providers/datamapper.provider';
import { ForEachGroupModal } from './ForEachGroupModal';

vi.mock('@patternfly/react-drag-drop', () => ({
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
      {onDrop && <button data-testid="mock-drop-trigger" onClick={() => onDrop(undefined, [...items].reverse())} />}
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

vi.mock('../../../../../hooks/useDataMapper', () => ({
  useDataMapper: vi.fn(),
}));

let xpathEditorMapping: { expression: string } | undefined;

vi.mock('../../../../XPath/XPathEditorModal', () => ({
  XPathEditorModal: ({
    onClose,
    onUpdate,
    title,
    mapping,
  }: {
    onClose: () => void;
    onUpdate: () => void;
    title: string;
    mapping: { expression: string };
  }) => {
    xpathEditorMapping = mapping;
    return (
      <div data-testid="xpath-editor-modal">
        <span>{title}</span>
        <button data-testid="xpath-editor-update" onClick={onUpdate} />
        <button data-testid="xpath-editor-close" onClick={onClose} />
      </div>
    );
  },
}));

describe('ForEachGroupModal', () => {
  let mappingTree: MappingTree;
  let forEachGroupItem: ForEachGroupItem;

  afterEach(() => {
    xpathEditorMapping = undefined;
  });

  beforeEach(() => {
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    forEachGroupItem = new ForEachGroupItem(mappingTree);
    forEachGroupItem.expression = '/Orders/Order';
    forEachGroupItem.groupingStrategy = GroupingStrategy.GROUP_BY;
    forEachGroupItem.groupingExpression = 'Category';

    vi.mocked(useDataMapper).mockReturnValue({
      sourceBodyDocument: {
        documentType: DocumentType.SOURCE_BODY,
        documentId: BODY_DOCUMENT_ID,
        name: 'Source',
        definitionType: DocumentDefinitionType.XML_SCHEMA,
        fields: [],
        getReferenceId: () => '',
      } as unknown as IDocument,
      sourceParameterMap: new Map(),
      mappingTree: { namespaceMap: {} } as unknown as MappingTree,
    } as unknown as IDataMapperContext);
  });

  it('should render when isOpen is true', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('for-each-group-modal')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(<ForEachGroupModal isOpen={false} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.queryByTestId('for-each-group-modal')).not.toBeInTheDocument();
  });

  it('should display for-each-group expression in description', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.getByText('for-each-group: /Orders/Order')).toBeInTheDocument();
  });

  it('should display current grouping strategy in dropdown', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('for-each-group-strategy-toggle')).toHaveTextContent('Group By');
  });

  it('should display current grouping expression in input', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Category');
  });

  it('should disable Save when grouping expression is empty', () => {
    forEachGroupItem.groupingExpression = '';
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('for-each-group-save-btn')).toBeDisabled();
  });

  it('should enable Save when grouping expression is non-empty', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('for-each-group-save-btn')).toBeEnabled();
  });

  it('should disable Save when grouping expression is cleared', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);

    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '' } });
    });

    expect(screen.getByTestId('for-each-group-save-btn')).toBeDisabled();
  });

  it('should change grouping strategy via dropdown', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-strategy-toggle'));
    });

    act(() => {
      fireEvent.click(screen.getByText('Group Adjacent'));
    });

    expect(screen.getByTestId('for-each-group-strategy-toggle')).toHaveTextContent('Group Adjacent');
  });

  it('should update grouping expression input', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);

    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '@customerId' } });
    });

    expect(input.value).toBe('@customerId');
  });

  it('should save grouping strategy and expression to mapping on Save', async () => {
    const onUpdate = vi.fn();
    const onClose = vi.fn();
    render(<ForEachGroupModal isOpen={true} onClose={onClose} mapping={forEachGroupItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-strategy-toggle'));
    });

    act(() => {
      fireEvent.click(screen.getByText('Group Adjacent'));
    });

    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: '@type' } });
    });

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-save-btn'));
    });

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
    render(<ForEachGroupModal isOpen={true} onClose={onClose} mapping={forEachGroupItem} onUpdate={onUpdate} />);

    const input = screen.getByTestId('for-each-group-expression').querySelector('input') as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: 'something-else' } });
    });

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-cancel-btn'));
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(forEachGroupItem.groupingStrategy).toBe(GroupingStrategy.GROUP_BY);
    expect(forEachGroupItem.groupingExpression).toBe('Category');
  });

  it('should open XPath editor for grouping expression', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-edit-expression'));
    });

    expect(screen.getByTestId('xpath-editor-modal')).toBeInTheDocument();
    expect(screen.getByText('Grouping expression')).toBeInTheDocument();
  });

  it('should apply XPath editor expression to grouping expression', async () => {
    const onUpdate = vi.fn();
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-edit-expression'));
    });

    xpathEditorMapping!.expression = 'NewExpression';

    act(() => {
      fireEvent.click(screen.getByTestId('xpath-editor-update'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-save-btn'));
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachGroupItem.groupingExpression).toBe('NewExpression');
  });

  it('should close XPath editor on close callback', () => {
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-edit-expression'));
    });
    expect(screen.getByTestId('xpath-editor-modal')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('xpath-editor-close'));
    });
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();
  });

  it('should start with no sort keys when mapping has none', () => {
    forEachGroupItem.sortItems = [];
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.queryByTestId('sort-expression-0')).not.toBeInTheDocument();
  });

  it('should display existing sort items', () => {
    const sort1 = new SortItem();
    sort1.expression = 'Title';
    const sort2 = new SortItem();
    sort2.expression = 'Price';
    forEachGroupItem.sortItems = [sort1, sort2];

    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);

    const getInput = (idx: number) =>
      screen.getByTestId(`sort-expression-${idx}`).querySelector('input') as HTMLInputElement;
    expect(getInput(0).value).toBe('Title');
    expect(getInput(1).value).toBe('Price');
  });

  it('should add a sort key', () => {
    forEachGroupItem.sortItems = [];
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);

    act(() => {
      fireEvent.click(screen.getByTestId('sort-add-key'));
    });
    expect(screen.getByTestId('sort-expression-0')).toBeInTheDocument();
  });

  it('should remove a sort key', () => {
    const sort = new SortItem();
    sort.expression = 'Title';
    forEachGroupItem.sortItems = [sort];

    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={vi.fn()} />);
    expect(screen.getByTestId('sort-expression-0')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('sort-remove-0'));
    });
    expect(screen.queryByTestId('sort-expression-0')).not.toBeInTheDocument();
  });

  it('should save sort items to mapping on Save', async () => {
    forEachGroupItem.sortItems = [];
    const onUpdate = vi.fn();
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.click(screen.getByTestId('sort-add-key'));
    });

    const getInput = (idx: number) =>
      screen.getByTestId(`sort-expression-${idx}`).querySelector('input') as HTMLInputElement;

    act(() => {
      fireEvent.change(getInput(0), { target: { value: 'Title' } });
    });

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-save-btn'));
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachGroupItem.sortItems).toHaveLength(1);
    expect(forEachGroupItem.sortItems[0].expression).toBe('Title');
  });

  it('should filter out empty sort expressions on Save', async () => {
    forEachGroupItem.sortItems = [];
    const onUpdate = vi.fn();
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.click(screen.getByTestId('sort-add-key'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('sort-add-key'));
    });

    const getInput = (idx: number) =>
      screen.getByTestId(`sort-expression-${idx}`).querySelector('input') as HTMLInputElement;

    act(() => {
      fireEvent.change(getInput(1), { target: { value: 'Price' } });
    });

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-save-btn'));
    });

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
    render(<ForEachGroupModal isOpen={true} onClose={onClose} mapping={forEachGroupItem} onUpdate={vi.fn()} />);

    act(() => {
      fireEvent.click(screen.getByTestId('mock-drag-trigger'));
    });

    act(() => {
      fireEvent.keyDown(screen.getByTestId('for-each-group-modal'), { key: 'Escape' });
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should reorder sort entries on drop', async () => {
    const sort1 = new SortItem();
    sort1.expression = 'Title';
    const sort2 = new SortItem();
    sort2.expression = 'Price';
    forEachGroupItem.sortItems = [sort1, sort2];

    const onUpdate = vi.fn();
    render(<ForEachGroupModal isOpen={true} onClose={vi.fn()} mapping={forEachGroupItem} onUpdate={onUpdate} />);

    act(() => {
      fireEvent.click(screen.getByTestId('mock-drop-trigger'));
    });

    act(() => {
      fireEvent.click(screen.getByTestId('for-each-group-save-btn'));
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
    expect(forEachGroupItem.sortItems[0].expression).toBe('Price');
    expect(forEachGroupItem.sortItems[1].expression).toBe('Title');
  });
});
