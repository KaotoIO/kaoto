import './EndpointPropertiesField.scss';

import { SettingsAdjust, TableSplit } from '@carbon/icons-react';
import {
  ArrayFieldWrapper,
  FieldProps,
  KeyValueType,
  PropertiesField,
  SchemaContext,
  useFieldValue,
} from '@kaoto/forms';
import { Badge, Button, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

import { MultiValuePropertyEditor } from './MultiValuePropertyEditor';

export const EndpointPropertiesField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const [activeView, setActiveView] = useState<'standard' | 'custom'>('standard');
  const { schema } = useContext(SchemaContext);

  const hasSchemaProperties = useMemo(() => {
    const properties = schema.properties ?? {};
    return Object.keys(properties).length > 0;
  }, [schema]);

  const { value, onChange } = useFieldValue<KeyValueType | undefined>(propName);

  const propsCount = useMemo(() => Object.entries(value ?? {}).length, [value]);

  const onRemove = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <>
      {hasSchemaProperties && (
        <div>
          <ToggleGroup isCompact aria-label="Mode toggle" className="custom-mode-toggle">
            <ToggleGroupItem
              icon={<SettingsAdjust />}
              text="Standard"
              buttonId="standard"
              isSelected={activeView === 'standard'}
              onChange={() => setActiveView('standard')}
              data-testid={`${propName}-standard-toggle`}
            />
            <ToggleGroupItem
              icon={<TableSplit />}
              text="Custom"
              buttonId="custom"
              isSelected={activeView === 'custom'}
              onChange={() => setActiveView('custom')}
              data-testid={`${propName}-custom-toggle`}
            />
          </ToggleGroup>
        </div>
      )}

      <div>
        {hasSchemaProperties && activeView === 'standard' && (
          <MultiValuePropertyEditor propName={propName} required={required} />
        )}

        {(!hasSchemaProperties || activeView === 'custom') && (
          <div className="custom-table-tab">
            <ArrayFieldWrapper
              propName={propName}
              type="object"
              title="Endpoint Properties"
              description="The key-value pairs of the properties to configure this endpoint"
              actions={
                <>
                  <Badge title={`${propsCount} properties`}>{propsCount}</Badge>
                  <Button variant="plain" aria-label="Remove" onClick={onRemove} data-testid={`${propName}__remove`}>
                    <TrashIcon />
                  </Button>
                </>
              }
            >
              <PropertiesField key={propsCount} propName={propName} required={required} />
            </ArrayFieldWrapper>
          </div>
        )}
      </div>
    </>
  );
};
