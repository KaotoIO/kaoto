import './SortModal.scss';

import { Button, Form, ModalBody, ModalFooter, ModalHeader, ModalVariant, Title } from '@patternfly/react-core';
import { DragDropSort, DragDropSortDragEndEvent, DraggableObject } from '@patternfly/react-drag-drop';
import { LayerGroupIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useRef, useState } from 'react';

import { ForEachGroupItem, ForEachItem, SortItem } from '../../../../../models/datamapper/mapping';
import { DataMapperModal } from '../../../../DataMapper/DataMapperModal';
import { SortKey } from './SortKey';

interface SortKeyEntry {
  id: number;
  sortItem: SortItem;
}

interface SortModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapping: ForEachItem | ForEachGroupItem;
  onUpdate: () => void;
}

export const SortModal: FunctionComponent<SortModalProps> = ({ isOpen, onClose, mapping, onUpdate }) => {
  const nextId = useRef(0);

  const assignId = useCallback((sortItem: SortItem): SortKeyEntry => ({ id: nextId.current++, sortItem }), []);

  const [entries, setEntries] = useState<SortKeyEntry[]>(() =>
    mapping.sortItems.length > 0 ? mapping.sortItems.map((s) => assignId(s.clone())) : [assignId(new SortItem())],
  );

  const isDraggingRef = useRef(false);

  const handleModalClose = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    onClose();
  }, [onClose]);

  const handleSave = useCallback(() => {
    mapping.sortItems = entries.map((e) => e.sortItem).filter((s) => s.expression.trim() !== '');
    onUpdate();
    onClose();
  }, [entries, mapping, onUpdate, onClose]);

  const handleAdd = useCallback(() => {
    setEntries((prev) => [...prev, assignId(new SortItem())]);
  }, [assignId]);

  const handleRemove = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleChange = useCallback((index: number, sortItem: SortItem) => {
    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = { id: updated[index].id, sortItem };
      return updated;
    });
  }, []);

  const handleDrag = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const handleDrop = useCallback(
    (_event: DragDropSortDragEndEvent, newItems: DraggableObject[]) => {
      isDraggingRef.current = false;
      const idMap = new Map(entries.map((e) => [String(e.id), e]));
      const reordered = newItems
        .map((item) => idMap.get(String(item.id)))
        .filter((e): e is SortKeyEntry => e !== undefined);
      setEntries(reordered);
    },
    [entries],
  );

  const draggableItems: DraggableObject[] = entries.map((entry, index) => ({
    id: String(entry.id),
    props: { className: 'sort-modal__sortable-item' },
    content: (
      <SortKey
        key={entry.id}
        index={index}
        sortItem={entry.sortItem}
        mapping={mapping}
        onChange={handleChange}
        onRemove={handleRemove}
      />
    ),
  }));

  const description = `${mapping instanceof ForEachItem ? 'for-each' : 'for-each-group'}: ${mapping.expression}`;

  return (
    <DataMapperModal
      isOpen={isOpen}
      variant={ModalVariant.medium}
      onClose={handleModalClose}
      data-testid="sort-modal"
      aria-label="Sort Configuration Modal"
    >
      <ModalHeader title="Configure Sort" titleIconVariant={LayerGroupIcon} description={description} />
      <ModalBody>
        <Form>
          <Title headingLevel="h4">Sort keys</Title>
          <div className="sort-modal__draggable-list">
            <DragDropSort items={draggableItems} onDrag={handleDrag} onDrop={handleDrop} variant="default" />
          </div>
          <Button variant="link" icon={<PlusCircleIcon />} onClick={handleAdd} data-testid="sort-add-key">
            Add sort key
          </Button>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button key="save" variant="primary" onClick={handleSave} data-testid="sort-save-btn">
          Save
        </Button>
        <Button key="cancel" variant="link" onClick={onClose} data-testid="sort-cancel-btn">
          Cancel
        </Button>
      </ModalFooter>
    </DataMapperModal>
  );
};
