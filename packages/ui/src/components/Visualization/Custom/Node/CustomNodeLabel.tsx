import './CustomNode.scss';

import { Icon, TextInput } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';

import { IVisualizationNode } from '../../../../models';
import { NodeLabelType } from '../../../../models/settings';
import { CanvasDefaults } from '../../Canvas/canvas.defaults';

export interface CustomNodeLabelProps {
  label: string;
  doesHaveWarnings?: boolean;
  validationText?: string;
  x?: number;
  y?: number;
  transform?: string;
  width?: number;
  height?: number;
  className?: string;
  vizNode?: IVisualizationNode;
  onDescriptionChange?: (description: string) => void;
  nodeLabelType?: NodeLabelType;
}

export const CustomNodeLabel: FunctionComponent<CustomNodeLabelProps> = ({
  label,
  doesHaveWarnings = false,
  validationText,
  x,
  y,
  transform,
  width = CanvasDefaults.DEFAULT_LABEL_WIDTH,
  height = CanvasDefaults.DEFAULT_LABEL_HEIGHT,
  className = 'custom-node__label',
  vizNode,
  onDescriptionChange,
  nodeLabelType = NodeLabelType.Description,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeDefinition = vizNode?.getNodeDefinition();
  const currentDescription = nodeDefinition?.description || '';

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Only allow editing if:
      // 1. vizNode and onDescriptionChange are available
      // 2. The current node label setting is set to 'description'
      if (!vizNode || !onDescriptionChange || nodeLabelType !== NodeLabelType.Description) {
        return;
      }
      event.stopPropagation();
      setEditValue(currentDescription);
      setIsEditing(true);
      setIsCancelling(false);
    },
    [currentDescription, vizNode, onDescriptionChange, nodeLabelType],
  );

  const handleSave = useCallback(() => {
    const trimmedValue = editValue.trim();
    if (onDescriptionChange && trimmedValue !== currentDescription) {
      onDescriptionChange(trimmedValue);
    }
    setIsEditing(false);
    setIsCancelling(false);
  }, [editValue, currentDescription, onDescriptionChange]);

  const handleCancel = useCallback(() => {
    setIsCancelling(true);
    setIsEditing(false);
    setEditValue('');
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.stopPropagation();
        handleSave();
      } else if (event.key === 'Escape') {
        event.stopPropagation();
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  const handleBlur = useCallback(() => {
    // Don't save if user is cancelling with Escape
    if (!isCancelling) {
      handleSave();
    }
  }, [handleSave, isCancelling]);

  // When editing, expand the input box to provide more space for typing
  // Normal: 180px width x 24px height
  // Editing: 240px width x 40px height (accommodates PatternFly TextInput padding)
  const editWidth = 240;
  const editHeight = 40;

  // Calculate x-position adjustment to keep the input centered when width changes
  // Example: if width increases from 180px to 240px (60px difference),
  // shift left by 30px (half the difference) to maintain center alignment
  const widthDiff = editWidth - width;
  const adjustedX = isEditing && x !== undefined ? x - widthDiff / 2 : x;

  return (
    <foreignObject
      width={isEditing ? editWidth : width}
      height={isEditing ? editHeight : height}
      className={className}
      {...(transform ? { transform } : { x: adjustedX!, y: y! })}
    >
      <div
        className={clsx('custom-node__label__text', {
          'custom-node__label__text__error': doesHaveWarnings,
        })}
      >
        {doesHaveWarnings && (
          <Icon status="danger" title={validationText} data-warning={doesHaveWarnings}>
            <ExclamationCircleIcon />
          </Icon>
        )}
        {isEditing ? (
          <TextInput
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(_event, value) => setEditValue(value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Enter description"
            aria-label="Edit node description"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            title={label}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={handleDoubleClick}
            style={{ cursor: nodeLabelType === NodeLabelType.Description ? 'pointer' : 'default' }}
          >
            {label}
          </span>
        )}
      </div>
    </foreignObject>
  );
};
