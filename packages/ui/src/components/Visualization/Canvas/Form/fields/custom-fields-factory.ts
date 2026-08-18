import { CustomFieldsFactory, EnumField, TextAreaField } from '@kaoto/forms';

import { CustomMediaTypes } from './ArrayBadgesField/CustomMediaTypes';
import { DataSourceBeanField, PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { RuntimeCatalogNameField, TestingCatalogNameField } from './CatalogSelectorField/CatalogSelectorField';
import { DirectEndpointNameField } from './DirectEndpointNameField';
import { EndpointField } from './EndpointField/EndpointField';
import { EndpointListField } from './EndpointField/EndpointListField';
import { EndpointPropertiesField } from './EndpointPropertiesField/EndpointPropertiesField';
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
  return (
    schema.type === 'string' && (schema.format?.startsWith('bean:') === true || schema.title === 'Schema Resolver')
  );
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

const isEndpointField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return (
    schema.type === 'string' &&
    (schema.title === 'Endpoint' ||
      schema.title === 'Browser' ||
      schema.title === 'Client' ||
      schema.title === 'Server') &&
    (schema.description || '').includes('references an endpoint')
  );
};

const isEndpointListField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return (
    schema.type === 'array' &&
    schema.title === 'Endpoints' &&
    (schema.description || '').includes('endpoints for this test')
  );
};

const isTextAreaField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return (
    schema.type === 'string' &&
    (schema.title === 'Data' || schema.title === 'Value' || schema.title === 'Source') &&
    (schema.description || '').includes('inline data')
  );
};

const isIntegrationRuntimeSelectorField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'string' && schema.title === 'Integrations runtime version';
};

const isTestingRuntimeSelectorField = (schema: Parameters<CustomFieldsFactory>[0]): boolean => {
  return schema.type === 'string' && schema.title === 'Testing runtime version';
};

/** Ordered list of [predicate, field component] pairs evaluated by customFieldsFactoryfactory. */
const CUSTOM_FIELD_ENTRIES: [
  (schema: Parameters<CustomFieldsFactory>[0]) => boolean,
  ReturnType<CustomFieldsFactory>,
][] = [
  /* Workaround for https://github.com/KaotoIO/kaoto/issues/2565 since the SNMP component has the wrong type */
  [(schema) => Array.isArray(schema.enum) && schema.enum.length > 0, EnumField],
  [isIntegrationRuntimeSelectorField, RuntimeCatalogNameField],
  [isTestingRuntimeSelectorField, TestingCatalogNameField],
  [isDirectEndpointName, DirectEndpointNameField],
  [isBeanField, PrefixedBeanField],
  [isRefField, UnprefixedBeanField],
  [isDataSourceField, DataSourceBeanField],
  [isMediaTypeField, MediaTypeField],
  [isExpressionField, ExpressionField],
  [isCustomMediaTypesField, CustomMediaTypes],
  [isUriField, UriField],
  [isEndpointPropertiesField, EndpointPropertiesField],
  [isEndpointField, EndpointField],
  [isEndpointListField, EndpointListField],
  [isTextAreaField, TextAreaField],
];

export const customFieldsFactoryfactory: CustomFieldsFactory = (schema) => {
  return CUSTOM_FIELD_ENTRIES.find(([predicate]) => predicate(schema))?.[1];
};
