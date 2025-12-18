import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { InputGroup, InputGroupItem, TextArea } from '@patternfly/react-core';
import { FunctionComponent, useContext, useRef } from 'react';

export const MessageBodyField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange, disabled } = useFieldValue<string>(propName);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const onFieldChange = (_event: unknown, value: string) => {
    onChange(value);
  };

  return (
    <>
      <FieldWrapper
        propName={propName}
        required={required}
        title={schema.title}
        type="string"
        description={schema.description}
        defaultValue={schema.default?.toString()}
      >
        <InputGroup>
          <InputGroupItem isFill>
            <TextArea
              rows={5}
              type="text"
              role="textbox"
              id={propName}
              name={propName}
              placeholder={schema.default?.toString()}
              value={value}
              onChange={onFieldChange}
              aria-describedby={`${propName}-popover`}
              isDisabled={disabled}
              ref={textAreaRef}
            />
          </InputGroupItem>
        </InputGroup>
      </FieldWrapper>
    </>
  );
};
