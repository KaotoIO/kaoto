import { FunctionComponent, MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { FunctionSelector } from './action/FunctionSelector';
import {
  Accordion,
  ActionList,
  ActionListItem,
  Card,
  CardBody,
  CardHeader,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { useDataMapper } from '../../hooks';
import {
  IField,
  IFieldItem,
  IFunctionCall,
  IFunctionDefinition,
  ILiteralItem,
  ITransformation,
  ITransformationItem,
} from '../../models';
import { ConstantInput } from './action/ConstantInput';
import { FieldSelector } from './action/FieldSelector';
import { ItemHelper } from './item/item-helper';

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
  const [transformation, setTransformation] = useState<ITransformation | undefined>(selectedMapping?.source);

  useEffect(() => {
    selectedMapping && setTransformation(selectedMapping.source);
  }, [selectedMapping, selectedMapping?.source]);

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

  const handleUpdate = useCallback(() => transformation && setTransformation({ ...transformation }), [transformation]);

  const createTreeItem = useCallback(
    (element: ITransformationItem) => ItemHelper.createTransformationItem(element, handleUpdate),
    [handleUpdate],
  );

  const handleAddField = useCallback(
    (field: IField) => {
      if (!transformation) return;
      transformation.elements.push({
        parent: selectedMapping?.source,
        field: field,
      } as IFieldItem);
      handleUpdate();
    },
    [handleUpdate, selectedMapping?.source, transformation],
  );

  const handleAddFunction = useCallback(
    (func: IFunctionDefinition) => {
      if (!transformation) return;
      transformation.elements.push({
        parent: selectedMapping?.source,
        definition: func,
        arguments: [],
      } as IFunctionCall);
      handleUpdate();
    },
    [handleUpdate, selectedMapping?.source, transformation],
  );

  const handleAddConstant = useCallback(
    (value: string) => {
      if (!transformation) return;
      transformation.elements.push({
        parent: selectedMapping?.source,
        value: value,
      } as ILiteralItem);
      handleUpdate();
    },
    [handleUpdate, selectedMapping?.source, transformation],
  );

  const handleOnToggle = useCallback(() => {}, []);

  const headerActions = useMemo(() => {
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
          {topAction === TopAction.Field && <FieldSelector onSubmit={handleAddField} />}
          {topAction === TopAction.Function && <FunctionSelector onSubmit={handleAddFunction} />}
          {topAction === TopAction.Constant && <ConstantInput onSubmit={handleAddConstant} />}
        </ActionListItem>
      </ActionList>
    );
  }, [
    handleAddConstant,
    handleAddField,
    handleAddFunction,
    isTopActionDropdownOpen,
    onTopActionDropdownSelect,
    onTopActionDropdownToggle,
    topAction,
  ]);

  return (
    selectedMapping && (
      <Card>
        <CardHeader actions={{ actions: headerActions }}></CardHeader>
        <CardBody>
          <Accordion isBordered={true} asDefinitionList={false} onClick={handleOnToggle} togglePosition="start">
            {selectedMapping?.source?.elements.map((element) => createTreeItem(element))}
          </Accordion>
        </CardBody>
      </Card>
    )
  );
};
