import { At, ChevronDown, ChevronRight, Draggable } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, ReactNode } from 'react';
import { IDataTestID } from '../../../models';
import { Types } from '../../../models/datamapper';
import { FieldIcon } from '../FieldIcon';
import './BaseNode.scss';

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
  isAttributeField?: boolean;

  /** Title node */
  title: ReactNode;

  /** Hierarchical depth level for indentation */
  rank?: number;

  /** Selection state */
  isSelected?: boolean;
}

export const BaseNode: FunctionComponent<PropsWithChildren<BaseNodeProps>> = ({
  isExpandable,
  isExpanded,
  onExpandChange,
  isDraggable,
  iconType,
  isCollectionField,
  isAttributeField,
  title,
  rank,
  isSelected,
  'data-testid': dataTestId,
  children,
}) => {
  return (
    <section
      className="node__row"
      data-draggable={isDraggable}
      data-expandable={isExpandable}
      data-selected={isSelected}
      style={{ '--node-rank': rank } as React.CSSProperties}
    >
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
      <FieldIcon className="node__spacer" type={iconType} />

      {isAttributeField && (
        <Icon className="node__spacer" data-testid="attribute-field-icon">
          <At />
        </Icon>
      )}

      {children}
    </section>
  );
};
