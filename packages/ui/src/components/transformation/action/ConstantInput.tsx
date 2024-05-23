import { FunctionComponent, useCallback, useState } from 'react';
import { Button, InputGroup, InputGroupItem, TextInput, Tooltip } from '@patternfly/react-core';

type ConstantInputProps = {
  onSubmit: (value: string) => void;
};
export const ConstantInput: FunctionComponent<ConstantInputProps> = ({ onSubmit }) => {
  const [text, setText] = useState<string>('');

  const handleSubmit = useCallback(() => {
    onSubmit(text);
    setText('');
  }, [onSubmit, text]);

  return (
    <InputGroup>
      <InputGroupItem>
        <TextInput id="input-constant-value" onChange={(_event, value) => setText(value)} value={text} />
      </InputGroupItem>
      <InputGroupItem>
        <Tooltip content={'Add constant'}>
          <Button
            isDisabled={!text}
            variant="control"
            aria-label="Add constant"
            data-testid={`add-constant-button`}
            onClick={handleSubmit}
          >
            Add
          </Button>
        </Tooltip>
      </InputGroupItem>
    </InputGroup>
  );
};
