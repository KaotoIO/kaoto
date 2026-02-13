import './MediaTypeField.scss';

import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import {
  Button,
  Divider,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  TextInput,
} from '@patternfly/react-core';
import { FunctionComponent, KeyboardEvent, MouseEvent, Ref, useCallback, useContext, useMemo, useState } from 'react';

import { SettingsContext } from '../../../../../../providers/settings.provider';

const COMMON_MEDIA_TYPES = [
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
];

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
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const settingsAdapter = useContext(SettingsContext);
  const settings = settingsAdapter.getSettings();
  const storedMediaTypes = useMemo(() => {
    return settings.rest.customMediaTypes;
  }, [settings]);

  const selectedValues = useMemo(() => parseMediaTypes(value), [value]);

  const options = useMemo(() => {
    const customValues = selectedValues.filter((item) => !COMMON_MEDIA_TYPES.includes(item));
    const merged = new Set<string>([...COMMON_MEDIA_TYPES, ...storedMediaTypes, ...customValues]);
    return Array.from(merged);
  }, [selectedValues, storedMediaTypes]);

  const onSelect = useCallback(
    (_event: MouseEvent | undefined, selection: string | number | undefined) => {
      if (typeof selection !== 'string') {
        return;
      }

      const nextValues = selectedValues.includes(selection)
        ? selectedValues.filter((item) => item !== selection)
        : [...selectedValues, selection];

      onChange(nextValues.length > 0 ? nextValues.join(', ') : undefined);
      setIsOpen(true);
    },
    [onChange, selectedValues],
  );

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

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsOpen((current) => !current)}
      isExpanded={isOpen}
      isFullWidth
      isDisabled={disabled}
      data-testid="media-type-field-toggle"
    >
      {selectedValues.length > 0 ? selectedValues.join(', ') : 'Select media types'}
    </MenuToggle>
  );

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <Select
        isOpen={isOpen}
        selected={selectedValues}
        onSelect={onSelect}
        onOpenChange={(nextOpen) => setIsOpen(nextOpen)}
        toggle={toggle}
      >
        <SelectList className="media-type-field-list">
          {options.map((option) => (
            <SelectOption key={option} itemId={option} hasCheckbox isSelected={selectedValues.includes(option)}>
              {option}
            </SelectOption>
          ))}
        </SelectList>
        <Divider />
        <div className="media-type-field-custom">
          <TextInput
            aria-label="Custom media type"
            value={customValue}
            onChange={(_event, nextValue) => setCustomValue(nextValue)}
            onKeyDown={onCustomKeyDown}
            placeholder="Add custom media type"
            isDisabled={disabled}
          />
          <Button variant="secondary" onClick={addCustomValue} isDisabled={disabled || customValue.trim() === ''}>
            Add
          </Button>
        </div>
      </Select>
    </FieldWrapper>
  );
};
