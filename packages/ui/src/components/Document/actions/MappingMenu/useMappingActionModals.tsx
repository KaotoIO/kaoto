import { useCallback, useMemo, useState } from 'react';

import { ForEachGroupItem, ForEachItem, MappingItem } from '../../../../models/datamapper/mapping';
import { MappingActionKind } from '../../../../models/datamapper/mapping-action';
import { CommentModal } from './Comment/CommentModal';
import { ModalAction } from './modal-action';
import { SortModal } from './Sort/SortModal';

export function useMappingActionModals(mapping: MappingItem | undefined, onUpdate: () => void): ModalAction[] {
  /** Sort */
  const [isSortOpen, setIsSortOpen] = useState(false);
  const closeSort = useCallback(() => setIsSortOpen(false), []);

  const sortableMapping = useMemo(
    () => (mapping instanceof ForEachItem || mapping instanceof ForEachGroupItem ? mapping : undefined),
    [mapping],
  );

  const renderSort = useCallback(() => {
    if (!sortableMapping || !isSortOpen) return null;
    return <SortModal isOpen onClose={closeSort} mapping={sortableMapping} onUpdate={onUpdate} />;
  }, [sortableMapping, isSortOpen, closeSort, onUpdate]);

  /** Comment */
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const closeComment = useCallback(() => setIsCommentOpen(false), []);

  const renderComment = useCallback(() => {
    if (!mapping || !isCommentOpen) return null;
    return <CommentModal isOpen onClose={closeComment} mapping={mapping} onUpdate={onUpdate} />;
  }, [mapping, isCommentOpen, closeComment, onUpdate]);

  return useMemo(
    () => [
      { kind: MappingActionKind.Sort, open: () => setIsSortOpen(true), render: renderSort },
      { kind: MappingActionKind.Comment, open: () => setIsCommentOpen(true), render: renderComment },
    ],
    [renderSort, renderComment],
  );
}
