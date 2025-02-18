import { FunctionComponent, useContext, useMemo } from 'react';
import { FilteredFieldContext } from '../../../../../../providers';
import { getFieldGroupsV2, getFilteredProperties, isDefined } from '../../../../../../utils';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { AnyOfField } from './AnyOfField';
import { ObjectFieldInner } from './ObjectFieldInner';
import { GroupFields } from './GroupFields';

const SPACE_REGEX = /\s/g;

export const ObjectFieldGrouping: FunctionComponent<FieldProps> = ({ propName }) => {
  const { schema } = useContext(SchemaContext);

  if (!isDefined(schema)) {
    throw new Error(`ObjectFieldGrouping: schema is not defined for ${propName}`);
  }

  const { filteredFieldText } = useContext(FilteredFieldContext);

  const groupedProperties = useMemo(() => {
    const cleanQueryTerm = filteredFieldText.replace(SPACE_REGEX, '').toLowerCase();
    const filteredProperties = getFilteredProperties(schema.properties, cleanQueryTerm);
    return getFieldGroupsV2(filteredProperties);
  }, [filteredFieldText, schema.properties]);

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
