import { ExpressionItem } from '../../../models/datamapper/mapping';
import { FormEvent, FunctionComponent, MouseEvent, useCallback } from 'react';
import { ActionListItem, InputGroup, InputGroupItem, TextInput } from '@patternfly/react-core';

type XPathInputProps = {
  mapping: ExpressionItem;
  onUpdate: () => void;
};
export const XPathInputAction: FunctionComponent<XPathInputProps> = ({ mapping, onUpdate }) => {
  const handleXPathChange = useCallback(
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
    <ActionListItem key="xpath-input">
      <InputGroup>
        <InputGroupItem>
          <TextInput
            data-testid="transformation-xpath-input"
            id="xpath"
            type="text"
            value={mapping.expression as string}
            onChange={handleXPathChange}
            onMouseMove={stopPropagation}
          />
        </InputGroupItem>
      </InputGroup>
    </ActionListItem>
  );
};
