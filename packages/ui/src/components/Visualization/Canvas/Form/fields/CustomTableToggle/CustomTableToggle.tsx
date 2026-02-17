import './CustomTableToggle.scss';

import { SettingsAdjust, TableSplit } from '@carbon/icons-react';
import { ArrayFieldWrapper, FieldProps, ObjectField, PropertiesField, SchemaContext } from '@kaoto/forms';
import { ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo, useState } from 'react';

export const CustomTableToggle: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const [activeView, setActiveView] = useState<'standard' | 'custom'>('standard');
  const { schema } = useContext(SchemaContext);

  const switchView = useCallback((view: 'standard' | 'custom') => {
    setActiveView(view);
  }, []);

  const hasSchemaProperties = useMemo(() => {
    const properties = schema.properties || {};
    return Object.keys(properties).length > 0;
  }, [schema]);

  return hasSchemaProperties ? (
    <>
      <div>
        <ToggleGroup isCompact aria-label="Mode toggle" className="custom-mode-toggle">
          <ToggleGroupItem
            icon={<SettingsAdjust />}
            text="Standard"
            buttonId="standard"
            isSelected={activeView === 'standard'}
            onChange={() => switchView('standard')}
            data-testid={`${propName}-standard-toggle`}
          />
          <ToggleGroupItem
            icon={<TableSplit />}
            text="Custom"
            buttonId="custom"
            isSelected={activeView === 'custom'}
            onChange={() => switchView('custom')}
            data-testid={`${propName}-custom-toggle`}
          />
        </ToggleGroup>
      </div>
      <div>
        {activeView === 'standard' && <ObjectField propName={propName} required={required} />}
        {activeView === 'custom' && (
          <ArrayFieldWrapper
            propName={propName}
            type="object"
            title="Custom properties table"
            description="Add new custom properties"
          >
            <PropertiesField propName={propName} required={required} />
          </ArrayFieldWrapper>
        )}
      </div>
    </>
  ) : (
    <PropertiesField propName={propName} required={required} />
  );
};
