import {
  ActionListItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { AddCircleOIcon, EllipsisVIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useState } from 'react';

import { ChooseItem, MappingItem } from '../../../models/datamapper/mapping';
import { MappingNodeData, TargetFieldNodeData, TargetNodeData } from '../../../models/datamapper/visualization';
import { DEFAULT_POPPER_PROPS } from '../../../models/popper-default';
import { VisualizationService } from '../../../services/visualization.service';
import { CommentModal } from './CommentModal';

type ConditionMenuProps = {
  dropdownLabel?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

export const ConditionMenuAction: FunctionComponent<ConditionMenuProps> = ({ dropdownLabel, nodeData, onUpdate }) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState<boolean>(false);

  const allowIfChoose = VisualizationService.allowIfChoose(nodeData);
  const allowForEach = VisualizationService.allowForEach(nodeData);
  const isChooseNode = nodeData instanceof MappingNodeData && nodeData.mapping instanceof ChooseItem;
  const otherwiseItem = isChooseNode && (nodeData.mapping as ChooseItem).otherwise;
  const allowValueSelector = VisualizationService.allowValueSelector(nodeData);
  const hasValueSelector = VisualizationService.hasValueSelector(nodeData);
  const isValueSelectorNode = VisualizationService.isValueSelectorNode(nodeData);
  const mappingItem = nodeData.mapping instanceof MappingItem ? nodeData.mapping : undefined;

  const onToggleActionMenu = useCallback(
    (_event: MouseEvent | undefined) => {
      setIsActionMenuOpen(!isActionMenuOpen);
    },
    [isActionMenuOpen],
  );

  const renderToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
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
    ),
    [dropdownLabel, onToggleActionMenu, isActionMenuOpen],
  );
  const handleCloseCommentModal = useCallback(() => {
    setIsCommentModalOpen(false);
  }, []);

  const onSelectAction = useCallback(
    (event: MouseEvent | undefined, value: string | number | undefined) => {
      event?.stopPropagation();
      const actions: Record<string, () => void> = {
        selector: () => VisualizationService.applyValueSelector(nodeData),
        if: () => VisualizationService.applyIf(nodeData),
        choose: () => VisualizationService.applyChooseWhenOtherwise(nodeData),
        foreach: () => VisualizationService.applyForEach(nodeData as TargetFieldNodeData),
        when: () => VisualizationService.applyWhen(nodeData),
        otherwise: () => VisualizationService.applyOtherwise(nodeData),
        comment: () => setIsCommentModalOpen(true),
      };
      const action = actions[value as string];
      if (action) {
        action();
        onUpdate();
        setIsActionMenuOpen(false);
      }
    },
    [nodeData, onUpdate],
  );

  return (
    !isValueSelectorNode && (
      <>
        <ActionListItem key="transformation-actions">
          <Dropdown
            toggle={renderToggle}
            onSelect={onSelectAction}
            isOpen={isActionMenuOpen}
            onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
            popperProps={DEFAULT_POPPER_PROPS}
            zIndex={100}
          >
            <DropdownList>
              {mappingItem && (
                <DropdownItem key="comment" value="comment" data-testid="transformation-actions-comment">
                  {mappingItem.comment ? 'Edit' : 'Add'} Comment
                </DropdownItem>
              )}
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

        {mappingItem && (
          <CommentModal
            isOpen={isCommentModalOpen}
            onClose={handleCloseCommentModal}
            mapping={mappingItem}
            onUpdate={onUpdate}
          />
        )}
      </>
    )
  );
};
