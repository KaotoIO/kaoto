import { FunctionComponent, useContext, useMemo } from 'react';
import { FilteredFieldContext } from '../../providers/filtered-field.provider';
import { getFieldGroups, safeGetValue } from '../../utils';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../models/typings';
import { AnyOfField } from './AnyOfField';
import { GroupFields } from './GroupFields';
import { ObjectFieldInner } from './ObjectFieldInner';
import { ModelContext } from '../../providers/ModelProvider';
import { SchemaPropertyFilter } from '../../utils/SchemaPropertyFilter';

const SPACE_REGEX = /\s/g;

export const ObjectFieldGrouping: FunctionComponent<FieldProps> = ({ propName }) => {
  const { schema } = useContext(SchemaContext);
  const { filteredFieldText } = useContext(FilteredFieldContext);
  const { model } = useContext(ModelContext);

  const filteredProperties = useMemo(() => {
    const cleanQueryTerm = filteredFieldText.replace(SPACE_REGEX, '').toLowerCase();
    const modelSlice = safeGetValue(model, propName.replace('#.', '')) as Record<string, unknown> | undefined;
    return SchemaPropertyFilter.filter(schema.properties, cleanQueryTerm, undefined, modelSlice);
  }, [filteredFieldText, schema.properties, model, propName]);

  const groupedProperties = useMemo(() => getFieldGroups(filteredProperties), [filteredProperties]);

  const requiredProperties = Array.isArray(schema.required) ? schema.required : [];

  return (
    <>
      {/* Common properties */}
      <SchemaProvider schema={{ properties: groupedProperties.common }}>
        <ObjectFieldInner propName={propName} requiredProperties={requiredProperties} />
      </SchemaProvider>

      {/* AnyOf field */}
      {Array.isArray(schema.anyOf) && <AnyOfField propName={propName} anyOf={schema.anyOf} />}

      {/* Grouped properties */}
      <GroupFields propName={propName} groups={groupedProperties.groups} requiredProperties={requiredProperties} />
    </>
  );
};
