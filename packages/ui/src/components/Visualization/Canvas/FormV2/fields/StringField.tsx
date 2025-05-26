import {
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupMainProps,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { FunctionComponent, ReactNode, useContext, useRef, useState } from 'react';
import { isDefined, isRawString } from '../../../../../utils';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldActions } from './FieldActions';
import { FieldWrapper } from './FieldWrapper';

interface StringFieldProps extends FieldProps {
  fieldType?: TextInputGroupMainProps['type'];
  additionalUtility?: ReactNode;
}

export const StringField: FunctionComponent<StringFieldProps> = ({
  propName,
  required,
  onRemove: onRemoveProps,
  fieldType = 'text',
  additionalUtility,
}) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', errors, disabled, isRaw, onChange } = useFieldValue<string | number>(propName);
  const isNumberSchema = schema.type === 'number' || schema.type === 'integer';
  const [fieldValue, setFieldValue] = useState<string | number>(value);

  const lastPropName = propName.split('.').pop();
  const clearButtonAriaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${lastPropName} field`;
  const toggleRawAriaLabel = `Toggle RAW wrap for ${lastPropName} field`;
  const schemaType = typeof schema.type === 'string' ? schema.type : 'unknown';
  const inputRef = useRef<HTMLInputElement>(null);

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
    setFieldValue('');
    inputRef.current?.focus();
  };

  const toggleRawValueWrap = () => {
    if (typeof value !== 'string') return;

    const newValue = isRawString(value) ? value.substring(4, value.length - 1) : `RAW(${value})`;
    onChange(newValue);
    setFieldValue(newValue);
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
          type={fieldType}
          role="textbox"
          className="pf-m-icon kaoto-form__string-field"
          id={propName}
          name={propName}
          placeholder={schema.default?.toString()}
          value={fieldValue}
          onChange={onFieldChange}
          aria-label={schema.title}
          aria-describedby={id}
          ref={inputRef}
        />

        <TextInputGroupUtilities>
          {additionalUtility}

          <FieldActions
            propName={propName}
            clearAriaLabel={clearButtonAriaLabel}
            toggleRawAriaLabel={toggleRawAriaLabel}
            onRemove={onRemove}
            toggleRawValueWrap={toggleRawValueWrap}
          />
        </TextInputGroupUtilities>
      </TextInputGroup>
    </FieldWrapper>
  );
};
