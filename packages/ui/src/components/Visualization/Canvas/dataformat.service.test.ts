import * as yamlDslSchema from '@kaoto-next/camel-catalog/camelYamlDsl.json';
import * as dataformatCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-dataformats.json';
import { CatalogKind, ICamelDataformatDefinition, ICamelLanguageDefinition } from '../../../models';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { DataFormatService } from './dataformat.service';

describe('DataFormatService', () => {
  beforeAll(() => {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (yamlDslSchema as any).default;
    delete (dataformatCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Dataformat,
      dataformatCatalog as unknown as Record<string, ICamelDataformatDefinition>,
    );
  });

  describe('getDataFormateMap', () => {
    it('should return DataFormat map', () => {
      const dataFormatMap = DataFormatService.getDataFormatMap();
      expect(dataFormatMap.json.model.title).toEqual('JSon');
      expect(dataFormatMap.yaml.model.name).toEqual('yaml');
      expect(dataFormatMap.custom.model.description).toContain('custom');
      expect(dataFormatMap.custom.properties.ref.displayName).toEqual('Ref');
    });
  });

  describe('getDataFormatSchema', () => {
    it('should return DataFormat schema', () => {
      const dataFormatMap = DataFormatService.getDataFormatMap();
      const jsonSchema = DataFormatService.getDataFormatSchema(dataFormatMap.json);
      expect(jsonSchema.properties.unmarshalType.type).toBe('string');
      const customSchema = DataFormatService.getDataFormatSchema(dataFormatMap.custom);
      expect(customSchema.properties.ref.type).toBe('string');
    });
  });

  describe('parseDataFormatModel', () => {
    let dataFormatMap: Record<string, ICamelLanguageDefinition>;
    beforeAll(() => {
      dataFormatMap = DataFormatService.getDataFormatMap();
    });

    it('should parse #1', () => {
      const { dataFormat: dataFormat, model } = DataFormatService.parseDataFormatModel(dataFormatMap, {
        yaml: { unmarshalType: 'String' },
      });
      expect(dataFormat).toEqual(dataFormatMap.yaml);
      expect(model).toEqual({ unmarshalType: 'String' });
    });

    it('should return json and empty model if model is empty', () => {
      const { dataFormat, model } = DataFormatService.parseDataFormatModel(dataFormatMap, {});
      expect(dataFormat).toEqual(dataFormatMap.json);
      expect(model).toEqual({});
    });

    it('should return simple and empty model if language map and model is empty', () => {
      const { dataFormat, model } = DataFormatService.parseDataFormatModel({}, {});
      expect(dataFormat).toBeUndefined();
      expect(model).toEqual({});
    });
  });

  describe('setDataFormatModel', () => {
    let dataFormatMap: Record<string, ICamelDataformatDefinition>;
    beforeAll(() => {
      dataFormatMap = DataFormatService.getDataFormatMap();
    });

    it('should write dataformat', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = {};
      DataFormatService.setDataFormatModel(dataFormatMap, parentModel, 'yaml', { unmarshalType: 'String' });
      expect(parentModel.yaml.unmarshalType).toEqual('String');
    });

    it('should write dataformat and remove existing', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = { json: { library: 'Gson' } };
      DataFormatService.setDataFormatModel(dataFormatMap, parentModel, 'avro', {
        library: 'Jackson',
      });
      expect(parentModel.json).toBeUndefined();
      expect(parentModel.avro.library).toEqual('Jackson');
    });

    it('should not write if empty', () => {
      const parentModel: any = {};
      DataFormatService.setDataFormatModel(dataFormatMap, parentModel, '', {});
      expect(Object.keys(parentModel).length).toBe(0);
    });
  });
});
