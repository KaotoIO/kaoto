import './BaseNode.scss';

import { At, ChevronDown, ChevronRight, Choices, DocumentComment, Draggable } from '@carbon/icons-react';
import { Button, Icon, Tooltip } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, ReactNode, useCallback, useState } from 'react';

import { IDataTestID } from '../../../models';
import { Types } from '../../../models/datamapper';
import { MappingItem } from '../../../models/datamapper/mapping';
import { CommentModal } from '../actions/CommentModal';
import { FieldIcon } from '../FieldIcon';

interface BaseNodeProps extends IDataTestID {
  /** Controls whether the Expansion icon is shown */
  isExpandable?: boolean;
  /** Expansion status. Requires `isExpandable=true` */
  isExpanded?: boolean;
  /** Expansion handler */
  onExpandChange?: MouseEventHandler<HTMLElement>;

  /** Controls whether the Drag icon is shown */
  isDraggable?: boolean;
  iconType?: Types;
  isCollectionField?: boolean;
  isChoiceField?: boolean;
  isAttributeField?: boolean;
  /** Comment text to display in tooltip */
  commentText?: string;
  /** Mapping item for comment editing */
  mapping?: MappingItem;
  /** Callback when mapping is updated */
  onUpdate?: () => void;

  /** Title node */
  title: ReactNode;

  /** Hierarchical depth level for indentation */
  rank?: number;

  /** Selection state */
  isSelected?: boolean;

  /** Indicates if this is a source node (true) or target node (false). Defaults to true. */
  isSource?: boolean;

  /** Node path for connection port identification */
  nodePath?: string;

  /** Document ID for connection port identification */
  documentId?: string;
}

export const BaseNode: FunctionComponent<PropsWithChildren<BaseNodeProps>> = ({
  isExpandable,
  isExpanded,
  onExpandChange,
  isDraggable,
  iconType,
  isCollectionField,
  isChoiceField,
  isAttributeField,
  commentText,
  mapping,
  onUpdate,
  title,
  rank,
  isSelected,
  isSource = true,
  nodePath,
  documentId,
  'data-testid': dataTestId,
  children,
}) => {
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
      <FieldIcon className="node__spacer" type={iconType} />

      {isAttributeField && (
        <Icon className="node__spacer" data-testid="attribute-field-icon">
          <At />
        </Icon>
      )}

      {commentText && (
        <Tooltip content={commentText}>
          <Icon className="node__spacer" data-testid="comment-indicator-icon">
            <Button variant="plain" icon={<DocumentComment />} onClick={handleOpenCommentModal} />
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
