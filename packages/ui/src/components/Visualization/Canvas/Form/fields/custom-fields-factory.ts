import { CustomFieldsFactory, EnumField } from '@kaoto/forms';

import { CustomMediaTypes } from './ArrayBadgesField/CustomMediaTypes';
import { DataSourceBeanField, PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { CustomTableToggle } from './CustomTableToggle/CustomTableToggle';
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

const isBeanField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'string' && schema.format?.startsWith('bean:') === true;
};

const isRefField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'string' && schema.title === 'Ref';
};

const isDataSourceField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'string' && schema.title?.includes('Data Source') === true;
};

const isExpressionField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.format === 'expression' || schema.format === 'expressionProperty';
};

const isCustomMediaTypesField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'array' && schema.title === 'Custom media types';
};

const isUriField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'string' && schema.title === 'Uri';
};

const isEndpointPropertiesField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'object' && schema.title === 'Endpoint Properties';
};

export const customFieldsFactoryfactory: CustomFieldsFactory = (schema) => {
  /* Workaround for https://github.com/KaotoIO/kaoto/issues/2565 since the SNMP component has the wrong type */
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return EnumField;
  }

  if (isDirectEndpointName(schema)) {
    return DirectEndpointNameField;
  }

  if (isBeanField(schema)) {
    return PrefixedBeanField;
  }

  if (isRefField(schema)) {
    return UnprefixedBeanField;
  }

  if (isDataSourceField(schema)) {
    return DataSourceBeanField;
  }

  if (isMediaTypeField(schema)) {
    return MediaTypeField;
  }

  if (isExpressionField(schema)) {
    return ExpressionField;
  }

  if (isCustomMediaTypesField(schema)) {
    return CustomMediaTypes;
  }

  if (isUriField(schema)) {
    return UriField;
  }

  if (isEndpointPropertiesField(schema)) {
    return CustomTableToggle;
  }

  return undefined;
};
