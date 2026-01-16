import { isEnumType } from '../../utils';
import { KaotoSchemaDefinition } from '../kaoto-schema';
import { SourceSchemaType } from './source-schema-type';

export interface ISourceSchema {
  schema: KaotoSchemaDefinition | undefined;
  name: string;
  multipleRoute: boolean;
  description?: string;
}

interface IEntitySchemaConfig {
  [SourceSchemaType.Route]: ISourceSchema;
  [SourceSchemaType.Kamelet]: ISourceSchema;
  [SourceSchemaType.Test]: ISourceSchema;
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
      description:
        'Defines an executable integration flow by declaring a source (starter) and followed by a sequence of actions (or steps). Actions can include data manipulations, EIPs (integration patterns) and internal or external calls.',
    },
    [SourceSchemaType.Kamelet]: {
      name: 'Kamelet',
      schema: undefined,
      multipleRoute: false,
      description:
        'Defines a reusable Camel route as a building block. Kamelets can not be executed on their own, they are used as sources, actions or sinks in Camel Routes or Pipes.',
    },
    [SourceSchemaType.Test]: {
      name: 'Test',
      schema: undefined,
      multipleRoute: false,
      description: 'Defines a Citrus test case to verify Camel Routes or Pipes.',
    },
    [SourceSchemaType.Pipe]: {
      name: 'Pipe',
      schema: undefined,
      multipleRoute: false,
      description:
        'Defines a sequence of concatenated Kamelets to form start to finish integration flows. Pipes are a more abstract level of defining integration flows, by chosing and configuring Kamelets.',
    },
    [SourceSchemaType.KameletBinding]: {
      name: 'Kamelet Binding',
      schema: undefined,
      multipleRoute: false,
      description:
        'Defines a sequence of concatenated Kamelets to form start to finish integration flows. Pipes are a more abstract level of defining integration flows, by chosing and configuring Kamelets.',
    },
    [SourceSchemaType.Integration]: {
      name: 'Integration',
      schema: undefined,
      multipleRoute: true,
      description: 'An integration defines a Camel route in a CRD file.',
    },
  };

  setSchema(name: string, schema: KaotoSchemaDefinition) {
    if (name === 'camelYamlDsl') {
      this.config[SourceSchemaType.Route].schema = schema;
    }
    if (name === 'citrus-yaml') {
      this.config[SourceSchemaType.Test].schema = schema;
    }
    if (isEnumType(name, SourceSchemaType)) {
      const type: SourceSchemaType = SourceSchemaType[name];
      this.config[type].schema = schema;
    }
  }
}

export const sourceSchemaConfig = new SourceSchemaConfig();
