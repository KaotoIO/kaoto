import { Schema } from '../models';

export const DEFAULT_CATALOG_PATH = '/camel-catalog';

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

      return acc;
    }, [] as Schema[]);
  }

}
