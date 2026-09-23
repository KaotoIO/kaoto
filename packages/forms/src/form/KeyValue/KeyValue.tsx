import { IconButton, Grid, Column, TextInput } from '@carbon/react';
import { Add, TrashCan } from '@carbon/icons-react';
import { FunctionComponent, useRef, useState } from 'react';
import { getCamelRandomId } from '../utils/camel-random-id';
import { KeyValueField } from './KeyValueField';

export type KeyValueType = Record<string, string>;

interface KeyValueProps {
  propName: string;
  initialModel?: KeyValueType;
  onChange: (model: KeyValueType) => void;
  disabled?: boolean;
}

type KeyValueEntry = [string, string];

/**
 * This component is used to manage a key-value pair object.
 * Internally it uses an array of tuples to represent the key-value pairs,
 * and it converts it to an object when calling the onChange callback.
 */
export const KeyValue: FunctionComponent<KeyValueProps> = ({ propName, initialModel, onChange, disabled = false }) => {
  const [internalModel, setInternalModel] = useState<KeyValueEntry[]>(Object.entries(initialModel ?? {}));
  const currentFocusIndex = useRef<['key' | 'value', number]>(['key', -1]);

  const getFocusRefFn = (location: 'key' | 'value', index: number) => (inputElement: HTMLInputElement | null) => {
    if (inputElement && location === currentFocusIndex.current[0] && index === currentFocusIndex.current[1]) {
      inputElement.focus();
    }
  };

  const updateModel = (newModel: KeyValueEntry[]) => {
    setInternalModel(newModel);
    onChange(Object.fromEntries(newModel));
  };

  const onAddNewProperty = () => {
    const newKey = getCamelRandomId('key', 4);
    const newKeyValue: KeyValueEntry = [newKey, ''];
    const newModel = [...internalModel, newKeyValue];
    currentFocusIndex.current = ['key', internalModel.length];
    updateModel(newModel);
  };

  const onRemoveProperty = (key: string) => {
    const newModel = internalModel.filter(([k]) => k !== key);
    updateModel(newModel);
  };

  const onPropertyKeyChange = (index: number, key: string, newKey: string) => {
    internalModel.at(index)![0] = newKey;
    updateModel([...internalModel]);
  };

  const onPropertyValueChange = (key: string, newValue: string) => {
    const newModel = internalModel.map(([k, v]): KeyValueEntry => (k === key ? [k, newValue] : [k, v]));
    updateModel(newModel);
  };

  const duplicateKeyExists = (key: string) => {
    return internalModel.filter(([k]) => k === key).length > 1;
  };

  return (
    <div>
      <Grid>
        <Column sm={2} md={3} lg={7}>
          <strong>Key</strong>
        </Column>
        <Column sm={2} md={3} lg={7}>
          <strong>Value</strong>
        </Column>
        <Column sm={0} md={2} lg={2}>
          <IconButton
            kind="ghost"
            data-testid={`${propName}__add`}
            onClick={onAddNewProperty}
            label="Add a new property"
            disabled={disabled}
          >
            <Add />
          </IconButton>
        </Column>
      </Grid>

      <hr />

      {/* In this iteration, it's ok to use the `id` of the element because using the `key` will
        cause for the input to lose focus when the list is updated. */}
      {internalModel.map(([key, value], index) => {
        return (
          <Grid key={index}>
            <Column sm={2} md={3} lg={7}>
              <TextInput
                labelText=""
                type="text"
                id={`${propName}__${key}__key`}
                name={`${propName}__${key}__key`}
                data-testid={`${propName}__key`}
                onChange={(event) => {
                  onPropertyKeyChange(index, key, event.target.value);
                }}
                ref={getFocusRefFn('key', index)}
                onFocus={() => {
                  currentFocusIndex.current = ['key', index];
                }}
                onBlur={() => {
                  currentFocusIndex.current = ['key', -1];
                }}
                placeholder="Write a key"
                value={key}
                invalid={duplicateKeyExists(key)}
              />
            </Column>

            <Column sm={2} md={3} lg={7}>
              <KeyValueField
                id={`${propName}__${key}__value`}
                name={`${propName}__${key}__value`}
                data-testid={`${propName}__value`}
                onChange={(value) => {
                  onPropertyValueChange(key, value);
                }}
                ref={getFocusRefFn('value', index)}
                onFocus={() => {
                  currentFocusIndex.current = ['value', index];
                }}
                onBlur={() => {
                  currentFocusIndex.current = ['value', -1];
                }}
                placeholder="Write a value"
                value={value}
              />
            </Column>

            <Column sm={0} md={2} lg={2}>
              <IconButton
                kind="ghost"
                data-testid={`${propName}__remove__${key}`}
                onClick={() => {
                  onRemoveProperty(key);
                }}
                label={`Remove the ${key} property`}
              >
                <TrashCan />
              </IconButton>
            </Column>
          </Grid>
        );
      })}
    </div>
  );
};
