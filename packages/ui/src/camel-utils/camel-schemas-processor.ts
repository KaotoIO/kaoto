import { Schema } from '../models';

export const DEFAULT_CATALOG_PATH = '/camel-catalog';

export class CamelSchemasProcessor {
  static readonly VISUAL_FLOWS = ['route', 'Integration', 'Kamelet', 'KameletBinding', 'Pipe'];

  static getSchemas(schemaMap: {[key: string]: Schema}): {[key: string]: Schema} {
    return Object.entries(schemaMap).reduce((acc, [key, schema]) => {
      /** Standard JSON Schemas (Kamelets, KameletBindings & Pipes) */
      const tags = [];
      if (this.VISUAL_FLOWS.includes(schema.name)) {
        tags.push('visualization');
      }

      acc[key] = {
        ...schema,
        name: schema.name,
        tags,
      };

      return acc;
    }, {} as {[key: string]: Schema});
  }

}
