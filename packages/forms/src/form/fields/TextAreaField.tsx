import { TextArea } from '@carbon/react';
import { ChangeEvent, FunctionComponent, useContext, useRef } from 'react';
import { useFieldValue } from '../hooks/field-value';
import { useSuggestions } from '../hooks/suggestions';
import { FieldProps } from '../models/typings';
import { SchemaContext } from '../providers/SchemaProvider';
import { isDefined, isRawString } from '../utils';
import { FieldActions } from './FieldActions';
import { FieldWrapper } from './FieldWrapper';
import './TextAreaField.scss';

export const TextAreaField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', errors, disabled, isRaw, onChange } = useFieldValue<string>(propName);
  const lastPropName = propName.split('.').pop();
  const clearButtonAriaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${lastPropName} field`;
  const toggleRawAriaLabel = `Toggle RAW wrap for ${lastPropName} field`;
  const rows = Math.max(value.split('\n').length, 2);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const onFieldChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const onRemove = () => {
    if (isDefined(onRemoveProps)) {
      onRemoveProps(propName);
      return;
    }

    /** Clear field by removing its value */
    onChange(undefined as unknown as string);
    textAreaRef.current?.focus();
  };

  const toggleRawValueWrap = () => {
    if (typeof value !== 'string') return;

    const newValue = isRawString(value) ? value.substring(4, value.length - 1) : `RAW(${value})`;
    onChange(newValue);
  };

  const { suggestionsMenu, openSuggestions } = useSuggestions({
    propName,
    schema,
    inputRef: textAreaRef,
    value,
    setValue: onChange,
  });

  const id = `${propName}-popover`;

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
      defaultValue={schema.default?.toString()}
      errors={errors}
      isRaw={isRaw}
      onOpenSuggestions={openSuggestions}
    >
      <div className="textarea-field-container">
        <div className="textarea-field-input-wrapper">
          <TextArea
            labelText={''}
            rows={rows}
            type="text"
            role="textbox"
            id={propName}
            name={propName}
            placeholder={schema.default?.toString()}
            value={value}
            onChange={onFieldChange}
            aria-describedby={id}
            ref={textAreaRef}
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
    </FieldWrapper>
  );
};
