import './BaseNode.scss';

import { At, ChevronDown, ChevronRight, Choices, Draggable } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, ReactNode, Ref } from 'react';

import { IDataTestID } from '../../../models';
import { Types } from '../../../models/datamapper';
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

  /** Title node */
  title: ReactNode;

  /** Hierarchical depth level for indentation */
  rank?: number;

  /** Selection state */
  isSelected?: boolean;

  /** Indicates if this is a source node (true) or target node (false). Defaults to true. */
  isSource?: boolean;

  /** Ref to the connection port circle element */
  portRef?: Ref<HTMLSpanElement>;

  /** Node path for connection port identification */
  nodePath?: string;
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
  title,
  rank,
  isSelected,
  isSource = true,
  portRef,
  nodePath,
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
      {portRef && (
        <span
          ref={portRef}
          className={`node__connection-port ${isSource ? 'node__connection-port--source' : 'node__connection-port--target'}`}
          data-testid={`connection-port-${dataTestId}`}
          data-connection-port="true"
          data-node-path={nodePath}
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

      {children}
    </section>
  );
};
