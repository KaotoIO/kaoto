import catalogLibraryJson from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { EnumField, TextAreaField } from '@kaoto/forms';

import { ICamelComponentDefinition } from '../../../../../models/camel/camel-components-catalog';
import { CatalogKind } from '../../../../../models/catalog-kind';
import { KaotoSchemaDefinition } from '../../../../../models/kaoto-schema';
import { CamelCatalogService } from '../../../../../models/visualization/flows/camel-catalog.service';
import { getFirstCatalogMap } from '../../../../../stubs/test-load-catalog';
import { CustomMediaTypes } from './ArrayBadgesField/CustomMediaTypes';
import { DataSourceBeanField, PrefixedBeanField, UnprefixedBeanField } from './BeanField/BeanField';
import { RuntimeCatalogNameField, TestingCatalogNameField } from './CatalogSelectorField/CatalogSelectorField';
import { customFieldsFactoryfactory } from './custom-fields-factory';
import { DirectEndpointNameField } from './DirectEndpointNameField';
import { EndpointField } from './EndpointField/EndpointField';
import { EndpointListField } from './EndpointField/EndpointListField';
import { EndpointPropertiesField } from './EndpointPropertiesField/EndpointPropertiesField';
import { ExpressionField } from './ExpressionField/ExpressionField';
import { MediaTypeField } from './MediaTypeField/MediaTypeField';
import { UriField } from './UriField/UriField';

const catalogLibrary = catalogLibraryJson as CatalogLibrary;

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

  it('returns PrefixedBeanField for Schema Resolver fields', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'string', title: 'Schema Resolver' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(PrefixedBeanField);
  });

  it('does not return PrefixedBeanField for non-string Schema Resolver schemas', () => {
    const schema: KaotoSchemaDefinition['schema'] = { type: 'object', title: 'Schema Resolver' };
    const result = customFieldsFactoryfactory(schema);
    expect(result).not.toBe(PrefixedBeanField);
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

  it.each([
    [{ type: 'number', title: 'Ref' }, 'non-string type with title "Ref"'],
    [{ type: 'string', title: 'ref' }, 'case-sensitive title mismatch for Ref'],
    [{ type: 'string', title: 'uri' }, 'case-sensitive title mismatch for Uri'],
  ] as [KaotoSchemaDefinition['schema'], string][])('returns undefined for %s', (schema) => {
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

  it.each(['Endpoint', 'Client', 'Server'])('returns EndpointField for string type with title "%s"', (title) => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title,
      description: 'Uses an endpoint URI or references an endpoint name.',
    };
    const result = customFieldsFactoryfactory(schema);
    expect(result).toBe(EndpointField);
  });

  it.each(['Data', 'Value', 'Source'])('returns TextAreaField for string type with title "%s"', (title) => {
    const schema: KaotoSchemaDefinition['schema'] = {
      type: 'string',
      title,
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

  it('returns RuntimeCatalogNameField for runtime field', () => {
    const result = customFieldsFactoryfactory({
      type: 'string',
      title: 'Integrations runtime version',
    });
    expect(result).toBe(RuntimeCatalogNameField);
  });

  it('returns TestingCatalogNameField for runtime field', () => {
    const result = customFieldsFactoryfactory({
      type: 'string',
      title: 'Testing runtime version',
    });
    expect(result).toBe(TestingCatalogNameField);
  });
});
