import { At, ChevronDown, ChevronRight, Draggable } from '@carbon/icons-react';
import { Icon } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEventHandler, PropsWithChildren, ReactNode } from 'react';
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
  isAttributeField?: boolean;

  /** Title node */
  title: ReactNode;
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
  'data-testid': dataTestId,
  children,
}) => {
  return (
    <section className="node__row" data-draggable={isDraggable}>
      {isExpandable && (
        <Icon className="node__expand node__spacer" onClick={onExpandChange}>
          {isExpanded && <ChevronDown data-testid={`expand-icon-${dataTestId}`} />}
          {!isExpanded && <ChevronRight data-testid={`collapse-icon-${dataTestId}`} />}
        </Icon>
      )}

      {isDraggable && (
        <Icon className="node__spacer" data-drag-handler>
          <Draggable />
        </Icon>
      )}

      <FieldIcon className="node__spacer" type={iconType} />

      {isCollectionField && (
        <Icon className="node__spacer" data-testid="collection-field-icon">
          <LayerGroupIcon />
        </Icon>
      )}

      {isAttributeField && (
        <Icon className="node__spacer" data-testid="attribute-field-icon">
          <At />
        </Icon>
      )}

      {title}

      {children}
    </section>
  );
};
