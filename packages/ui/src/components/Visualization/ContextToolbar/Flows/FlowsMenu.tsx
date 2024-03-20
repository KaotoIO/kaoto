import { Badge, Icon, MenuToggle, MenuToggleAction, MenuToggleElement, Select } from '@patternfly/react-core';
import { ListIcon } from '@patternfly/react-icons';
import { FunctionComponent, Ref, useCallback, useContext, useState } from 'react';
import { getVisibleFlowsInformation } from '../../../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { FlowsList } from './FlowsList';

export const FlowsMenu: FunctionComponent = () => {
  const { visibleFlows } = useContext(VisibleFlowsContext)!;
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
            <span data-testid="flows-list-route-id" className="pf-v5-u-m-sm">
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
    >
      <FlowsList
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </Select>
  );
};
