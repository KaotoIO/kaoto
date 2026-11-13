import './BaseNode.scss';

import { At, ChevronDown, ChevronRight, Choices, DocumentComment, Draggable, Layers } from '@carbon/icons-react';
import { Button, Label, Tooltip } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, ReactNode, useCallback, useState } from 'react';

import { IDataTestID } from '../../../models';
import { MappingItem } from '../../../models/datamapper/mapping';
import { CopyOfFieldNodeData, FieldItemNodeData, NodeData } from '../../../models/datamapper/visualization';
import { MappingValidationService } from '../../../services/visualization/mapping-validation.service';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { CommentModal } from '../actions/MappingMenu/Comment/CommentModal';
import { ConnectionPort } from '../ConnectionPort';
import { FieldIcon } from '../FieldIcon';
import { FieldNodePopover } from '../FieldNodePopover';

interface BaseNodeProps extends IDataTestID {
  /** Node data containing all node information */
  nodeData: NodeData;

  /** Controls whether the Expansion icon is shown */
  isExpandable?: boolean;
  /** Expansion status. Requires `isExpandable=true` */
  isExpanded?: boolean;
  /** Expansion handler */
  onExpandChange?: MouseEventHandler<HTMLElement>;

  /** Title node */
  title: ReactNode;

  /** Hierarchical depth level for indentation */
  rank?: number;

  /** Selection state */
  isSelected?: boolean;

  /** Node path for connection port identification */
  nodePath?: string;

  /** Mapping item for comment editing */
  mapping?: MappingItem;

  /** Callback when mapping is updated */
  onUpdate?: () => void;

  /** Document node ID for connection port identification */
  documentNodeId?: string;

  /** Namespace map for field details */
  namespaceMap?: Record<string, string>;
}

export const BaseNode: FunctionComponent<PropsWithChildren<BaseNodeProps>> = ({
  nodeData,
  isExpandable,
  isExpanded,
  onExpandChange,
  mapping,
  onUpdate,
  title,
  rank,
  isSelected,
  nodePath,
  documentNodeId,
  namespaceMap = {},
  'data-testid': dataTestId,
  children,
}) => {
  // Derive properties from nodeData
  const field = VisualizationUtilService.getField(nodeData);
  const iconType = field?.type ?? nodeData.type;
  const isCollectionField = VisualizationUtilService.isCollectionField(nodeData);
  const isChoiceField = VisualizationUtilService.isChoiceField(nodeData);
  const isSelectedChoice = VisualizationUtilService.isSelectedChoiceField(nodeData);
  const choiceDepth = VisualizationUtilService.getSelectedChoiceDepth(nodeData);
  const isAbstractField = VisualizationUtilService.isAbstractField(nodeData);
  const isSelectedAbstract = VisualizationUtilService.isSelectedAbstractField(nodeData);
  const isAbstractWrapperMember = VisualizationUtilService.isAbstractWrapperMember(nodeData);
  const isChoiceWrapperMember = VisualizationUtilService.isChoiceWrapperMember(nodeData);
  const isAttributeField = VisualizationUtilService.isAttributeField(nodeData);
  const isDraggable = MappingValidationService.isDraggable(nodeData);
  const isSource = nodeData.isSource;
  const optionalGuard =
    nodeData instanceof FieldItemNodeData || nodeData instanceof CopyOfFieldNodeData
      ? nodeData.autoOptionalIfItem
      : undefined;
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isGuardCommentModalOpen, setIsGuardCommentModalOpen] = useState(false);

  const handleOpenCommentModal = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (mapping && onUpdate) {
        setIsCommentModalOpen(true);
      }
    },
    [mapping, onUpdate],
  );

  const handleCloseCommentModal = useCallback(() => {
    setIsCommentModalOpen(false);
  }, []);

  const handleOpenGuardCommentModal = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsGuardCommentModalOpen(true);
  }, []);

  const handleCloseGuardCommentModal = useCallback(() => {
    setIsGuardCommentModalOpen(false);
  }, []);
  return (
    <section
      className="node__row"
      data-draggable={isDraggable}
      data-expandable={isExpandable}
      data-selected={isSelected}
      style={{ '--node-rank': rank } as React.CSSProperties}
    >
      {nodePath && documentNodeId && (
        <ConnectionPort
          documentNodeId={documentNodeId}
          nodePath={nodePath}
          isSource={isSource}
          testId={`connection-port-${dataTestId}`}
        />
      )}

      {isExpandable ? (
        /*
         * A native button on purpose: Carbon `IconButton` is at least 24px and always adds a tooltip, which does not
         * fit the 16px chevron slot the rank guide lines align to, and PatternFly `Button` is being phased out.
         * Carbon's own TreeView renders this toggle as a clickable span; a button keeps it semantic.
         */
        <button
          type="button"
          className="node__expand"
          onClick={onExpandChange}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          aria-expanded={isExpanded}
          tabIndex={-1}
        >
          {isExpanded && <ChevronDown data-testid={`expand-icon-${dataTestId}`} />}
          {!isExpanded && <ChevronRight data-testid={`collapse-icon-${dataTestId}`} />}
        </button>
      ) : (
        <span className="node__expand" aria-hidden="true" />
      )}

      {isDraggable && <Draggable className="node__icon" data-drag-handler />}
      {title}
      {optionalGuard?.comment && onUpdate && (
        <Tooltip
          content={<span className="node__comment-tooltip">{`Optional guard comment: ${optionalGuard.comment}`}</span>}
        >
          <Button
            className="node__spacer"
            data-testid="guard-comment-indicator-icon"
            variant="plain"
            icon={<DocumentComment />}
            onClick={handleOpenGuardCommentModal}
            aria-label="Edit optional guard comment"
          />
        </Tooltip>
      )}
      {isCollectionField && <Layers className="node__icon" data-testid="collection-field-icon" />}
      {isChoiceField && !isSelectedChoice && <Choices className="node__icon" data-testid="choice-field-icon" />}
      {isSelectedChoice && (
        <Label className="node__spacer" color="green" icon={<Choices />} isCompact data-testid="choice-field-icon">
          {choiceDepth >= 2 ? <>&times;{choiceDepth}</> : ''}
        </Label>
      )}
      {isAbstractField && (
        <Choices
          className={clsx('node__icon', { 'node__icon--success': isSelectedAbstract })}
          data-testid="abstract-field-icon"
        />
      )}
      {(isAbstractWrapperMember || isChoiceWrapperMember) && (
        <Choices
          className={clsx('node__icon', { 'node__icon--success': !field?.wrapperKind })}
          data-testid={field?.wrapperKind ? 'abstract-field-icon' : 'wrapper-member-icon'}
        />
      )}
      <FieldIcon className="node__icon node__icon--no-popover" type={iconType} />

      {isAttributeField && <At className="node__icon" data-testid="attribute-field-icon" />}
      {mapping?.comment && mapping && onUpdate && (
        <Tooltip content={<span className="node__comment-tooltip">{mapping?.comment}</span>}>
          <Button
            className="node__spacer"
            data-testid="comment-indicator-icon"
            variant="plain"
            icon={<DocumentComment />}
            onClick={handleOpenCommentModal}
            aria-label="Edit comment"
          />
        </Tooltip>
      )}
      <FieldNodePopover nodeData={nodeData} namespaceMap={namespaceMap} />
      {children}

      {mapping && onUpdate && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={handleCloseCommentModal}
          mapping={mapping}
          onUpdate={onUpdate}
          showDeleteButton
          withFormGroup
        />
      )}
      {optionalGuard && onUpdate && (
        <CommentModal
          isOpen={isGuardCommentModalOpen}
          onClose={handleCloseGuardCommentModal}
          mapping={optionalGuard}
          onUpdate={onUpdate}
          title="Edit Optional Guard Comment"
          showDeleteButton
          withFormGroup
        />
      )}
    </section>
  );
};
