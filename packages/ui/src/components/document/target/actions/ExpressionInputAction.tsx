import { ExpressionItem } from '../../../../models/mapping';
import { FormEvent, FunctionComponent, KeyboardEvent, useCallback } from 'react';
import { ActionListGroup, ActionListItem, InputGroup, InputGroupItem, TextInput } from '@patternfly/react-core';

type ExpressionInputProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const ExpressionInputAction: FunctionComponent<ExpressionInputProps> = ({ mapping, onUpdate }) => {
  const handleExpressionChange = useCallback(
    (event: FormEvent, value: string) => {
      if (mapping) {
        mapping.expression = value;
        onUpdate();
      }
      event.stopPropagation();
    },
    [mapping, onUpdate],
  );

  const handleStopPropagation = useCallback((event: KeyboardEvent | FormEvent) => {
    event.stopPropagation();
  }, []);

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
              onKeyDown={handleStopPropagation}
              onClick={handleStopPropagation}
              onSelect={handleStopPropagation}
            />
          </InputGroupItem>
        </InputGroup>
      </ActionListItem>
    </ActionListGroup>
  );
};
