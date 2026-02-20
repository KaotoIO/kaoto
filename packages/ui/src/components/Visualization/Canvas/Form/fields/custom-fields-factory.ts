import { CustomFieldsFactory, EnumField } from '@kaoto/forms';

import { CustomMediaTypes } from './ArrayBadgesField/CustomMediaTypes';
import { DataSourceBeanField, PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { DirectEndpointNameField } from './DirectEndpointNameField';
import { ExpressionField } from './ExpressionField/ExpressionField';
import { MediaTypeField } from './MediaTypeField/MediaTypeField';
import { UriField } from './UriField/UriField';

const isDirectEndpointName = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return (
    schema.type === 'string' &&
    schema.title === 'Name' &&
    schema.description?.toLowerCase().includes('direct endpoint') === true
  );
};

const isMediaTypeField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'string' && (schema.title === 'Consumes' || schema.title === 'Produces');
};

export const customFieldsFactoryfactory: CustomFieldsFactory = (schema) => {
  /* Workaround for https://github.com/KaotoIO/kaoto/issues/2565 since the SNMP component has the wrong type */
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return EnumField;
  }

  if (isDirectEndpointName(schema)) {
    return DirectEndpointNameField;
  }

  if (schema.type === 'string' && schema.format?.startsWith('bean:')) {
    return PrefixedBeanField;
  }

  if (schema.type === 'string' && schema.title === 'Ref') {
    return UnprefixedBeanField;
  }

  if (schema.type === 'string' && schema.title?.includes('Data Source')) {
    return DataSourceBeanField;
  }

  if (isMediaTypeField(schema)) {
    return MediaTypeField;
  }

  if (schema.format === 'expression' || schema.format === 'expressionProperty') {
    return ExpressionField;
  }

  if (schema.type === 'array' && schema.title === 'Custom media types') {
    return CustomMediaTypes;
  }

  if (schema.type === 'string' && schema.title === 'Uri') {
    return UriField;
  }

  return undefined;
};
