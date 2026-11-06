import './EditInPlaceField.scss';

import { EditInPlace } from '@carbon/ibm-products';
import { FunctionComponent, KeyboardEvent, useContext, useRef, useState } from 'react';

import { useFieldValue } from '../hooks/field-value';
import { FieldProps } from '../models/typings';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldWrapper } from './FieldWrapper';

export const EditInPlaceField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', errors, onChange } = useFieldValue<string | undefined>(propName);
  const [prevValue, setPrevValue] = useState(value);
  const [localValue, setLocalValue] = useState(value);
  // EditInPlace keeps its own baseline for Cancel and for the save-on-blur check, and never refreshes it
  // from the `value` prop. Remount it when the model changes from outside (not after our own save).
  const [editorKey, setEditorKey] = useState(0);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== localValue) {
      setLocalValue(value);
      setEditorKey((key) => key + 1);
    }
  }

  // EditInPlace saves a changed value as soon as the input loses focus. Providing a blur handler turns that
  // off, so the value is only saved with the Save button (or Enter) and a blur discards the unsaved draft.
  // EditInPlace blurs the input itself when Enter is pressed, right before it saves; that blur must not
  // discard the draft.
  const isEnterPressed = useRef(false);
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    isEnterPressed.current = event.key === 'Enter';
  };
  const onBlur = (initial: string) => {
    if (isEnterPressed.current) {
      isEnterPressed.current = false;
      return;
    }
    setLocalValue(initial);
  };

  const label = schema.title ?? 'URI';

  let defaultValue: string | undefined;
  if (schema.default !== undefined && schema.default !== null) {
    defaultValue = typeof schema.default === 'object' ? JSON.stringify(schema.default) : String(schema.default);
  }

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={label}
      type="string"
      description={schema.description}
      defaultValue={defaultValue}
    >
      <div className="uri-field-container">
        <div className="uri-field-input-wrapper uri-field-input" onKeyDownCapture={onKeyDownCapture}>
          <EditInPlace
            key={editorKey}
            id={propName}
            labelText={label}
            value={localValue}
            /* EditInPlace blocks saving while invalid, so the error is hidden once the draft differs from the saved value */
            invalid={!!errors && localValue === value}
            invalidText={errors?.join(', ')}
            placeholder="Click to add 'uri'"
            editAlwaysVisible
            saveLabel="Save"
            cancelLabel="Cancel"
            editLabel={`Edit ${label}`}
            onChange={(val) => {
              setLocalValue(val);
            }}
            onSave={() => {
              onChange(localValue || undefined);
            }}
            onCancel={(initial) => {
              setLocalValue(initial);
            }}
            onBlur={onBlur}
          />
        </div>
      </div>
    </FieldWrapper>
  );
};
