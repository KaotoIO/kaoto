import { Schema } from '../models';

export class CamelSchemasProcessor {
  static readonly VISUAL_FLOWS = ['route', 'Integration', 'Kamelet', 'KameletBinding', 'Pipe'];

  static getSchemas(schemas: Schema[]): Schema[] {
    return schemas.reduce((acc, schema) => {
      /** Standard JSON Schemas (Kamelets, KameletBindings & Pipes) */
      const tags = [];
      if (this.VISUAL_FLOWS.includes(schema.name)) {
        tags.push('visualization');
      }

      acc.push({
        ...schema,
        name: schema.name,
        tags,
      });

      /** Camel YAML DSL JSON Schemas */
      if (this.isCamelCatalog(schema)) {
        Object.keys(schema.schema.items.properties).forEach((propertyRefName) => {
          const propertyRef = schema.schema.items.properties[propertyRefName];
          const tags = [];

          if (this.VISUAL_FLOWS.includes(propertyRefName.toLowerCase())) {
            tags.push('visualization');
          }

          acc.push({
            name: propertyRefName,
            version: schema.version,
            tags,
            uri: schema.uri,
            schema: {
              $schema: 'https://json-schema.org/draft-04/schema#',
              type: 'object',
              items: { definitions: schema.schema.items },
              properties: {
                [propertyRefName]: propertyRef,
              },
            },
          });
        });
      }

      return acc;
    }, [] as Schema[]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static isCamelCatalog(schema: any): schema is Schema & {
    schema: { items: { definitions: Record<string, unknown>; properties: Record<string, unknown> } };
  } {
    return (
      schema?.schema !== null &&
      schema?.schema !== undefined &&
      typeof schema.schema === 'object' &&
      'items' in schema.schema
    );
  }
}
