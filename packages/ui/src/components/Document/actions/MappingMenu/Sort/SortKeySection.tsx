import { Button } from '@patternfly/react-core';
import { DragDropSort, DragDropSortDragEndEvent, DraggableObject } from '@patternfly/react-drag-drop';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { ForEachGroupItem, ForEachItem, SortItem } from '../../../../../models/datamapper/mapping';
import { SortKey } from './SortKey';
import { SortKeyEntry } from './useSortKeyEntries';

interface SortKeySectionProps {
  entries: SortKeyEntry[];
  mapping: ForEachItem | ForEachGroupItem;
  onAdd: () => void;
  onChange: (index: number, sortItem: SortItem) => void;
  onRemove: (index: number) => void;
  onDrag: () => void;
  onDrop: (event: DragDropSortDragEndEvent, newItems: DraggableObject[]) => void;
  hideWhenEmpty?: boolean;
}

export const SortKeySection: FunctionComponent<SortKeySectionProps> = ({
  entries,
  mapping,
  onAdd,
  onChange,
  onRemove,
  onDrag,
  onDrop,
  hideWhenEmpty,
}) => {
  const draggableItems: DraggableObject[] = entries.map((entry, index) => ({
    id: String(entry.id),
    props: { className: 'sort-modal__sortable-item' },
    content: (
      <SortKey
        key={entry.id}
        index={index}
        sortItem={entry.sortItem}
        mapping={mapping}
        onChange={onChange}
        onRemove={onRemove}
      />
    ),
  }));

  const showList = hideWhenEmpty ? entries.length > 0 : true;

  return (
    <>
      {showList && (
        <div className="sort-modal__draggable-list">
          <DragDropSort items={draggableItems} onDrag={onDrag} onDrop={onDrop} variant="default" />
        </div>
      )}
      <Button variant="link" icon={<PlusCircleIcon />} onClick={onAdd} data-testid="sort-add-key">
        Add sort key
      </Button>
    </>
  );
};
