import { FlowsList } from './FlowsList';
import { Badge, Icon, MenuToggle, MenuToggleAction, MenuToggleElement, Select } from '@patternfly/react-core';

import { ListIcon } from '@patternfly/react-icons';
import { FunctionComponent, Ref, useCallback, useContext, useState } from 'react';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { getVisibleFlowsInformation } from '../../../../models/visualization/flows/flows-visibility';

export const FlowsMenu: FunctionComponent = () => {
  const { visibleFlows } = useContext(EntitiesContext)!;
  const [isOpen, setIsOpen] = useState(false);
  const visibleFlowsInformation = useCallback(() => {
    return getVisibleFlowsInformation(visibleFlows);
  }, [visibleFlows]);

  /** Toggle the DSL dropdown */
  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      data-testid="flows-list-dropdown"
      ref={toggleRef}
      onClick={onToggleClick}
      isFullWidth
      splitButtonOptions={{
        variant: 'action',
        items: [
          <MenuToggleAction
            id="flows-list-btn"
            key="flows-list-btn"
            data-testid="flows-list-btn"
            aria-label="flows list"
            onClick={onToggleClick}
          >
            <Icon isInline>
              <ListIcon />
            </Icon>
            <span data-testid="flows-list-route-id" className="pf-u-m-sm-on-lg">
              {visibleFlowsInformation().singleFlowId ?? 'Routes'}
            </span>
            <Badge data-testid="flows-list-route-count" isRead>
              {visibleFlowsInformation().visibleFlowsCount}/{visibleFlowsInformation().totalFlowsCount}
            </Badge>
          </MenuToggleAction>,
        ],
      }}
    />
  );

  return (
    <Select
      id="flows-list-select"
      isOpen={isOpen}
      onOpenChange={(isOpen) => {
        setIsOpen(isOpen);
      }}
      toggle={toggle}
      // minWidth="400px"
    >
      <FlowsList
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </Select>
  );
};
