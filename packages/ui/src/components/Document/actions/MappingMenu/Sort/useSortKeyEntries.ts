import { DragDropSortDragEndEvent, DraggableObject } from '@patternfly/react-drag-drop';
import { useCallback, useRef, useState } from 'react';

import { SortItem } from '../../../../../models/datamapper/mapping';

export interface SortKeyEntry {
  id: number;
  sortItem: SortItem;
}

export interface SortKeyEntriesResult {
  entries: SortKeyEntry[];
  handleModalClose: () => void;
  handleAdd: () => void;
  handleRemove: (index: number) => void;
  handleChange: (index: number, sortItem: SortItem) => void;
  handleDrag: () => void;
  handleDrop: (event: DragDropSortDragEndEvent, newItems: DraggableObject[]) => void;
  getSortItems: () => SortItem[];
}

export function useSortKeyEntries(
  sortItems: SortItem[],
  onClose: () => void,
  initialEntries: SortItem[] = [],
): SortKeyEntriesResult {
  const nextId = useRef(0);
  const assignId = useCallback((sortItem: SortItem): SortKeyEntry => ({ id: nextId.current++, sortItem }), []);

  const [entries, setEntries] = useState<SortKeyEntry[]>(() =>
    sortItems.length > 0 ? sortItems.map((s) => assignId(s.clone())) : initialEntries.map((s) => assignId(s)),
  );

  const isDraggingRef = useRef(false);

  const handleModalClose = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    onClose();
  }, [onClose]);

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

  const getSortItems = useCallback(
    () => entries.map((e) => e.sortItem).filter((s) => s.expression.trim() !== ''),
    [entries],
  );

  return {
    entries,
    handleModalClose,
    handleAdd,
    handleRemove,
    handleChange,
    handleDrag,
    handleDrop,
    getSortItems,
  };
}
