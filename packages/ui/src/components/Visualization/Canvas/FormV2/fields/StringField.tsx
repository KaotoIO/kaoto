import { TextInputGroup, TextInputGroupMain, TextInputGroupUtilities } from '@patternfly/react-core';
import { FunctionComponent, useContext, useState } from 'react';
import { isDefined } from '../../../../../utils';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldActions } from './FieldActions';
import { FieldWrapper } from './FieldWrapper';

export const StringField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', errors, onChange, isRaw, disabled } = useFieldValue<string | number>(propName);
  const [fieldValue, setFieldValue] = useState<string | number>(value);
  const lastPropName = propName.split('.').pop();
  const ariaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${lastPropName} field`;
  const schemaType = typeof schema.type === 'string' ? schema.type : 'unknown';
  const isNumberSchema = schema.type === 'number' || schema.type === 'integer';

  const onFieldChange = (_event: unknown, newValue: string) => {
    setFieldValue(newValue);

    const isEmptyString = newValue === '' || newValue === undefined;
    const isNumber = isNumberSchema && !isEmptyString && !isNaN(Number(newValue));
    /* To handle inputs under construction, for instance 2. */
    const isPartialNumber = typeof newValue === 'string' && newValue.endsWith('.');

    if (isNumber && !isPartialNumber) {
      onChange(Number(newValue));
      return;
    }

    onChange(newValue);
  };

  const onRemove = () => {
    if (isDefined(onRemoveProps)) {
      onRemoveProps(propName);
      return;
    }

    /** Clear field by removing its value */
    onChange(undefined as unknown as string);
  };

  const id = `${propName}-popover`;

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type={schemaType}
      description={schema.description}
      defaultValue={schema.default?.toString()}
      errors={errors}
      isRaw={isRaw}
    >
      <TextInputGroup validated={errors ? 'error' : undefined} isDisabled={disabled}>
        <TextInputGroupMain
          type="text"
          role="textbox"
          className="pf-m-icon kaoto-form__string-field"
          id={propName}
          name={propName}
          placeholder={schema.default?.toString()}
          value={fieldValue}
          onChange={onFieldChange}
          aria-label={schema.title}
          aria-describedby={id}
        />

        <TextInputGroupUtilities>
          <FieldActions propName={propName} clearAriaLabel={ariaLabel} onRemove={onRemove} />
        </TextInputGroupUtilities>
      </TextInputGroup>
    </FieldWrapper>
  );
};
