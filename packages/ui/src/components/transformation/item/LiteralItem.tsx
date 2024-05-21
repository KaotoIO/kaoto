import {
  AccordionContent,
  AccordionItem,
  ActionList,
  ActionListItem,
  Divider,
  Label,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { GripVerticalIcon } from '@patternfly/react-icons';
import { ILiteralItem } from '../../../models';
import { DeleteItemButton } from '../action/DeleteItemButton';
import { InlineEdit } from '../action/InlineEdit';
import { TransformationService } from '../../../services/transformation.service';

type LiteralItemProps = {
  literal: ILiteralItem;
  onUpdate: () => void;
};

const LiteralButtons: FunctionComponent<LiteralItemProps> = ({ literal, onUpdate }) => {
  const handleDelete = useCallback(() => {
    TransformationService.removeFromParent(literal);
    onUpdate();
  }, [literal, onUpdate]);

  return (
    <ActionList>
      <Divider
        orientation={{
          default: 'vertical',
        }}
      />
      <ActionListItem>
        <DeleteItemButton itemName="constant" onClick={handleDelete} />
      </ActionListItem>
    </ActionList>
  );
};

export const LiteralItem: FunctionComponent<LiteralItemProps> = ({ literal, onUpdate }) => {
  return (
    <AccordionItem>
      <AccordionContent>
        <Split hasGutter>
          <SplitItem>
            <GripVerticalIcon />
            <Label isCompact>Constant</Label>
          </SplitItem>
          <SplitItem isFilled>
            <InlineEdit value={literal.value} onSave={(v) => (literal.value = v)} />
          </SplitItem>
          <SplitItem>
            <LiteralButtons literal={literal} onUpdate={onUpdate} />
          </SplitItem>
        </Split>
      </AccordionContent>
    </AccordionItem>
  );
};
