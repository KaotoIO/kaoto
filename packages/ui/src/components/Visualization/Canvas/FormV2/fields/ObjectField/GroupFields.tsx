import { FormFieldGroupExpandable, FormFieldGroupHeader } from '@patternfly/react-core';
import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext } from '../../../../../../providers';
import { isDefined } from '../../../../../../utils';
import { capitalizeString } from '../../../../../../utils/capitalize-string';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { ObjectFieldInner } from './ObjectFieldInner';
import { useFieldValue } from '../../hooks/field-value';
import { KaotoSchemaDefinition } from '../../../../../../models';
import { FieldProps } from '../../typings';

interface GroupFieldsProps extends FieldProps {
  groups: [string, Record<string, KaotoSchemaDefinition['schema']>][];
  requiredProperties: string[];
}

export const GroupFields: FunctionComponent<GroupFieldsProps> = ({ propName, groups, requiredProperties }) => {
  const { selectedTab } = useContext(CanvasFormTabsContext);
  const { value } = useFieldValue<Record<string, unknown>>(propName);

  return (
    <>
      {groups.map(([groupName, groupProperties]) => {
        if (selectedTab === 'Required') {
          const hasRequiredProperty = Object.keys(groupProperties).some((propName) =>
            requiredProperties.includes(propName),
          );
          const hasObjectTypeProperty = Object.keys(groupProperties).some((propName) => {
            if (
              groupProperties[propName].type === 'object' ||
              groupProperties[propName].type === 'array' ||
              '$ref' in groupProperties[propName]
            ) {
              return isDefined(value) && isDefined(value[propName]);
            }
          });
          if (!hasRequiredProperty && !hasObjectTypeProperty) {
            return null;
          }
        } else if (selectedTab === 'Modified') {
          const hasModifiedProperty = Object.keys(groupProperties).some(
            (propName) => isDefined(value) && isDefined(value[propName]),
          );
          if (!hasModifiedProperty) {
            return null;
          }
        }

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
