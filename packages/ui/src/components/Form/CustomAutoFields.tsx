import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { ComponentType, createElement, useMemo } from 'react';
import { useForm } from 'uniforms';
import { KaotoSchemaDefinition } from '../../models';
import { Card, CardBody, ExpandableSection, capitalize } from '@patternfly/react-core';
import { getFieldGroups } from '../../utils';
import { CatalogKind } from '../../models';
import './CustomAutoFields.scss';

export type AutoFieldsProps = {
  autoField?: ComponentType<{ name: string }>;
  element?: ComponentType | string;
  fields?: string[];
  omitFields?: string[];
};

export function CustomAutoFields({
  autoField = AutoField,
  element = 'div',
  fields,
  omitFields = [],
  ...props
}: AutoFieldsProps) {
  const { schema } = useForm();
  const rootField = schema.getField('');

  const actualFields = (fields ?? schema.getSubfields()).filter((field) => !omitFields!.includes(field));
  const actualFieldsSchema = actualFields.reduce((acc: { [name: string]: unknown }, name) => {
    acc[name] = schema.getField(name);
    return acc;
  }, {});
  const propertiesArray = useMemo(() => {
    return getFieldGroups(actualFieldsSchema);
  }, [actualFieldsSchema]);

  /** Special handling for oneOf schemas */
  if (Array.isArray((rootField as KaotoSchemaDefinition['schema']).oneOf)) {
    return createElement(element, props, [createElement(autoField!, { key: '', name: '' })]);
  }

  return createElement(
    element,
    props,
    <>
      {propertiesArray.common.map((field) => (
        <AutoField key={field} name={field} />
      ))}

      {Object.entries(propertiesArray.groups).map(([groupName, groupFields]) => (
        <ExpandableSection
          key={`${groupName}-section-toggle`}
          toggleText={capitalize(`${CatalogKind.Processor} ${groupName} properties`)}
          toggleId="expandable-section-toggle"
          contentId="expandable-section-content"
        >
          <Card className="nest-field-card">
            <CardBody className="nest-field-card-body">
              {groupFields.map((field) => (
                <AutoField key={field} name={field} />
              ))}
            </CardBody>
          </Card>
        </ExpandableSection>
      ))}
    </>,
  );
}
