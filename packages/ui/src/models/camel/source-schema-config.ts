import { Schema } from '../schema';
import { SourceSchemaType } from './source-schema-type';
import { isEnumType } from '../../utils';

interface ISourceSchema {
  schema: Schema | undefined;
  multipleRoute: boolean;
}

interface IEntitySchemaConfig {
  [SourceSchemaType.Route]: ISourceSchema;
  [SourceSchemaType.Kamelet]: ISourceSchema;
  [SourceSchemaType.Pipe]: ISourceSchema;
  [SourceSchemaType.KameletBinding]: ISourceSchema;
  [SourceSchemaType.Integration]: ISourceSchema;
}

class SourceSchemaConfig {
  config: IEntitySchemaConfig = {
    [SourceSchemaType.Route]: {
      schema: undefined,
      multipleRoute: true,
    },
    [SourceSchemaType.Kamelet]: {
      schema: undefined,
      multipleRoute: false,
    },
    [SourceSchemaType.Pipe]: {
      schema: undefined,
      multipleRoute: false,
    },
    [SourceSchemaType.KameletBinding]: {
      schema: undefined,
      multipleRoute: false,
    },
    [SourceSchemaType.Integration]: {
      schema: undefined,
      multipleRoute: true,
    },
  };

  setSchema(name: string, schema: Schema) {
    if (name === 'camelYamlDsl') {
      this.config[SourceSchemaType.Route].schema = schema;
    }
    if (isEnumType(name, SourceSchemaType)) {
      const type: SourceSchemaType = SourceSchemaType[name];
      this.config[type].schema = schema;
    }
  }
}

export const sourceSchemaConfig = new SourceSchemaConfig();
