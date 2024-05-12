import { FunctionComponent, MouseEvent, useCallback, useMemo, useState } from 'react';
import { FunctionSelector } from './action/FunctionSelector';
import {
  ActionList,
  ActionListItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Stack,
  StackItem,
  TreeView,
  TreeViewDataItem,
} from '@patternfly/react-core';
import { useDataMapper } from '../../hooks';
import { IField, IFunctionDefinition } from '../../models';
import { ConstantInput } from './action/ConstantInput';
import { FieldSelector } from './action/FieldSelector';
import { TreeItemHelper } from './treeItem/tree-item-helper';

enum TopAction {
  Function = 'Function',
  Field = 'Field',
  Constant = 'Constant',
  None = '',
}

export const TransformationEditor: FunctionComponent = () => {
  const { selectedMapping } = useDataMapper();
  const [isTopActionDropdownOpen, setIsTopActionDropdownOpen] = useState<boolean>(false);
  const [topAction, setTopAction] = useState<TopAction>(TopAction.None);

  const onTopActionDropdownToggle = useCallback(() => {
    setIsTopActionDropdownOpen(!isTopActionDropdownOpen);
  }, [isTopActionDropdownOpen]);

  const onTopActionDropdownSelect = useCallback(
    (_event: MouseEvent | undefined, value: string | number | undefined) => {
      setTopAction(value ? (value as TopAction) : TopAction.None);
      setIsTopActionDropdownOpen(false);
    },
    [],
  );

  const transformationTree = useMemo((): TreeViewDataItem[] => {
    return (
      selectedMapping?.transformation?.elements.map((element) =>
        TreeItemHelper.createTransformationTreeItem(element),
      ) || []
    );
  }, [selectedMapping?.transformation?.elements]);

  const handleAddField = useCallback((field: IField) => {}, []);

  const handleAddFunction = useCallback((func: IFunctionDefinition) => {}, []);

  const handleAddConstant = useCallback((value: string) => {}, []);

  return (
    selectedMapping && (
      <Stack>
        <StackItem>
          <ActionList>
            <ActionListItem>
              <Dropdown
                isOpen={isTopActionDropdownOpen}
                onSelect={onTopActionDropdownSelect}
                selected={topAction}
                onOpenChange={(isOpen: boolean) => setIsTopActionDropdownOpen(isOpen)}
                toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                  <MenuToggle ref={toggleRef} onClick={onTopActionDropdownToggle} isExpanded={isTopActionDropdownOpen}>
                    {topAction ? topAction : 'Select the top level item to add'}
                  </MenuToggle>
                )}
              >
                <DropdownList>
                  <DropdownItem value={TopAction.Field} key={TopAction.Field}>
                    Field
                  </DropdownItem>
                  <DropdownItem value={TopAction.Function} key={TopAction.Function}>
                    Function
                  </DropdownItem>
                  <DropdownItem value={TopAction.Constant} key={TopAction.Constant}>
                    Constant
                  </DropdownItem>
                </DropdownList>
              </Dropdown>
            </ActionListItem>
            <ActionListItem>
              {topAction === TopAction.Field && <FieldSelector onSelect={handleAddField} />}
              {topAction === TopAction.Function && <FunctionSelector onSelect={handleAddFunction} />}
              {topAction === TopAction.Constant && <ConstantInput onSubmit={handleAddConstant} />}
            </ActionListItem>
          </ActionList>
        </StackItem>
        <StackItem>
          <TreeView data={transformationTree} hasGuides />
        </StackItem>
      </Stack>
    )
  );
};
