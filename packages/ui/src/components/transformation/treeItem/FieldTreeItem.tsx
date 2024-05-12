import { ActionList, ActionListItem, Divider, Tooltip, TreeViewDataItem } from '@patternfly/react-core';
import { ReactNode } from 'react';
import { IField } from '../../../models';
import { FunctionSelector } from '../action/FunctionSelector';
import { ForEachButton } from '../action/ForEachButton';
import { DeleteFieldButton } from '../action/DeleteFieldButton';

export class FieldTreeItem implements TreeViewDataItem {
  name: ReactNode;
  action: ReactNode;

  constructor(field: IField) {
    this.name = (
      <Tooltip content={field.fieldIdentifier.toString()}>
        <div>{field.expression}</div>
      </Tooltip>
    );

    this.action = (
      <ActionList>
        <Divider
          orientation={{
            default: 'vertical',
          }}
        />
        <ActionListItem>
          <FunctionSelector onSelect={() => {}} />
        </ActionListItem>
        {field.maxOccurs > 1 && (
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
    );
  }
}
