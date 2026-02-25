import {
  ActionListItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  Icon,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { AddCircleOIcon, EllipsisVIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useState } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { ChooseItem } from '../../../models/datamapper/mapping';
import { TypeOverrideVariant } from '../../../models/datamapper/types';
import { MappingNodeData, TargetFieldNodeData, TargetNodeData } from '../../../models/datamapper/visualization';
import { DEFAULT_POPPER_PROPS } from '../../../models/popper-default';
import { VisualizationService } from '../../../services/visualization.service';
import { FieldTypeOverride, revertTypeOverride } from './FieldTypeOverride';

type ConditionMenuProps = {
  dropdownLabel?: string;
  nodeData: TargetNodeData;
  onUpdate: () => void;
};

export const ConditionMenuAction: FunctionComponent<ConditionMenuProps> = ({ dropdownLabel, nodeData, onUpdate }) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const [isTypeOverrideModalOpen, setIsTypeOverrideModalOpen] = useState<boolean>(false);
  const { mappingTree, updateDocument } = useDataMapper();
  const allowIfChoose = VisualizationService.allowIfChoose(nodeData);
  const allowForEach = VisualizationService.allowForEach(nodeData);
  const isChooseNode = nodeData instanceof MappingNodeData && nodeData.mapping instanceof ChooseItem;
  const otherwiseItem = isChooseNode && (nodeData.mapping as ChooseItem).otherwise;
  const allowValueSelector = VisualizationService.allowValueSelector(nodeData);
  const hasValueSelector = VisualizationService.hasValueSelector(nodeData);
  const isValueSelectorNode = VisualizationService.isValueSelectorNode(nodeData);
  const field = VisualizationService.getField(nodeData);
  const hasTypeOverride = !!field && field.typeOverride !== TypeOverrideVariant.NONE;

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

  const onSelectAction = useCallback(
    (event: MouseEvent | undefined, value: string | number | undefined) => {
      event?.stopPropagation();
      switch (value) {
        case 'selector':
          VisualizationService.applyValueSelector(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'if':
          VisualizationService.applyIf(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'choose':
          VisualizationService.applyChooseWhenOtherwise(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'foreach':
          VisualizationService.applyForEach(nodeData as TargetFieldNodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'when':
          VisualizationService.applyWhen(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'otherwise':
          VisualizationService.applyOtherwise(nodeData);
          onUpdate();
          setIsActionMenuOpen(false);
          break;
        case 'type-override':
          setIsTypeOverrideModalOpen(true);
          setIsActionMenuOpen(false);
          break;
        case 'reset-override':
          if (field) {
            revertTypeOverride(field, mappingTree.namespaceMap, updateDocument);
            onUpdate();
          }
          setIsActionMenuOpen(false);
          break;
      }
    },
    [nodeData, onUpdate, field, mappingTree.namespaceMap, updateDocument],
  );

  return (
    !isValueSelectorNode && (
      <ActionListItem key="transformation-actions">
        <Dropdown
          onSelect={onSelectAction}
          toggle={renderToggle}
          isOpen={isActionMenuOpen}
          onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
          popperProps={DEFAULT_POPPER_PROPS}
          zIndex={100}
        >
          <DropdownList>
            {field && (
              <>
                <DropdownItem
                  key="type-override"
                  value="type-override"
                  data-testid="transformation-actions-type-override"
                  icon={
                    <Icon size="sm" status="warning" isInline>
                      <WrenchIcon />
                    </Icon>
                  }
                >
                  Override field type
                </DropdownItem>
                {hasTypeOverride && (
                  <DropdownItem
                    key="reset-override"
                    value="reset-override"
                    data-testid="transformation-actions-reset-override"
                  >
                    Reset override
                  </DropdownItem>
                )}
              </>
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

        {field && (
          <FieldTypeOverride
            isOpen={isTypeOverrideModalOpen}
            field={field}
            onComplete={onUpdate}
            onClose={() => setIsTypeOverrideModalOpen(false)}
          />
        )}
      </ActionListItem>
    )
  );
};
