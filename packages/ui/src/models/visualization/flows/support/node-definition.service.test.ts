import { beerSourceKamelet } from '../../../../stubs/beer-source-kamelet';
import { logModel } from '../../../../stubs/log-model';
import { xjTemplateAction } from '../../../../stubs/xj-template-action.kamelet';
import { ICamelProcessorProperty } from '../../../camel-processors-catalog';
import { NodeDefinitionService } from './node-definition.service';
import * as componentCatalogMap from '@kaoto-next/camel-catalog/camel-catalog-aggregate-components.json';

describe('NodeDefinitionService', () => {
  describe('getSchemaFromCamelCommonProperties', () => {
    it('should return an empty schema if the properties are undefined', () => {
      const schema = NodeDefinitionService.getSchemaFromCamelCommonProperties(undefined);
      expect(schema).toEqual({});
    });

    it('should return an empty schema if the properties are empty', () => {
      const schema = NodeDefinitionService.getSchemaFromCamelCommonProperties({});
      expect(schema).toEqual({ properties: {}, required: [], type: 'object' });
    });

    it('should return a schema with the properties', () => {
      const schema = NodeDefinitionService.getSchemaFromCamelCommonProperties(logModel.properties);

      expect(schema).toMatchSnapshot();
    });

    /* eslint-disable  @typescript-eslint/no-explicit-any */
    it('should return a schema for google-drive', () => {
      const catalog = (componentCatalogMap as any)['google-drive'];
      const schema = NodeDefinitionService.getSchemaFromCamelCommonProperties(catalog.properties);
      expect(schema.properties.scopes.items).toBeDefined();
    });
  });

  it('should return the JSON type for enums', () => {
    const enumProperty: ICamelProcessorProperty = {
      index: 1,
      kind: 'attribute',
      displayName: 'Library',
      required: false,
      type: 'enum',
      javaType: 'org.apache.camel.model.dataformat.AvroLibrary',
      enum: ['ApacheAvro', 'Jackson'],
      deprecated: false,
      autowired: false,
      secret: false,
      defaultValue: 'ApacheAvro',
      description: 'Which Avro library to use.',
    };

    const jsonType = NodeDefinitionService.getSchemaFromCamelCommonProperties({ enumProperty });
    expect(jsonType.properties.enumProperty.type).toEqual(undefined);
  });

  it('should return the JSON type for a duration field', () => {
    const durationProperty: ICamelProcessorProperty = {
      index: 1,
      kind: 'attribute',
      displayName: 'Batch Timeout',
      required: false,
      type: 'duration',
      javaType: 'java.lang.String',
      deprecated: false,
      autowired: false,
      secret: false,
      defaultValue: '1000',
      description: 'Sets the timeout for collecting elements to be re-ordered. The default timeout is 1000 msec.',
    };

    const jsonType = NodeDefinitionService.getSchemaFromCamelCommonProperties({ durationProperty });
    expect(jsonType.properties.durationProperty.type).toEqual('string');
  });

  it('should return the JSON type for a duration field', () => {
    const objectProperty: ICamelProcessorProperty = {
      index: 0,
      kind: 'expression',
      displayName: 'Correlation Expression',
      required: true,
      type: 'object',
      javaType: 'org.apache.camel.model.ExpressionSubElementDefinition',
      oneOf: ['python', 'xpath'],
      deprecated: false,
      autowired: false,
      secret: false,
      description: 'The expression used to calculate the correlation key to use for aggregation.',
    };

    const jsonType = NodeDefinitionService.getSchemaFromCamelCommonProperties({ objectProperty });
    expect(jsonType.properties.objectProperty.type).toEqual('object');
  });

  describe('getSchemaFromKameletDefinition', () => {
    it('should return an empty schema if the definition is undefined', () => {
      const schema = NodeDefinitionService.getSchemaFromKameletDefinition(undefined);
      expect(schema).toEqual({ properties: {}, required: [], type: 'object' });
    });

    it('should return a schema with the properties', () => {
      const schema = NodeDefinitionService.getSchemaFromKameletDefinition(beerSourceKamelet);

      expect(schema).toMatchSnapshot();
    });

    it('should mark the required properties in the schema', () => {
      const schema = NodeDefinitionService.getSchemaFromKameletDefinition(xjTemplateAction);

      expect(schema).toMatchSnapshot();
    });
  });
});
