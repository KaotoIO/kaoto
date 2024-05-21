import {
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  ActionList,
  ActionListItem,
  Divider,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { IForEach } from '../../../models';
import { FunctionComponent, useCallback } from 'react';
import { GripVerticalIcon } from '@patternfly/react-icons';
import { FunctionSelector } from '../action/FunctionSelector';
import { DeleteItemButton } from '../action/DeleteItemButton';
import { TransformationService } from '../../../services/transformation.service';

type ForEachTreeItemProps = {
  forEach: IForEach;
  onUpdate: () => void;
};

const ForEachButtons: FunctionComponent<ForEachTreeItemProps> = ({ forEach, onUpdate }) => {
  const handleDelete = useCallback(() => {
    TransformationService.removeFromParent(forEach);
    onUpdate();
  }, [forEach, onUpdate]);

  return (
    <ActionList>
      <Divider
        orientation={{
          default: 'vertical',
        }}
      />
      <ActionListItem>
        <FunctionSelector onSubmit={() => {}} />
      </ActionListItem>
      <Divider
        orientation={{
          default: 'vertical',
        }}
      />
      <ActionListItem>
        <DeleteItemButton itemName="for-each" onClick={handleDelete} />
      </ActionListItem>
    </ActionList>
  );
};

export const ForEachItem: FunctionComponent<ForEachTreeItemProps> = ({ forEach, onUpdate }) => {
  return (
    <AccordionItem>
      <AccordionToggle id={`foreach-${forEach.collection.expression}`}>
        <Split hasGutter>
          <SplitItem>
            <GripVerticalIcon />
          </SplitItem>
          <SplitItem isFilled>{'For each ' + forEach.collection.fieldIdentifier.toString()}</SplitItem>
          <SplitItem>
            <ForEachButtons forEach={forEach} onUpdate={onUpdate} />
          </SplitItem>
        </Split>
      </AccordionToggle>
      <AccordionContent>{forEach.collection.fieldIdentifier.toString()}</AccordionContent>
    </AccordionItem>
  );
};
