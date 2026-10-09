import './EndpointPropertiesField.scss';

import { SettingsAdjust, TableSplit, TrashCan } from '@carbon/icons-react';
import { ContentSwitcher, IconButton, Switch, Tag } from '@carbon/react';
import {
  ArrayFieldWrapper,
  FieldProps,
  KeyValueType,
  PropertiesField,
  SchemaContext,
  useFieldValue,
} from '@kaoto/forms';
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

  const activeIndex = activeView === 'standard' ? 0 : 1;

  return (
    <>
      {hasSchemaProperties && (
        <div>
          <ContentSwitcher
            size="sm"
            selectedIndex={activeIndex}
            onChange={({ name }: { name?: string | number }) => {
              if (name === 'standard' || name === 'custom') {
                setActiveView(name);
              }
            }}
            className="custom-mode-toggle"
            aria-label="Mode toggle"
          >
            <Switch name="standard" text="Standard" data-testid={`${propName}-standard-toggle`}>
              <SettingsAdjust />
            </Switch>
            <Switch name="custom" text="Custom" data-testid={`${propName}-custom-toggle`}>
              <TableSplit />
            </Switch>
          </ContentSwitcher>
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
                  <span title={`${propsCount} properties`} data-testid={`${propName}__badge`}>
                    <Tag>{propsCount}</Tag>
                  </span>
                  <IconButton
                    kind="ghost"
                    size="sm"
                    label="Remove"
                    onClick={onRemove}
                    data-testid={`${propName}__remove`}
                  >
                    <TrashCan />
                  </IconButton>
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
