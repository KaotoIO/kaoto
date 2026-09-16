import { PasswordInput } from '@carbon/react';
import { FunctionComponent, useCallback, useContext, useRef, ChangeEvent } from 'react';
import { useFieldValue } from '../hooks/field-value';
import { useSuggestions } from '../hooks/suggestions';
import { FieldProps } from '../models/typings';
import { SchemaContext } from '../providers/SchemaProvider';
import { isDefined, isRawString } from '../utils';
import { FieldActions } from './FieldActions';
import { FieldWrapper } from './FieldWrapper';
import './PasswordField.scss';

export const PasswordField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', errors, disabled, isRaw, onChange } = useFieldValue<string>(propName);

  const lastPropName = propName.split('.').pop();
  const clearButtonAriaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${lastPropName} field`;
  const toggleRawAriaLabel = `Toggle RAW wrap for ${lastPropName} field`;
  const inputRef = useRef<HTMLInputElement>(null);

  const onFieldChange = useCallback(
    (_event: unknown, value: string) => {
      onChange(value);
    },
    [onChange],
  );

  const handlePasswordInputChange = useCallback(
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
    inputRef.current?.focus();
  };

  const toggleRawValueWrap = () => {
    if (typeof value !== 'string') return;

    const newValue = isRawString(value) ? value.substring(4, value.length - 1) : `RAW(${value})`;
    onChange(newValue);
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
    value,
    setValue,
  });

  const id = `${propName}-popover`;

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="secret"
      description={schema.description}
      defaultValue={schema.default?.toString()}
      errors={errors}
      isRaw={isRaw}
      onOpenSuggestions={openSuggestions}
    >
      <div className="password-field-container">
        <div className="password-field-input-wrapper">
          <PasswordInput
            labelText=""
            id={propName}
            name={propName}
            placeholder={schema.default?.toString()}
            value={value}
            data-testid={propName}
            onChange={handlePasswordInputChange}
            aria-label={schema.title}
            aria-describedby={id}
            ref={inputRef}
            disabled={disabled}
          />
        </div>
        <FieldActions
          propName={propName}
          clearAriaLabel={clearButtonAriaLabel}
          toggleRawAriaLabel={toggleRawAriaLabel}
          onRemove={onRemove}
          toggleRawValueWrap={toggleRawValueWrap}
        />
      </div>
      {suggestionsMenu}
    </FieldWrapper>
  );
};
