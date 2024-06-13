import { ExpressionItem } from '../../../../models/mapping';
import { FormEvent, FunctionComponent, useCallback } from 'react';
import { ActionListGroup, ActionListItem, InputGroup, InputGroupItem, TextInput } from '@patternfly/react-core';

type ExpressionInputProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const ExpressionInputAction: FunctionComponent<ExpressionInputProps> = ({ mapping, onUpdate }) => {
  const handleExpressionChange = useCallback(
    (_event: FormEvent, value: string) => {
      if (mapping) {
        mapping.expression = value;
        onUpdate();
      }
    },
    [mapping, onUpdate],
  );

  return (
    <ActionListGroup key="transformation-expression-input">
      <ActionListItem>
        <InputGroup>
          <InputGroupItem>
            <TextInput
              data-testid="transformation-expression-input"
              id="expression"
              type="text"
              value={mapping.expression as string}
              onChange={handleExpressionChange}
            />
          </InputGroupItem>
        </InputGroup>
      </ActionListItem>
    </ActionListGroup>
  );
};
