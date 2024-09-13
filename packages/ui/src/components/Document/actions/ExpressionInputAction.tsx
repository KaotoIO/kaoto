import { ExpressionItem } from '../../../models/datamapper/mapping';
import { FormEvent, FunctionComponent, MouseEvent, useCallback } from 'react';
import { ActionListItem, InputGroup, InputGroupItem, TextInput } from '@patternfly/react-core';

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

  const stopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  return (
    <ActionListItem key="expression-input">
      <InputGroup>
        <InputGroupItem>
          <TextInput
            data-testid="transformation-expression-input"
            id="expression"
            type="text"
            value={mapping.expression as string}
            onChange={handleExpressionChange}
            onMouseMove={stopPropagation}
          />
        </InputGroupItem>
      </InputGroup>
    </ActionListItem>
  );
};
