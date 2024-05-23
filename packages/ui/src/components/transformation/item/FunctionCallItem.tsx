import {
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  ActionList,
  ActionListItem,
  Button,
  Card,
  CardHeader,
  Divider,
  Label,
  Popover,
  Split,
  SplitItem,
  StackItem,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { IFunctionCall, IFunctionCallArgument, IFunctionCallArgumentType } from '../../../models';
import { ItemHelper } from './item-helper';
import { GripVerticalIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { FunctionIcon } from '../FunctionIcon';
import { DeleteItemButton } from '../action/DeleteItemButton';
import { TransformationService } from '../../../services/transformation.service';
import { HeaderActionList } from '../action/headerActionList';

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
  const [argInstances, setArgInstances] = useState<IFunctionCallArgumentType[]>(arg.values);
  const handleChildrenUpdate = useCallback(() => setArgInstances([...arg.values]), [arg]);

  const headerActions = useMemo(
    () => <HeaderActionList transformation={arg} onUpdate={handleChildrenUpdate} />,
    [arg, handleChildrenUpdate],
  );

  return (
    <AccordionItem>
      <AccordionContent>
        <Card isCompact>
          <CardHeader actions={{ actions: headerActions }}>
            {arg.definition.displayName}
            <Popover bodyContent={arg.definition.description}>
              <Button component="small" variant="plain" icon={<InfoCircleIcon />} />
            </Popover>
          </CardHeader>
          {argInstances.map((argInstance) => (
            <StackItem>{ItemHelper.createTransformationItem(argInstance, handleChildrenUpdate)}</StackItem>
          ))}
        </Card>
      </AccordionContent>
    </AccordionItem>
  );
};

export const FunctionCallItem: FunctionComponent<FunctionCallTreeItemProps> = ({ functionCall, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

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
          <SplitItem isFilled>
            {functionCall.definition.displayName}
            <Popover bodyContent={functionCall.definition.description}>
              <Button
                component="small"
                variant="plain"
                icon={<InfoCircleIcon />}
                onClick={(event) => event.stopPropagation()}
              />
            </Popover>
          </SplitItem>
          <SplitItem>
            <FunctionCallButtons functionCall={functionCall} onUpdate={onUpdate} />
          </SplitItem>
        </Split>
      </AccordionToggle>
      <AccordionContent isHidden={!isExpanded}>
        Arguments
        {functionCall.arguments.map((arg, index) => (
          <FunctionCallArgument key={index} arg={arg} />
        ))}
      </AccordionContent>
    </AccordionItem>
  );
};
