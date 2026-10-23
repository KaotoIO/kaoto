import './FlowsMenu.scss';

import { List } from '@carbon/icons-react';
import { Badge, MenuToggle, MenuToggleElement, Select } from '@patternfly/react-core';
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
      icon={<List />}
    >
      <span
        title={singleFlowId ?? 'Routes'}
        data-testid="flows-list-route-id"
        className="flows-menu-display"
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
