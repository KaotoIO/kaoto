import { EntityType } from './base-entity.ts';
import { Schema } from '../schema.ts';

interface IEntitySchema {
  name: string;
  schema: Schema | undefined;
  multipleRoute: boolean;
}

interface IDslConfig {
  [EntityType.Route]: IEntitySchema;
  [EntityType.Kamelet]: IEntitySchema;
  [EntityType.Pipe]: IEntitySchema;
  [EntityType.KameletBinding]: IEntitySchema;
  [EntityType.Integration]: IEntitySchema;
  [EntityType.Rest]: IEntitySchema;
  [EntityType.RestConfiguration]: IEntitySchema;
}

class EntitySchemaConfig {
  config: IDslConfig = {
    [EntityType.Route]: {
      name: 'Route',
      schema: undefined,
      multipleRoute: true,
    },
    [EntityType.Kamelet]: {
      name: 'Kamelet',
      schema: undefined,
      multipleRoute: false,
    },
    [EntityType.Pipe]: {
      name: 'Pipe',
      schema: undefined,
      multipleRoute: false,
    },
    [EntityType.KameletBinding]: {
      name: 'KameletBinding',
      schema: undefined,
      multipleRoute: false,
    },
    [EntityType.Integration]: {
      name: 'Integration',
      schema: undefined,
      multipleRoute: true,
    },
    [EntityType.Rest]: {
      name: 'Rest',
      schema: undefined,
      multipleRoute: true,
    },
    [EntityType.RestConfiguration]: {
      name: 'RestConfiguration',
      schema: undefined,
      multipleRoute: true,
    },
  };

  setSchema(schema: Schema) {
    console.log('schema', schema);
    if (schema == undefined) {
      return;
    }

    let foundType = '';
    for (const t of Object.keys(EntityType)) {
      if ((t as EntityType).toString().toLowerCase() === schema.name.toLowerCase()) {
        foundType = t;
      }
    }
    if (foundType !== '') {
      this.config[EntityType[foundType] as EntityType].schema = schema;
    }
    if (schema.name === 'Camel YAML DSL JSON schema') {
      [EntityType.Rest, EntityType.Route, EntityType.Pipe, EntityType.RestConfiguration].forEach(
        (type) => (this.config[type].schema = schema),
      );
    }
  }

  assignSchemaToType(type: EntityType, schema: Schema) {
    this.config[type].schema = schema;
  }
}

export const entitySchemaConfig = new EntitySchemaConfig();
