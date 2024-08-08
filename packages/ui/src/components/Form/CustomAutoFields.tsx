import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { ComponentType, createElement, useContext } from 'react';
import { useForm } from 'uniforms';
import { KaotoSchemaDefinition } from '../../models';
import { Card, CardBody } from '@patternfly/react-core';
import { getFieldGroups } from '../../utils';
import { CatalogKind } from '../../models';
import { FilteredFieldContext } from '../../providers';
import './CustomAutoFields.scss';
import { CustomExpandableSection } from './customField/CustomExpandableSection';
import { NoFieldFound } from './NoFieldFound';

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
  const { filteredFieldText, isGroupExpanded } = useContext(FilteredFieldContext);

  /** Special handling for oneOf schemas */
  if (Array.isArray((rootField as KaotoSchemaDefinition['schema']).oneOf)) {
    return createElement(element, props, [createElement(autoField!, { key: '', name: '' })]);
  }

  const cleanQueryTerm = filteredFieldText.replace(/\s/g, '').toLowerCase();
  const actualFields = (fields ?? schema.getSubfields()).filter(
    (field) => !omitFields!.includes(field) && (field === 'parameters' || field.toLowerCase().includes(cleanQueryTerm)),
  );
  const actualFieldsSchema = actualFields.reduce((acc: { [name: string]: unknown }, name) => {
    acc[name] = schema.getField(name);
    return acc;
  }, {});
  const propertiesArray = getFieldGroups(actualFieldsSchema);

  if (propertiesArray.common.length === 0 && Object.keys(propertiesArray.groups).length === 0) {
    return <NoFieldFound />;
  }

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
