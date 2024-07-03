import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { ComponentType, createElement, useContext } from 'react';
import { useForm } from 'uniforms';
import { KaotoSchemaDefinition } from '../../models';
import { Card, CardBody } from '@patternfly/react-core';
import { getFieldGroups } from '../../utils';
import { CatalogKind } from '../../models';
import { FilteredFieldContext, FormTypeContext } from '../../providers';
import './CustomAutoFields.scss';
import { CustomExpandableSection } from './customField/CustomExpandableSection';
import { getNonDefaultSchema } from '../../utils/get-non-default-schema';

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
  const { schema, model } = useForm();
  const rootField = schema.getField('');
  const { filteredFieldText, isGroupExpanded } = useContext(FilteredFieldContext);
  const { loadNonDefaultFieldsOnly } = useContext(FormTypeContext);

  /** Special handling for oneOf schemas */
  if (Array.isArray((rootField as KaotoSchemaDefinition['schema']).oneOf)) {
    return createElement(element, props, [createElement(autoField!, { key: '', name: '' })]);
  }

  let fieldsToProcess = schema.getSubfields();

  const fieldsToProcessSchema = fieldsToProcess.reduce((acc: { [name: string]: unknown }, name) => {
    acc[name] = schema.getField(name);
    return acc;
  }, {});
  if (loadNonDefaultFieldsOnly) {
    const nonDefaultsFields = getNonDefaultSchema(fieldsToProcessSchema, model as Record<string, unknown>);
    fieldsToProcess = nonDefaultsFields;
  }

  const actualFields = (fields ?? fieldsToProcess).filter(
    (field) =>
      !omitFields!.includes(field) &&
      (field === 'parameters' || field.toLowerCase().includes(filteredFieldText.toLowerCase())),
  );
  const actualFieldsSchema = actualFields.reduce((acc: { [name: string]: unknown }, name) => {
    acc[name] = schema.getField(name);
    return acc;
  }, {});
  const propertiesArray = getFieldGroups(actualFieldsSchema);

  return createElement(
    element,
    props,
    <>
      {propertiesArray.common.map((field) => (
        <AutoField key={field} name={field} />
      ))}

      {Object.entries(propertiesArray.groups).map(([groupName, groupFields]) => (
        <CustomExpandableSection
          key={`${CatalogKind.Processor}-${groupName}-section-toggle`}
          groupName={CatalogKind.Processor + ' ' + groupName}
          isGroupExpanded={isGroupExpanded}
        >
          <Card className="nest-field-card">
            <CardBody className="nest-field-card-body">
              {groupFields.map((field) => (
                <AutoField key={field} name={field} />
              ))}
            </CardBody>
          </Card>
        </CustomExpandableSection>
      ))}
    </>,
  );
}
