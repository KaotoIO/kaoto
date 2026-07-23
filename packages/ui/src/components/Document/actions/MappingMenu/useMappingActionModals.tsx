import { useCallback, useMemo, useState } from 'react';

import { IMemberSelection } from '../../../../models/datamapper/field-action';
import { FieldItem, ForEachGroupItem, ForEachItem, MappingItem } from '../../../../models/datamapper/mapping';
import { MappingActionKind } from '../../../../models/datamapper/mapping-action';
import { MappingService } from '../../../../services/mapping/mapping.service';
import { WrapperActionService } from '../../../../services/visualization/wrapper-action.service';
import { WrapperSelectionModal } from '../WrapperSelectionModal';
import { CommentModal } from './Comment/CommentModal';
import { ForEachGroupModal } from './ForEachGroup/ForEachGroupModal';
import { ModalAction } from './modal-action';
import { SortModal } from './Sort/SortModal';

export function useMappingActionModals(mapping: MappingItem | undefined, onUpdate: () => void): ModalAction[] {
  /** Sort */
  const [isSortOpen, setIsSortOpen] = useState(false);
  const closeSort = useCallback(() => {
    setIsSortOpen(false);
  }, []);

  const sortableMapping = useMemo(() => (mapping instanceof ForEachItem ? mapping : undefined), [mapping]);

  const renderSort = useCallback(() => {
    if (!sortableMapping || !isSortOpen) return null;
    return <SortModal isOpen onClose={closeSort} mapping={sortableMapping} onUpdate={onUpdate} />;
  }, [sortableMapping, isSortOpen, closeSort, onUpdate]);

  /** Comment */
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const closeComment = useCallback(() => {
    setIsCommentOpen(false);
  }, []);

  const renderComment = useCallback(() => {
    if (!mapping || !isCommentOpen) return null;
    return <CommentModal isOpen onClose={closeComment} mapping={mapping} onUpdate={onUpdate} />;
  }, [mapping, isCommentOpen, closeComment, onUpdate]);

  /** ForEachGroupConfig */
  const forEachGroupMapping = useMemo(() => (mapping instanceof ForEachGroupItem ? mapping : undefined), [mapping]);

  const [isForEachGroupConfigOpen, setIsForEachGroupConfigOpen] = useState(false);
  const closeForEachGroupConfig = useCallback(() => {
    setIsForEachGroupConfigOpen(false);
  }, []);

  const renderForEachGroupConfig = useCallback(() => {
    if (!forEachGroupMapping || !isForEachGroupConfigOpen) return null;
    return (
      <ForEachGroupModal isOpen onClose={closeForEachGroupConfig} mapping={forEachGroupMapping} onUpdate={onUpdate} />
    );
  }, [forEachGroupMapping, isForEachGroupConfigOpen, closeForEachGroupConfig, onUpdate]);

  /** AddField */
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false);
  const closeAddField = useCallback(() => {
    setIsAddFieldOpen(false);
  }, []);

  const { ancestorFieldItem, forEachContext } = useMemo(() => {
    if (!mapping) return { ancestorFieldItem: undefined, forEachContext: false };
    let forEach = mapping instanceof ForEachItem || mapping instanceof ForEachGroupItem;
    let current = mapping.parent;
    while (current instanceof MappingItem) {
      if (!forEach && (current instanceof ForEachItem || current instanceof ForEachGroupItem)) forEach = true;
      if (current instanceof FieldItem) return { ancestorFieldItem: current, forEachContext: forEach };
      current = current.parent;
    }
    return { ancestorFieldItem: undefined, forEachContext: forEach };
  }, [mapping]);

  const addFieldData = (() => {
    if (!ancestorFieldItem || !mapping) return undefined;
    const namespaceMap = ancestorFieldItem.mappingTree.namespaceMap;
    const existingFieldItems = mapping.children.filter((c): c is FieldItem => c instanceof FieldItem);
    return WrapperActionService.computeAddFieldCandidates(
      ancestorFieldItem.field.fields,
      namespaceMap,
      existingFieldItems,
      forEachContext,
    );
  })();

  const handleAddFieldSelect = useCallback(
    (selection: IMemberSelection) => {
      if (!addFieldData || !mapping) return;
      const selectedField = addFieldData.fields[selection.memberIndex];
      if (!selectedField) return;
      const fieldItem = MappingService.createFieldItem(mapping, selectedField);
      fieldItem.isUserCreated = true;
      setIsAddFieldOpen(false);
      onUpdate();
    },
    [addFieldData, mapping, onUpdate],
  );

  const renderAddField = useCallback(() => {
    if (!addFieldData || !isAddFieldOpen || addFieldData.candidates.length === 0) return null;
    return (
      <WrapperSelectionModal
        isOpen
        title="Add field"
        testId="add-field-in-instruction-modal"
        candidates={addFieldData.candidates}
        selectedKey={null}
        onSelect={handleAddFieldSelect}
        onClose={closeAddField}
      />
    );
  }, [addFieldData, isAddFieldOpen, handleAddFieldSelect, closeAddField]);

  return useMemo(
    () => [
      {
        kind: MappingActionKind.Sort,
        open: () => {
          setIsSortOpen(true);
        },
        render: renderSort,
      },
      {
        kind: MappingActionKind.Comment,
        open: () => {
          setIsCommentOpen(true);
        },
        render: renderComment,
      },
      {
        kind: MappingActionKind.ForEachGroupConfig,
        open: () => {
          setIsForEachGroupConfigOpen(true);
        },
        render: renderForEachGroupConfig,
      },
      {
        kind: MappingActionKind.AddField,
        open: () => {
          setIsAddFieldOpen(true);
        },
        render: renderAddField,
      },
    ],
    [renderSort, renderComment, renderForEachGroupConfig, renderAddField],
  );
}
