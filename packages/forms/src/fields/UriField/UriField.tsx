import './UriField.scss';

import { Checkmark, Close, Edit, Link } from '@carbon/icons-react';
import { IconButton, TextInput } from '@carbon/react';
import {
  FunctionComponent,
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { useFieldValue } from '../../hooks/field-value';
import { FieldProps } from '../../models/typings';
import { SchemaContext } from '../../providers/SchemaProvider';
import { FieldWrapper } from '../FieldWrapper';

export const UriField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange } = useFieldValue<string | undefined>(propName);

  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      setLocalValue(value);
      setIsEditing(true);
      event.stopPropagation();
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [value],
  );

  const save = useCallback(() => {
    setIsEditing(false);
    onChange(localValue || undefined);
  }, [localValue, onChange]);

  const cancel = useCallback(() => {
    setLocalValue(value);
    setIsEditing(false);
  }, [value]);

  const onSave: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      save();
      event.stopPropagation();
    },
    [save],
  );

  const onCancel: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      cancel();
      event.stopPropagation();
    },
    [cancel],
  );

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.key === 'Enter') save();
      if (event.key === 'Escape') cancel();
      event.stopPropagation();
    },
    [save, cancel],
  );

  const label = schema.title ?? 'URI';

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={label}
      type="string"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <div className="uri-field-container">
        <Link className="uri-field-icon" />
        <div className="uri-field-input-wrapper">
          <TextInput
            id={propName}
            labelText={label}
            hideLabel
            size="sm"
            ref={inputRef}
            value={isEditing ? localValue : value}
            placeholder="Click to add 'uri'"
            className="uri-field-input"
            readOnly={!isEditing}
            data-testid={isEditing ? `${propName}--text-input` : propName}
            onChange={(e) => {
              setLocalValue(e.target.value);
            }}
            onKeyDown={onKeyDown}
          />
        </div>
        {isEditing ? (
          <>
            <IconButton kind="ghost" size="sm" label="Save" onClick={onSave} data-testid={`${propName}--save`}>
              <Checkmark />
            </IconButton>
            <IconButton kind="ghost" size="sm" label="Cancel" onClick={onCancel} data-testid={`${propName}--cancel`}>
              <Close />
            </IconButton>
          </>
        ) : (
          <IconButton
            kind="ghost"
            size="sm"
            label={`Edit ${label}`}
            onClick={startEditing}
            data-testid={`${propName}--edit`}
          >
            <Edit />
          </IconButton>
        )}
      </div>
    </FieldWrapper>
  );
};
