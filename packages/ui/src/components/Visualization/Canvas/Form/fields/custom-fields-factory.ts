import { CustomFieldsFactory, EnumField } from '@kaoto/forms';

import { DataSourceBeanField, PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { EndpointField } from './EndpointField/EndpointField';
import { EndpointsField } from './EndpointField/EndpointsField';
import { ExpressionField } from './ExpressionField/ExpressionField';
import { MessageBodyField } from './MessageBody/MessageBodyField';

export const customFieldsFactoryfactory: CustomFieldsFactory = (schema) => {
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    /* Workaround for https://github.com/KaotoIO/kaoto/issues/2565 since the SNMP component has the wrong type */
    return EnumField;
  } else if (schema.type === 'string' && schema.format?.startsWith('bean:')) {
    return PrefixedBeanField;
  } else if (schema.type === 'string' && schema.title === 'Ref') {
    return UnprefixedBeanField;
  } else if (schema.type === 'string' && schema.title?.includes('Data Source')) {
    return DataSourceBeanField;
  } else if (schema.format === 'expression' || schema.format === 'expressionProperty') {
    return ExpressionField;
  } else if (
    schema.type === 'string' &&
    (schema.title === 'Endpoint' || schema.title === 'Client' || schema.title === 'Server')
  ) {
    return EndpointField;
  } else if (schema.type === 'array' && schema.title === 'Endpoints') {
    return EndpointsField;
  } else if (schema.type === 'string' && (schema.title === 'Data' || schema.title === 'Source')) {
    return MessageBodyField;
  }

  return undefined;
};
