import { Button, Content, Split, SplitItem, TextInputGroup, TextInputGroupMain } from '@patternfly/react-core';
import { PlusIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useRef, useState } from 'react';
import { getCamelRandomId } from '../../camel-utils/camel-random-id';

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

  const onPropertyKeyChange = (key: string, newKey: string) => {
    const newModel = internalModel.map(([k, v]): KeyValueEntry => (k === key ? [newKey, v] : [k, v]));
    updateModel(newModel);
  };

  const onPropertyValueChange = (key: string, newValue: string) => {
    const newModel = internalModel.map(([k, v]): KeyValueEntry => (k === key ? [k, newValue] : [k, v]));
    updateModel(newModel);
  };

  return (
    <>
      <Split hasGutter>
        <SplitItem isFilled>Key</SplitItem>
        <SplitItem isFilled>Value</SplitItem>
        <SplitItem>
          <Button
            variant="plain"
            data-testid={`${propName}__add`}
            onClick={onAddNewProperty}
            aria-label="Add a new property"
            title="Add a new property"
            icon={<PlusIcon />}
            isDisabled={disabled}
          />
        </SplitItem>
      </Split>

      <Content component="hr" />

      {/* In this iteration, it's ok to use the `id` of the element because using the `key` will
        cause for the input to lose focus when the list is updated. */}
      {internalModel.map(([key, value], index) => {
        return (
          <Split hasGutter key={index}>
            <SplitItem isFilled>
              <TextInputGroup>
                <TextInputGroupMain
                  type="text"
                  id={`${propName}__${key}__key`}
                  name={`${propName}__${key}__key`}
                  data-testid={`${propName}__key`}
                  onChange={(_event, value) => {
                    onPropertyKeyChange(key, value);
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
                />
              </TextInputGroup>
            </SplitItem>

            <SplitItem isFilled>
              <TextInputGroup>
                <TextInputGroupMain
                  type="text"
                  id={`${propName}__${key}__value`}
                  name={`${propName}__${key}__value`}
                  data-testid={`${propName}__value`}
                  onChange={(_event, value) => {
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
              </TextInputGroup>
            </SplitItem>

            <SplitItem>
              <Button
                variant="plain"
                data-testid={`${propName}__remove__${key}`}
                onClick={() => {
                  onRemoveProperty(key);
                }}
                aria-label={`Remove the ${key} property`}
                title={`Remove the ${key} property`}
                icon={<TrashIcon />}
              />
            </SplitItem>
          </Split>
        );
      })}
    </>
  );
};
