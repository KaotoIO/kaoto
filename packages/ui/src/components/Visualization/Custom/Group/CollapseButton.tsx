import { Tooltip } from '@patternfly/react-core';
import { CompressArrowsAltIcon, ExpandArrowsAltIcon } from '@patternfly/react-icons';
import { CollapsibleGroupProps } from '@patternfly/react-topology';
import { FunctionComponent, MouseEventHandler } from 'react';
import { IDataTestID } from '../../../../models';
import { CustomGroupProps } from './Group.models';

interface CollapseButtonProps extends IDataTestID {
  element: CustomGroupProps['element'];
  onCollapseChange?: CollapsibleGroupProps['onCollapseChange'];
}

export const CollapseButton: FunctionComponent<CollapseButtonProps> = ({
  element,
  ['data-testid']: dataTestId,
  onCollapseChange,
}) => {
  const onClick: MouseEventHandler<HTMLButtonElement> & MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
    onCollapseChange?.(element, !element.isCollapsed());
  };

  return (
    <Tooltip content={element.isCollapsed() ? 'Expand' : 'Collapse'}>
      <button className="container-controls" id="collapse-button-control" onClick={onClick} data-testid={dataTestId}>
        {element.isCollapsed() ? (
          <ExpandArrowsAltIcon data-testid="expand-icon" />
        ) : (
          <CompressArrowsAltIcon data-testid="collapse-icon" />
        )}
      </button>
    </Tooltip>
  );
};
