import { Accordion, AccordionItem } from '@carbon/react';
import { JSONSchema4 } from 'json-schema';
import { FunctionComponent, useContext } from 'react';
import { useFieldValue } from '../../hooks/field-value';
import { FieldProps } from '../../models/typings';
import { CanvasFormTabsContext } from '../../providers/canvas-form-tabs.provider';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { isDefined } from '../../utils';
import { capitalizeString } from '../../utils/capitalize-string';
import { ObjectFieldInner } from './ObjectFieldInner';
import './GroupFields.scss';
interface GroupFieldsProps extends FieldProps {
  groups: [string, Record<string, JSONSchema4>][];
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
          <Accordion key={`${name}-section-toggle`} className="kaoto-form__expandable-group">
            <AccordionItem title={name} data-testid={`${propName}-${name}`}>
              <SchemaProvider schema={{ properties: groupProperties }}>
                <ObjectFieldInner propName={propName} requiredProperties={requiredProperties} />
              </SchemaProvider>
            </AccordionItem>
          </Accordion>
        );
      })}
    </>
  );
};
