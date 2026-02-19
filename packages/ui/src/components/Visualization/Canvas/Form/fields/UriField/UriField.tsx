import './UriField.scss';

import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useContext } from 'react';

import { InlineEdit } from '../../../../../InlineEdit';

export const UriField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange } = useFieldValue<string | undefined>(propName);

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <InlineEdit
        editTitle={`Edit ${schema.title ?? 'URI'}`}
        textTitle={schema.title ?? 'URI'}
        data-testid={propName}
        value={value}
        placeholder="Click to add 'uri'"
        className="uri-group"
        onChange={(newValue: string) => {
          onChange(newValue || undefined);
        }}
      />
    </FieldWrapper>
  );
};
