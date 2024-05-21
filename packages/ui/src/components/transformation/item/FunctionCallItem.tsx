import {
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  ActionList,
  ActionListItem,
  Divider,
  Label,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useState } from 'react';
import { IFunctionCall, IFunctionCallArgument, IFunctionCallArgumentType } from '../../../models';
import { ItemHelper } from './item-helper';
import { GripVerticalIcon } from '@patternfly/react-icons';
import { FunctionIcon } from '../FunctionIcon';
import { DeleteItemButton } from '../action/DeleteItemButton';
import { TransformationService } from '../../../services/transformation.service';

type FunctionCallTreeItemProps = {
  functionCall: IFunctionCall;
  onUpdate: () => void;
};

const FunctionCallButtons: FunctionComponent<FunctionCallTreeItemProps> = ({ functionCall, onUpdate }) => {
  const handleDelete = useCallback(() => {
    TransformationService.removeFromParent(functionCall);
    onUpdate();
  }, [functionCall, onUpdate]);

  return (
    <ActionList>
      <Divider
        orientation={{
          default: 'vertical',
        }}
      />
      <ActionListItem>
        <DeleteItemButton itemName="function" onClick={handleDelete} />
      </ActionListItem>
    </ActionList>
  );
};

type FunctionCallArgumentProps = {
  arg: IFunctionCallArgument;
};

const FunctionCallArgument: FunctionComponent<FunctionCallArgumentProps> = ({ arg }) => {
  arg.definition.minOccurs;
  return <></>;
};

export const FunctionCallItem: FunctionComponent<FunctionCallTreeItemProps> = ({ functionCall, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [childrenArguments, setChildrenArguments] = useState<IFunctionCallArgument[]>(functionCall.arguments);

  const handleChildrenUpdate = useCallback(() => {
    setChildrenArguments(functionCall.arguments);
    functionCall.arguments = [...functionCall.arguments];
  }, [functionCall]);

  const createItem = useCallback(
    (element: IFunctionCallArgumentType) => ItemHelper.createTransformationItem(element, handleChildrenUpdate),
    [handleChildrenUpdate],
  );

  return (
    <AccordionItem>
      <AccordionToggle
        onClick={() => setIsExpanded(!isExpanded)}
        isExpanded={isExpanded}
        component={({ children }) => <div>{children}</div>}
        id={`function-${functionCall.definition.name}`}
      >
        <Split hasGutter>
          <SplitItem>
            <GripVerticalIcon />
            <Label isCompact>
              <FunctionIcon />
            </Label>
          </SplitItem>
          <SplitItem isFilled>{functionCall.definition.displayName}</SplitItem>
          <SplitItem>
            <FunctionCallButtons functionCall={functionCall} onUpdate={onUpdate} />
          </SplitItem>
        </Split>
      </AccordionToggle>
      <AccordionContent>
        <Stack hasGutter>
          {childrenArguments.map((arg) => (
            <StackItem>
              <FunctionCallArgument arg={arg} />
            </StackItem>
          ))}
        </Stack>
      </AccordionContent>
    </AccordionItem>
  );
};
