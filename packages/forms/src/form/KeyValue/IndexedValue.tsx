import { IconButton, Grid, Column } from '@carbon/react';
import { Add, TrashCan } from '@carbon/icons-react';
import { FunctionComponent, useRef, useState } from 'react';
import { KeyValueField } from './KeyValueField';

export type KeyValueType = Record<string, string>;

interface KeyValueProps {
  propName: string;
  initialModel?: KeyValueType;
  onChange: (model: KeyValueType) => void;
  disabled?: boolean;
  isOrdered?: boolean;
}

type KeyValueEntry = [string, string];

const reindexModel = (model: KeyValueEntry[]): KeyValueEntry[] => {
  return model.map((value, index) => [index.toString(), value[1]] as KeyValueEntry);
};

/**
 * This component manages an ordered map with numeric string keys, after adding and removing values keys are re-indexed.
 * Internally it uses an array of tuples to represent the key-value pairs,
 * and it converts it to an object when calling the onChange callback.
 */
export const IndexedValue: FunctionComponent<KeyValueProps> = ({
  propName,
  initialModel,
  onChange,
  disabled = false,
}) => {
  // Ensure the initial model is sorted by key and re-indexed. Even if the keys aren't indexes camel is sorting them and uses indexes.
  const convertedInitialModel = initialModel
    ? reindexModel(Object.entries(initialModel).sort(([a], [b]) => Number(a) - Number(b)))
    : [];

  const [internalModel, setInternalModel] = useState<KeyValueEntry[]>(convertedInitialModel);

  const currentFocusIndex = useRef<['key' | 'value', number]>(['key', -1]);

  const getFocusRefFn = (location: 'value', index: number) => (inputElement: HTMLInputElement | null) => {
    if (inputElement && location === currentFocusIndex.current[0] && index === currentFocusIndex.current[1]) {
      inputElement.focus();
    }
  };

  const updateModel = (newModel: KeyValueEntry[]) => {
    setInternalModel(newModel);
    onChange(Object.fromEntries(newModel));
  };

  const onAddNewProperty = () => {
    const newKeyValue: KeyValueEntry = [internalModel.length.toString(), ''];
    const newModel = internalModel.map((value, index) => [index.toString(), value[1]] as KeyValueEntry);
    newModel.push(newKeyValue);

    currentFocusIndex.current = ['value', internalModel.length];
    updateModel(newModel);
  };

  const onRemoveProperty = (key: string) => {
    const newModel = internalModel
      .filter(([k]) => k !== key)
      .map((value, index) => [index.toString(), value[1]] as KeyValueEntry);
    updateModel(newModel);
  };

  const onPropertyValueChange = (key: string, newValue: string) => {
    const newModel = internalModel.map(([k, v]): KeyValueEntry => (k === key ? [k, newValue] : [k, v]));
    updateModel(newModel);
  };

  return (
    <div>
      <Grid>
        <Column sm={1} md={2} lg={3}>
          <strong>Index</strong>
        </Column>
        <Column sm={3} md={4} lg={11}>
          <strong>Argument Value</strong>
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

      {internalModel.map(([key, value], index) => {
        return (
          <Grid key={index}>
            <Column sm={1} md={2} lg={3}>
              <span data-testid={`${propName}__index`}>{key}</span>
            </Column>

            <Column sm={3} md={4} lg={11}>
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
