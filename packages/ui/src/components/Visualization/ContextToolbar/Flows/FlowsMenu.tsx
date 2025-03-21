import { Badge, Icon, MenuToggle, MenuToggleAction, MenuToggleElement, Select } from '@patternfly/react-core';
import { ListIcon } from '@patternfly/react-icons';
import { FunctionComponent, Ref, useCallback, useContext, useState } from 'react';
import { getVisibleFlowsInformation } from '../../../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';

import { FlowsList } from './FlowsList';
import './FlowsMenu.scss';

export const FlowsMenu: FunctionComponent = () => {
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
  const [isOpen, setIsOpen] = useState(false);
  const visibleFlowsInformation = useCallback(() => {
    return getVisibleFlowsInformation(visibleFlows);
  }, [visibleFlows]);

  const { singleFlowId, visibleFlowsCount, totalFlowsCount } = visibleFlowsInformation();

  /** Toggle the DSL dropdown */
  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle data-testid="flows-list-dropdown" ref={toggleRef} onClick={onToggleClick} isFullWidth>
      <MenuToggleAction
        id="flows-list-btn"
        key="flows-list-btn"
        data-testid="flows-list-btn"
        aria-label="flows list"
        onClick={onToggleClick}
        className="flows-list-btn"
      >
        <div className="flows-menu">
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
        </div>
      </MenuToggleAction>
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
