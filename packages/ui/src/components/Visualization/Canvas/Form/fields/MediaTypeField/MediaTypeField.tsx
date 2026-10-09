import './MediaTypeField.scss';

import { Button, MultiSelect, TextInput } from '@carbon/react';
import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, KeyboardEvent, useCallback, useContext, useMemo, useState } from 'react';

import { SettingsContext } from '../../../../../../providers/settings.provider';

const COMMON_MEDIA_TYPES = new Set([
  'application/json',
  'application/xml',
  'text/plain',
  'text/csv',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'application/octet-stream',
  'application/pdf',
  'text/html',
  'text/css',
  'application/javascript',
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/gif',
  'application/zip',
  'application/gzip',
  'application/x-gzip',
  'application/soap+xml',
  'application/x-yaml',
  'application/rtf',
  'application/EDI-X12',
  'application/EDIFACT',
  'application/fhir+json',
  'application/fhir+xml',
  'application/dicom',
  'application/geo+json',
  'application/gml+xml',
  'application/cbor',
  'application/senml+json',
  'application/senml+xml',
  'application/pkcs7-mime',
  'application/pkcs7-signature',
]);

const parseMediaTypes = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

export const MediaTypeField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value, onChange, disabled } = useFieldValue<string | undefined>(propName);
  const [customValue, setCustomValue] = useState('');
  const settingsAdapter = useContext(SettingsContext);
  const settings = settingsAdapter.getSettings();
  const storedMediaTypes = useMemo(() => {
    return settings.rest.customMediaTypes;
  }, [settings]);

  const selectedValues = useMemo(() => parseMediaTypes(value), [value]);

  const options = useMemo(() => {
    const customValues = selectedValues.filter((item) => !COMMON_MEDIA_TYPES.has(item));
    const merged = new Set<string>([...COMMON_MEDIA_TYPES, ...storedMediaTypes, ...customValues]);
    return Array.from(merged);
  }, [selectedValues, storedMediaTypes]);

  const addCustomValue = useCallback(() => {
    const trimmed = customValue.trim();
    if (!trimmed) {
      return;
    }
    const nextStored = storedMediaTypes.includes(trimmed) ? storedMediaTypes : [...storedMediaTypes, trimmed];
    const nextValues = selectedValues.includes(trimmed) ? selectedValues : [...selectedValues, trimmed];

    if (nextStored !== storedMediaTypes) {
      const updatedSettings = {
        ...settings,
        rest: {
          ...settings.rest,
          customMediaTypes: nextStored,
        },
      };
      settingsAdapter.saveSettings(updatedSettings);
    }
    if (nextValues !== selectedValues) {
      onChange(nextValues.join(', '));
    }
    setCustomValue('');
  }, [customValue, onChange, selectedValues, storedMediaTypes, settings, settingsAdapter]);

  const onCustomKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCustomValue();
      }
    },
    [addCustomValue],
  );

  let defaultValue: string | undefined;
  if (schema.default !== undefined && schema.default !== null) {
    defaultValue = typeof schema.default === 'object' ? JSON.stringify(schema.default) : String(schema.default);
  }

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
      defaultValue={defaultValue}
    >
      <div data-testid="media-type-field-toggle">
        <MultiSelect
          id={`${propName}-media-type`}
          titleText=""
          hideLabel
          label={selectedValues.length > 0 ? selectedValues.join(', ') : 'Select media types'}
          items={options}
          itemToString={(item: string) => item}
          selectedItems={selectedValues}
          onChange={({ selectedItems }: { selectedItems: string[] }) => {
            onChange(selectedItems.length > 0 ? selectedItems.join(', ') : undefined);
          }}
          disabled={disabled}
        />
      </div>
      <div className="media-type-field-custom">
        <TextInput
          id={`${propName}-custom-input`}
          labelText=""
          hideLabel
          aria-label="Custom media type"
          value={customValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setCustomValue(e.target.value);
          }}
          onKeyDown={onCustomKeyDown}
          placeholder="Add custom media type"
          disabled={disabled}
        />
        <Button kind="secondary" size="md" onClick={addCustomValue} disabled={disabled || customValue.trim() === ''}>
          Add
        </Button>
      </div>
    </FieldWrapper>
  );
};
