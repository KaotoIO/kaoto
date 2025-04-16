import { FunctionComponent, Ref, MouseEvent, useCallback, useState } from 'react';
import { MappingNodeData, TargetFieldNodeData, TargetNodeData } from '../../../models/datamapper/visualization';
import { VisualizationService } from '../../../services/visualization.service';
import {
  ActionListItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { AddCircleOIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { ChooseItem } from '../../../models/datamapper/mapping';

type ConditionMenuProps = {
  dropdownLabel?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

const DEFAULT_POPPER_PROPS = {
  position: 'end',
  preventOverflow: true,
} as const;

export const ConditionMenuAction: FunctionComponent<ConditionMenuProps> = ({ dropdownLabel, nodeData, onUpdate }) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const allowIfChoose = VisualizationService.allowIfChoose(nodeData);
  const allowForEach = VisualizationService.allowForEach(nodeData);
  const isChooseNode = nodeData instanceof MappingNodeData && nodeData.mapping instanceof ChooseItem;
  const otherwiseItem = isChooseNode && (nodeData.mapping as ChooseItem).otherwise;
  const allowValueSelector = VisualizationService.allowValueSelector(nodeData);
  const hasValueSelector = VisualizationService.hasValueSelector(nodeData);
  const isValueSelectorNode = VisualizationService.isValueSelectorNode(nodeData);

  const onToggleActionMenu = useCallback(
    (_event: MouseEvent | undefined) => {
      setIsActionMenuOpen(!isActionMenuOpen);
    },
    [isActionMenuOpen],
  );

  const onSelectAction = useCallback(
    (event: MouseEvent | undefined, value: string | number | undefined) => {
      event?.stopPropagation();
      switch (value) {
        case 'selector':
          VisualizationService.applyValueSelector(nodeData);
          break;
        case 'if':
          VisualizationService.applyIf(nodeData);
          break;
        case 'choose':
          VisualizationService.applyChooseWhenOtherwise(nodeData);
          break;
        case 'foreach':
          VisualizationService.applyForEach(nodeData as TargetFieldNodeData);
          break;
        case 'when':
          VisualizationService.applyWhen(nodeData);
          break;
        case 'otherwise':
          VisualizationService.applyOtherwise(nodeData);
          break;
      }
      onUpdate();
      setIsActionMenuOpen(false);
    },
    [nodeData, onUpdate],
  );

  return (
    !isValueSelectorNode && (
      <ActionListItem key="transformation-actions">
        <Dropdown
          onSelect={onSelectAction}
          toggle={(toggleRef: Ref<MenuToggleElement>) => (
            <MenuToggle
              icon={dropdownLabel ? <AddCircleOIcon /> : <EllipsisVIcon />}
              ref={toggleRef}
              onClick={onToggleActionMenu}
              variant={dropdownLabel ? 'secondary' : 'plain'}
              isExpanded={isActionMenuOpen}
              aria-label="Transformation Action list"
              data-testid="transformation-actions-menu-toggle"
            >
              {dropdownLabel}
            </MenuToggle>
          )}
          isOpen={isActionMenuOpen}
          onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
          popperProps={DEFAULT_POPPER_PROPS}
          zIndex={100}
        >
          <DropdownList>
            {allowValueSelector && (
              <DropdownItem
                key="selector"
                value="selector"
                isDisabled={hasValueSelector}
                data-testid="transformation-actions-selector"
              >
                Add selector expression
              </DropdownItem>
            )}
            {isChooseNode ? (
              <>
                <DropdownItem key="when" value="when" data-testid="transformation-actions-when">
                  Add <q>when</q>
                </DropdownItem>
                <DropdownItem
                  key="otherwise"
                  value="otherwise"
                  isDisabled={!!otherwiseItem}
                  data-testid="transformation-actions-otherwise"
                >
                  Add <q>otherwise</q>
                </DropdownItem>
              </>
            ) : (
              <>
                {allowForEach && (
                  <DropdownItem key="foreach" value="foreach" data-testid="transformation-actions-foreach">
                    Wrap with <q>for-each</q>
                  </DropdownItem>
                )}
                {allowIfChoose && (
                  <>
                    <DropdownItem key="if" value="if" data-testid="transformation-actions-if">
                      Wrap with <q>if</q>
                    </DropdownItem>
                    <DropdownItem key="choose" value="choose" data-testid="transformation-actions-choose">
                      Wrap with <q>choose-when-otherwise</q>
                    </DropdownItem>
                  </>
                )}
              </>
            )}
          </DropdownList>
        </Dropdown>
      </ActionListItem>
    )
  );
};
