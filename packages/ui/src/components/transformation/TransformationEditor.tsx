import { FunctionComponent, MouseEvent, useCallback, useMemo, useState } from 'react';
import { FunctionSelector } from './FunctionSelector';
import {
  ActionList,
  ActionListItem,
  Button,
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Stack,
  StackItem,
  Tooltip,
  TreeView,
  TreeViewDataItem,
} from '@patternfly/react-core';
import { useDataMapper } from '../../hooks';
import { IField, ITransformation } from '../../models';
import { ListIcon, TrashIcon } from '@patternfly/react-icons';
import { ConstantInput } from './ConstantInput';
import { FieldSelector } from './FieldSelector';

type ButtonProps = {
  onClick: () => void;
};

const ForEachButton: FunctionComponent<ButtonProps> = ({ onClick }) => {
  return (
    <Tooltip content={<div>Process for each collection item</div>}>
      <Button
        variant="link"
        aria-label="For Each"
        data-testid={`for-each-button`}
        onClick={onClick}
        icon={<ListIcon />}
      >
        For Each
      </Button>
    </Tooltip>
  );
};

const DeleteFieldButton: FunctionComponent<ButtonProps> = ({ onClick }) => {
  return (
    <Tooltip content={<div>Delete field from mapping</div>}>
      <Button
        variant="plain"
        aria-label="Delete field"
        data-testid={`delete-field-button`}
        onClick={onClick}
        icon={<TrashIcon />}
      ></Button>
    </Tooltip>
  );
};

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

  const txToTreeItem = useCallback((transformation: ITransformation): TreeViewDataItem => {
    return {
      name: transformation.ref?.name || 'Fields',
      id: '',
      children: transformation.arguments.map((arg) => {
        const argAsTx = arg as ITransformation;
        return argAsTx.ref || argAsTx.arguments ? txToTreeItem(argAsTx) : arg;
      }),
    } as TreeViewDataItem;
  }, []);

  const fieldsToTreeItem = useCallback((fields?: IField[]) => {
    if (!fields) return [];
    return !fields
      ? []
      : fields.map((f) => {
          return {
            name: (
              <Tooltip content={f.fieldIdentifier.toString()}>
                <div>{f.expression}</div>
              </Tooltip>
            ),
            action: (
              <ActionList>
                <Divider
                  orientation={{
                    default: 'vertical',
                  }}
                />
                <ActionListItem>
                  <FunctionSelector onSelect={() => {}} />
                </ActionListItem>
                {f.maxOccurs > 1 && (
                  <>
                    <Divider
                      orientation={{
                        default: 'vertical',
                      }}
                    />
                    <ActionListItem>
                      <ForEachButton onClick={() => {}} />{' '}
                    </ActionListItem>
                  </>
                )}
                <Divider
                  orientation={{
                    default: 'vertical',
                  }}
                />
                <ActionListItem>
                  <DeleteFieldButton onClick={() => {}} />
                </ActionListItem>
              </ActionList>
            ),
          };
        });
  }, []);

  const transformationTree = useMemo(() => {
    return selectedMapping?.transformation
      ? [txToTreeItem(selectedMapping.transformation)]
      : fieldsToTreeItem(selectedMapping?.sourceFields);
  }, [fieldsToTreeItem, selectedMapping?.sourceFields, selectedMapping?.transformation, txToTreeItem]);

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
                    {topAction ? topAction : 'Select the type of top level item to add'}
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
              {topAction === TopAction.Field && <FieldSelector onSelect={() => {}} />}
              {topAction === TopAction.Function && <FunctionSelector onSelect={() => {}} />}
              {topAction === TopAction.Constant && <ConstantInput onSubmit={() => {}} />}
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
