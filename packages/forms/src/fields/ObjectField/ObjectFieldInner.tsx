import { Stack } from '@carbon/react';
import { FunctionComponent, useContext } from 'react';

import { FieldProps } from '../../models/typings';
import { CanvasFormTabsContext } from '../../providers/canvas-form-tabs.provider';
import { ModelContext } from '../../providers/ModelProvider';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { isDefined, isFieldTabVisible, safeGetValue } from '../../utils';
import { AutoField } from '../AutoField';

interface ObjectFieldInnerProps extends FieldProps {
  requiredProperties: string[];
}

export const ObjectFieldInner: FunctionComponent<ObjectFieldInnerProps> = ({ propName, requiredProperties }) => {
  const { schema } = useContext(SchemaContext);
  const { selectedTab } = useContext(CanvasFormTabsContext);
  const { model } = useContext(ModelContext);

  const entries = Object.entries(schema.properties ?? {}).filter(([_, propertySchema]) => {
    /** Remove empty properties like `csimple: {}` */
    return isDefined(propertySchema) && Object.keys(propertySchema).length > 0;
  });

  /**
   * Avoid rendering an empty <Stack> when no field is visible for the current tab,
   * otherwise the `.kaoto-form:has(*)` CSS rule would keep `NoFieldFound` hidden.
   */
  const visibleEntries = entries.filter(([propertyName, propertySchema]) => {
    const propPath = `${propName}.${propertyName}`.replace('#.', '');
    const value = safeGetValue(model, propPath);
    const required = requiredProperties.includes(propertyName);
    return isFieldTabVisible(propertySchema, value, required, selectedTab);
  });

  if (visibleEntries.length === 0) return null;

  return (
    <Stack gap={5}>
      {entries.map(([propertyName, propertySchema]) => {
        const name = `${propName}.${propertyName}`;
        const required = requiredProperties.includes(propertyName);

        return (
          <SchemaProvider key={name} schema={propertySchema}>
            <AutoField propName={name} required={required} />
          </SchemaProvider>
        );
      })}
    </Stack>
  );
};
