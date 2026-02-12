import { CustomFieldsFactory, EnumField } from '@kaoto/forms';

import { CustomMediaTypes } from './ArrayBadgesField/CustomMediaTypes';
import { DataSourceBeanField, PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { DirectEndpointNameField } from './DirectEndpointNameField';
import { ExpressionField } from './ExpressionField/ExpressionField';
import { MediaTypeField } from './MediaTypeField/MediaTypeField';

export const customFieldsFactoryfactory: CustomFieldsFactory = (schema) => {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    /* Workaround for https://github.com/KaotoIO/kaoto/issues/2565 since the SNMP component has the wrong type */
    return EnumField;
  } else if (
    schema.type === 'string' &&
    schema.title === 'Name' &&
    schema.description?.toLowerCase().includes('direct endpoint')
  ) {
    return DirectEndpointNameField;
  } else if (schema.type === 'string' && schema.format?.startsWith('bean:')) {
    return PrefixedBeanField;
  } else if (schema.type === 'string' && schema.title === 'Ref') {
    return UnprefixedBeanField;
  } else if (schema.type === 'string' && schema.title?.includes('Data Source')) {
    return DataSourceBeanField;
  } else if (schema.type === 'string' && (schema.title === 'Consumes' || schema.title === 'Produces')) {
    return MediaTypeField;
  } else if (schema.format === 'expression' || schema.format === 'expressionProperty') {
    return ExpressionField;
  } else if (schema.type === 'array' && schema.title === 'Custom media types') {
    return CustomMediaTypes;
  }

  return undefined;
};
