import { FormFieldGroupExpandable, FormFieldGroupHeader } from '@patternfly/react-core';
import { FunctionComponent, useContext, useMemo } from 'react';
import { FilteredFieldContext } from '../../../../../../providers';
import { getFieldGroupsV2, getFilteredProperties, isDefined } from '../../../../../../utils';
import { capitalizeString } from '../../../../../../utils/capitalize-string';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FieldProps } from '../../typings';
import { AnyOfField } from './AnyOfField';
import { ObjectFieldInner } from './ObjectFieldInner';

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
      {groupedProperties.groups.map(([groupName, groupProperties]) => {
        const name = capitalizeString(groupName);

        return (
          <FormFieldGroupExpandable
            key={`${name}-section-toggle`}
            toggleAriaLabel={`Toggle ${name} group`}
            header={<FormFieldGroupHeader titleText={{ text: name, id: `${propName}-${name}` }} />}
          >
            <SchemaProvider schema={{ properties: groupProperties }}>
              <ObjectFieldInner propName={propName} requiredProperties={requiredProperties} />
            </SchemaProvider>
          </FormFieldGroupExpandable>
        );
      })}
    </>
  );
};
