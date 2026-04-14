import './BaseNode.scss';

import { At, ChevronDown, ChevronRight, Choices, DocumentComment, Draggable, ValueVariable } from '@carbon/icons-react';
import { Button, Icon, Tooltip } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, ReactNode, useCallback, useState } from 'react';

import { IDataTestID } from '../../../models';
import { MappingItem } from '../../../models/datamapper/mapping';
import { NodeData, VariableNodeData } from '../../../models/datamapper/visualization';
import { MappingValidationService } from '../../../services/mapping-validation.service';
import { VisualizationService } from '../../../services/visualization.service';
import { CommentModal } from '../actions/Comment/CommentModal';
import { FieldIcon } from '../FieldIcon';

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

  /** Document ID for connection port identification */
  documentId?: string;
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
  documentId,
  'data-testid': dataTestId,
  children,
}) => {
  // Derive properties from nodeData
  const field = VisualizationService.getField(nodeData);
  const iconType = field?.type ?? nodeData.type;
  const isCollectionField = VisualizationService.isCollectionField(nodeData);
  const isChoiceField = VisualizationService.isChoiceField(nodeData);
  const isAbstractField = VisualizationService.isAbstractField(nodeData);
  const isAttributeField = VisualizationService.isAttributeField(nodeData);
  const isVariableNode = nodeData instanceof VariableNodeData;
  const isDraggable = MappingValidationService.isDraggable(nodeData);
  const isSource = nodeData.isSource;
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

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
  return (
    <section
      className="node__row"
      data-draggable={isDraggable}
      data-expandable={isExpandable}
      data-selected={isSelected}
      style={{ '--node-rank': rank } as React.CSSProperties}
    >
      {nodePath && documentId && (
        <span
          className={`node__connection-port ${isSource ? 'node__connection-port--source' : 'node__connection-port--target'}`}
          data-testid={`connection-port-${dataTestId}`}
          data-connection-port="true"
          data-node-path={nodePath}
          data-document-id={documentId}
        />
      )}

      {isExpandable && (
        <Icon className="node__expand" onClick={onExpandChange}>
          {isExpanded && <ChevronDown data-testid={`expand-icon-${dataTestId}`} />}
          {!isExpanded && <ChevronRight data-testid={`collapse-icon-${dataTestId}`} />}
        </Icon>
      )}

      {isDraggable && (
        <Icon className="node__spacer" data-drag-handler>
          <Draggable />
        </Icon>
      )}
      {title}
      {isCollectionField && (
        <Icon className="node__spacer" data-testid="collection-field-icon">
          <LayerGroupIcon />
        </Icon>
      )}
      {isChoiceField && (
        <Icon className="node__spacer" data-testid="choice-field-icon">
          <Choices />
        </Icon>
      )}
      {isAbstractField && (
        <Icon className="node__spacer" data-testid="abstract-field-icon">
          <Choices />
        </Icon>
      )}
      <FieldIcon className="node__spacer" type={iconType} />

      {isAttributeField && (
        <Icon className="node__spacer" data-testid="attribute-field-icon">
          <At />
        </Icon>
      )}
      {isVariableNode && (
        <Icon className="node__spacer" data-testid="variable-node-icon">
          <ValueVariable />
        </Icon>
      )}

      {mapping?.comment && mapping && onUpdate && (
        <Tooltip content={mapping?.comment}>
          <Icon className="node__spacer" data-testid="comment-indicator-icon">
            <Button
              variant="plain"
              icon={<DocumentComment />}
              onClick={handleOpenCommentModal}
              aria-label="Edit comment"
            />
          </Icon>
        </Tooltip>
      )}
      {children}

      {mapping && onUpdate && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={handleCloseCommentModal}
          mapping={mapping}
          onUpdate={onUpdate}
          showDeleteButton={true}
          withFormGroup={true}
        />
      )}
    </section>
  );
};
