import { Schema } from '../schema';
import { SourceSchemaType } from './source-schema-type';
import { isEnumType } from '../../utils';

export interface ISourceSchema {
  schema: Schema | undefined;
  name: string;
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
      name: 'Camel Route',
      schema: undefined,
      multipleRoute: true,
    },
    [SourceSchemaType.Kamelet]: {
      name: 'Kamelet',
      schema: undefined,
      multipleRoute: false,
    },
    [SourceSchemaType.Pipe]: {
      name: 'Pipe',
      schema: undefined,
      multipleRoute: false,
    },
    [SourceSchemaType.KameletBinding]: {
      name: 'Kamelet Binding',
      schema: undefined,
      multipleRoute: false,
    },
    [SourceSchemaType.Integration]: {
      name: 'Integration',
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

  getAsList(): ISourceSchema[] {
    return Object.entries(sourceSchemaConfig.config).map((obj) => obj[1] as ISourceSchema);
  }
}

export const sourceSchemaConfig = new SourceSchemaConfig();
