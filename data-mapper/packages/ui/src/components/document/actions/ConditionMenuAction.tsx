import { FunctionComponent, Ref, MouseEvent, useCallback, useState } from 'react';
import { MappingNodeData, TargetFieldNodeData, TargetNodeData } from '../../../models/visualization';
import { VisualizationService } from '../../../services/visualization.service';
import {
  ActionListItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';
import { ChooseItem } from '../../../models/mapping';
import { MappingService } from '../../../services/mapping.service';

type ConditionMenuProps = {
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

export const ConditionMenuAction: FunctionComponent<ConditionMenuProps> = ({ nodeData, onUpdate }) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const onToggleActionMenu = useCallback(() => setIsActionMenuOpen(!isActionMenuOpen), [isActionMenuOpen]);
  const allowIfChoose = VisualizationService.allowIfChoose(nodeData);
  const allowForEach = VisualizationService.allowForEach(nodeData);
  const isChooseNode = nodeData instanceof MappingNodeData && nodeData.mapping instanceof ChooseItem;
  const otherwiseItem = isChooseNode && (nodeData.mapping as ChooseItem).otherwise;
  const allowValueSelector = VisualizationService.allowValueSelector(nodeData);
  const hasValueSelector = VisualizationService.hasValueSelector(nodeData);
  const isValueSelectorNode = VisualizationService.isValueSelectorNode(nodeData);

  const onSelectAction = useCallback(
    (_event: MouseEvent | undefined, value: string | number | undefined) => {
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
          MappingService.addWhen(nodeData.mapping as ChooseItem);
          break;
        case 'otherwise':
          MappingService.addOtherwise(nodeData.mapping as ChooseItem);
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
              ref={toggleRef}
              onClick={onToggleActionMenu}
              variant="plain"
              isExpanded={isActionMenuOpen}
              aria-label="Transformation Action list"
              data-testid="transformation-actions-menu-toggle"
            >
              <EllipsisVIcon />
            </MenuToggle>
          )}
          isOpen={isActionMenuOpen}
          onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
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
