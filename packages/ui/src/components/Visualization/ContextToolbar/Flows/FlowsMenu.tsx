import './FlowsMenu.scss';

import { Badge, Icon, MenuToggle, MenuToggleElement, Select } from '@patternfly/react-core';
import { ListIcon } from '@patternfly/react-icons';
import { FunctionComponent, Ref, useContext, useState } from 'react';

import { getVisibleFlowsInformation } from '../../../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { FlowsList } from './FlowsList';

export const FlowsMenu: FunctionComponent = () => {
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const [isOpen, setIsOpen] = useState(false);
  const { singleFlowId, visibleFlowsCount, totalFlowsCount } = getVisibleFlowsInformation(visibleFlows);

  /** Toggle the DSL dropdown */
  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      isFullWidth
      data-testid="flows-list-dropdown"
      className="flows-menu"
      ref={toggleRef}
      onClick={onToggleClick}
    >
      <Icon isInline>
        <ListIcon />
      </Icon>
      <span
        title={singleFlowId ?? 'Routes'}
        data-testid="flows-list-route-id"
        className="pf-v6-u-m-sm flows-menu-display"
      >
        {`${singleFlowId ?? 'Routes'}`}
      </span>
      <Badge
        title={`Showing ${visibleFlowsCount} out of ${totalFlowsCount} flows`}
        data-testid="flows-list-route-count"
        isRead
      >
        {visibleFlowsCount}/{totalFlowsCount}
      </Badge>
    </MenuToggle>
  );

  return (
    <Select id="flows-list-select" isOpen={isOpen} onOpenChange={setIsOpen} toggle={toggle}>
      <FlowsList
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </Select>
  );
};
