import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { EnumField, TextAreaField } from '@kaoto/forms';

import { ICamelComponentDefinition } from '../../../../../models/camel/camel-components-catalog';
import { CatalogKind } from '../../../../../models/catalog-kind';
import { KaotoSchemaDefinition } from '../../../../../models/kaoto-schema';
import { CamelCatalogService } from '../../../../../models/visualization/flows/camel-catalog.service';
import { getFirstCatalogMap } from '../../../../../stubs/test-load-catalog';
import { CustomMediaTypes } from './ArrayBadgesField/CustomMediaTypes';
import { DataSourceBeanField, PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { CatalogSelectorField } from './CatalogSelectorField/CatalogSelectorField';
import { customFieldsFactoryfactory } from './custom-fields-factory';
import { DirectEndpointNameField } from './DirectEndpointNameField';
import { EndpointField } from './EndpointField/EndpointField';
import { EndpointListField } from './EndpointField/EndpointListField';
import { EndpointPropertiesField } from './EndpointPropertiesField/EndpointPropertiesField';
import { ExpressionField } from './ExpressionField/ExpressionField';
import { MediaTypeField } from './MediaTypeField/MediaTypeField';
import { UriField } from './UriField/UriField';

describe('customFieldsFactoryfactory', () => {
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;

  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary);
    componentCatalogMap = catalogsMap.componentCatalogMap;

    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
  });

  afterEach(() => {
    CamelCatalogService.clearCatalogs();
  });

  it('returns EnumField for enums regardless of the schema type', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'object', enum: ['option 1', 'option 2', 'option 3'] };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(EnumField);
  });

  it('returns PrefixedBeanField for string type with format starting with "bean:"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'bean:myBean' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(PrefixedBeanField);
  });

  it('returns UnprefixedBeanField for string type with title "Ref"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'Ref' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(UnprefixedBeanField);
  });

  it('returns DirectEndpointNameField for direct component name schema from camel catalog', () => {
    const directNameSchema = componentCatalogMap.direct.propertiesSchema?.properties?.name;

    expect(directNameSchema).toBeDefined();

    const result = customFieldsFactoryfactory(directNameSchema ?? {});
    expect(result).toBe(DirectEndpointNameField);
  });

  it('returns DirectEndpointNameField for a matching direct endpoint schema', () => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title: 'Name',
      description: 'Sets the direct endpoint name',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(DirectEndpointNameField);
  });

  it('returns ExpressionField for format "expression"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'expression' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(ExpressionField);
  });

  it('returns ExpressionField for format "expressionProperty"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'expressionProperty' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(ExpressionField);
  });

  it('returns MediaTypeField for title "Consumes"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'Consumes' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(MediaTypeField);
  });

  it('returns MediaTypeField for title "Produces"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'Produces' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(MediaTypeField);
  });

  it('returns undefined for string type with unrelated format', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'text' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined for string type with title "Ref" but non-string type', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'number', title: 'Ref' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined for string type with case-sensitive title mismatch', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'ref' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('prioritizes bean format over Ref title when both are present', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', format: 'bean:myBean', title: 'Ref' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(PrefixedBeanField);
  });

  it('returns undefined for non-string type', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'number', format: 'bean:myBean' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined if format is missing', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns undefined if schema is empty', () => {
    const result = customFieldsFactoryfactory({});
    expect(result).toBeUndefined();
  });

  it('returns UriField for string type with title "Uri"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'Uri' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(UriField);
  });

  it('returns undefined for string type with case-sensitive title mismatch for Uri', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'uri' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBeUndefined();
  });

  it('returns DataSourceBeanField for string type with title containing "Data Source"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'My Data Source Bean' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(DataSourceBeanField);
  });

  it('returns CustomMediaTypes for array type with title "Custom media types"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'array', title: 'Custom media types' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(CustomMediaTypes);
  });

  it('returns EndpointPropertiesField for object type with title "Endpoint Properties"', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'object', title: 'Endpoint Properties' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(EndpointPropertiesField);
  });

  it('returns EndpointField for string type with title "Endpoint" and matching description', () => {
    // used for instance in the "send" or "receive" test action "endpoint" property
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title: 'Endpoint',
      description: 'Uses an endpoint URI or references an endpoint name.',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(EndpointField);
  });

  it('returns EndpointField for string type with title "Client" and matching description', () => {
    // used for instance in the "http-sendRequest" or "http-receiveResponse" test action "client" property
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title: 'Client',
      description: 'Uses an endpoint URI or references an endpoint name.',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(EndpointField);
  });

  it('returns EndpointField for string type with title "Server" and matching description', () => {
    // used for instance in the "http-receiveRequest" or "http-sendResponse" test action "server" property
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title: 'Server',
      description: 'Uses an endpoint URI or references an endpoint name.',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(EndpointField);
  });

  it('returns TextAreaField for string type with title "Data" and matching description', () => {
    // used for instance in the "send" or "receive" test action "message" property
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title: 'Data',
      description: 'Message body as inline data.',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(TextAreaField);
  });

  it('returns TextAreaField for string type with title "Value" and matching description', () => {
    // used for instance in the "send" or "receive" test action within the "script" property
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title: 'Value',
      description: 'Message body as inline data.',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(TextAreaField);
  });

  it('returns TextAreaField for string type with title "Source" and matching description', () => {
    // used for instance in the "camel-jbang-run" test action within the "integration" property
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title: 'Source',
      description: 'Message body as inline data.',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(TextAreaField);
  });

  it('returns EndpointListField for array type with title "Endpoints" and matching description', () => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'array',
      title: 'Endpoints',
      description: 'List of endpoints for this test.',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(EndpointListField);
  });

  it('returns CatalogSelectorField for catalog titles', () => {
    const testCases = [
      { type: 'object', title: 'Camel Catalog' },
      { type: 'object', title: 'Test Catalog' },
    ];

    testCases.forEach((schema) => {
      const result = customFieldsFactoryfactory(schema as KaotoSchemaDefinition['schema']);
      expect(result).toBe(CatalogSelectorField);
    });
  });
});
