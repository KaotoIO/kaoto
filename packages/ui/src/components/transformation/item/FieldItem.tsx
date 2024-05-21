import {
  AccordionContent,
  AccordionItem,
  ActionList,
  ActionListItem,
  Divider,
  Label,
  Split,
  SplitItem,
  Truncate,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { IFieldItem } from '../../../models';
import { ForEachButton } from '../action/ForEachButton';
import { DeleteItemButton } from '../action/DeleteItemButton';
import { GripVerticalIcon } from '@patternfly/react-icons';
import { TransformationService } from '../../../services/transformation.service';

type FieldTreeItemProps = {
  field: IFieldItem;
  onUpdate: () => void;
};

const FieldButtons: FunctionComponent<FieldTreeItemProps> = ({ field, onUpdate }) => {
  const handleDelete = useCallback(() => {
    TransformationService.removeFromParent(field);
    onUpdate();
  }, [field, onUpdate]);

  return (
    <ActionList>
      {field.field.maxOccurs > 1 && (
        <>
          <Divider
            orientation={{
              default: 'vertical',
            }}
          />
          <ActionListItem>
            <ForEachButton onClick={() => {}} />
          </ActionListItem>
        </>
      )}
      <Divider
        orientation={{
          default: 'vertical',
        }}
      />
      <ActionListItem>
        <DeleteItemButton itemName="field" onClick={handleDelete} />
      </ActionListItem>
    </ActionList>
  );
};

export const FieldItem: FunctionComponent<FieldTreeItemProps> = ({ field, onUpdate }) => {
  return (
    <AccordionItem>
      <AccordionContent>
        <Split hasGutter>
          <SplitItem>
            <GripVerticalIcon />
            <Label isCompact>Field</Label>
          </SplitItem>
          <SplitItem isFilled>
            <Truncate content={field.field.fieldIdentifier.toString()} />
          </SplitItem>
          <SplitItem>
            <FieldButtons field={field} onUpdate={onUpdate} />
          </SplitItem>
        </Split>
      </AccordionContent>
    </AccordionItem>
  );
};
