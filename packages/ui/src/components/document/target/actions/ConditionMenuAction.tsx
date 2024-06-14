import { FunctionComponent, Ref, MouseEvent, useCallback, useState } from 'react';
import { FieldNodeData, NodeData } from '../../../../models/visualization';
import { VisualizationService } from '../../../../services/visualization.service';
import {
  ActionListGroup,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { EllipsisVIcon } from '@patternfly/react-icons';

type ConditionMenuProps = {
  nodeData: NodeData;
  onUpdate: () => void;
};

export const ConditionMenuAction: FunctionComponent<ConditionMenuProps> = ({ nodeData, onUpdate }) => {
  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const onToggleActionMenu = useCallback(() => setIsActionMenuOpen(!isActionMenuOpen), [isActionMenuOpen]);
  const allowForEach = VisualizationService.allowForEach(nodeData);
  const onSelectAction = useCallback(
    (_event: MouseEvent | undefined, value: string | number | undefined) => {
      switch (value) {
        case 'if':
          VisualizationService.applyIf(nodeData);
          onUpdate();
          break;
        case 'choose':
          VisualizationService.applyChoose(nodeData);
          onUpdate();
          break;
        case 'foreach':
          allowForEach && VisualizationService.applyForEach(nodeData as FieldNodeData);
          onUpdate();
          break;
      }
      setIsActionMenuOpen(false);
    },
    [allowForEach, nodeData, onUpdate],
  );

  return (
    <ActionListGroup key="transformation-actions">
      <Dropdown
        onSelect={onSelectAction}
        toggle={(toggleRef: Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={onToggleActionMenu}
            variant="plain"
            isExpanded={isActionMenuOpen}
            aria-label="Transformation Action list"
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        isOpen={isActionMenuOpen}
        onOpenChange={(isOpen: boolean) => setIsActionMenuOpen(isOpen)}
        zIndex={100}
      >
        <DropdownList>
          {allowForEach && (
            <DropdownItem key="foreach" value="foreach">
              Apply <q>for-each</q>
            </DropdownItem>
          )}
          <DropdownItem key="if" value="if">
            Apply <q>if</q>
          </DropdownItem>
          <DropdownItem key="choose" value="choose">
            Apply <q>choose</q>
          </DropdownItem>
        </DropdownList>
      </Dropdown>
    </ActionListGroup>
  );
};
