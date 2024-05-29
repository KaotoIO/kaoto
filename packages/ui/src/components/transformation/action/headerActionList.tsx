import { FunctionComponent, MouseEvent, useCallback, useState } from 'react';
import {
  ActionList,
  ActionListItem,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { FieldSelector } from './FieldSelector';
import { FunctionSelector } from './FunctionSelector';
import { ConstantInput } from './ConstantInput';
import { IFunctionCallArgument, IFunctionDefinition, ITransformation } from '../../../models/mapping';
import { IField } from '../../../models/document';
import { TransformationService } from '../../../services/transformation.service';

enum TopAction {
  Function = 'Function',
  Field = 'Field',
  Constant = 'Constant',
  None = '',
}

type HeaderActionListProps = {
  transformation: ITransformation | IFunctionCallArgument | undefined;
  onUpdate: () => void;
};

export const HeaderActionList: FunctionComponent<HeaderActionListProps> = ({ transformation, onUpdate }) => {
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

  const handleAddField = useCallback(
    (field: IField) => {
      if (transformation && field) {
        TransformationService.addField(transformation, field);
        onUpdate();
      }
    },
    [onUpdate, transformation],
  );

  const handleAddFunction = useCallback(
    (func: IFunctionDefinition) => {
      if (transformation && func) {
        TransformationService.addFunctionCall(transformation, func);
        onUpdate();
      }
    },
    [onUpdate, transformation],
  );

  const handleAddConstant = useCallback(
    (value: string) => {
      if (transformation && value) {
        TransformationService.addConstant(transformation, value);
        onUpdate();
      }
    },
    [onUpdate, transformation],
  );

  return (
    <ActionList>
      <ActionListItem>
        <Dropdown
          isOpen={isTopActionDropdownOpen}
          onSelect={onTopActionDropdownSelect}
          selected={topAction}
          onOpenChange={(isOpen: boolean) => setIsTopActionDropdownOpen(isOpen)}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle ref={toggleRef} onClick={onTopActionDropdownToggle} isExpanded={isTopActionDropdownOpen}>
              {topAction ? topAction : 'Select the item to add'}
            </MenuToggle>
          )}
        >
          <DropdownList>
            <DropdownItem
              value={TopAction.Field}
              key={TopAction.Field}
              description={'Add a field from a source body document or parameters'}
            >
              Field
            </DropdownItem>
            <DropdownItem value={TopAction.Function} key={TopAction.Function} description={'Add a function call'}>
              Function
            </DropdownItem>
            <DropdownItem
              value={TopAction.Constant}
              key={TopAction.Constant}
              description={'Add a constant value such as string or number'}
            >
              Constant
            </DropdownItem>
          </DropdownList>
        </Dropdown>
      </ActionListItem>
      <ActionListItem>
        {topAction === TopAction.Field && <FieldSelector onSubmit={handleAddField} />}
        {topAction === TopAction.Function && <FunctionSelector onSubmit={handleAddFunction} />}
        {topAction === TopAction.Constant && <ConstantInput onSubmit={handleAddConstant} />}
      </ActionListItem>
    </ActionList>
  );
};
