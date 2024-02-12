import { KaotoSchemaDefinition } from '../kaoto-schema';
import { SourceSchemaType } from './source-schema-type';
import { isEnumType } from '../../utils';

export interface ISourceSchema {
  schema: KaotoSchemaDefinition | undefined;
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

  setSchema(name: string, schema: KaotoSchemaDefinition) {
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
