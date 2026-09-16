import { FunctionComponent, ReactNode, useCallback, useContext, useRef, useState, ChangeEvent } from 'react';
import { useFieldValue } from '../hooks/field-value';
import { useSuggestions } from '../hooks/suggestions';
import { FieldProps } from '../models/typings';
import { SchemaContext } from '../providers/SchemaProvider';
import { isDefined, isRawString } from '../utils';
import { FieldWrapper } from './FieldWrapper';
import { TextInput } from '@carbon/react';
import { FieldActions } from './FieldActions';
import './StringField.scss';

interface StringFieldProps extends FieldProps {
  fieldType?: string;
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

  const onFieldChange = useCallback(
    (_event: unknown, newValue: string) => {
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
    },
    [isNumberSchema, onChange],
  );

  const handleTextInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onFieldChange(event, event.currentTarget.value);
    },
    [onFieldChange],
  );

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

  const setValue = useCallback(
    (value: string | number) => {
      onFieldChange(null, value.toString());
    },
    [onFieldChange],
  );

  const { suggestionsMenu, openSuggestions } = useSuggestions({
    propName,
    schema,
    inputRef,
    value: fieldValue,
    setValue,
  });

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
      onOpenSuggestions={openSuggestions}
    >
      <div className="string-field-container">
        <div className="string-field-input-wrapper">
          <TextInput
            hideLabel
            labelText={schema.title}
            role="textbox"
            id={propName}
            name={propName}
            type={fieldType}
            placeholder={schema.default?.toString()}
            value={fieldValue}
            data-testid={propName}
            onChange={handleTextInputChange}
            aria-label={schema.title}
            aria-describedby={id}
            ref={inputRef}
            disabled={disabled}
          />
        </div>
        <FieldActions
          propName={propName}
          clearAriaLabel={clearButtonAriaLabel}
          removeLabel={isDefined(onRemoveProps) ? 'Remove' : 'Clear'}
          toggleRawAriaLabel={toggleRawAriaLabel}
          onRemove={onRemove}
          toggleRawValueWrap={toggleRawValueWrap}
        />
      </div>
      {suggestionsMenu}
      {additionalUtility}
    </FieldWrapper>
  );
};
