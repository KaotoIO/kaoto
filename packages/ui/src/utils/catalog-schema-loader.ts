import { Schema, SchemaEntry } from '../models';

export class CatalogSchemaLoader {
  static readonly DEFAULT_CATALOG_PATH = '/camel-catalog';
  static readonly VISUAL_FLOWS = ['route', 'Integration', 'Kamelet', 'KameletBinding', 'Pipe'];

  static async fetchFile<T>(file: string): Promise<{ body: T; uri: string }> {
    /** The `.` is required to support relative routes in GitHub pages */
    const response = await fetch(`.${this.DEFAULT_CATALOG_PATH}/${file}`);
    const body = await response.json();

    return { body, uri: response.url };
  }

  static getSchemasFiles(schemaFiles: Record<string, SchemaEntry>): Promise<Schema>[] {
    return Object.entries(schemaFiles).map(async ([name, schemaDef]) => {
      const fetchedSchema = await this.fetchFile(schemaDef.file);
      const tags = [];

      if (this.VISUAL_FLOWS.includes(name)) {
        tags.push('visualization');
      }

      return {
        name,
        tags,
        version: schemaDef.version,
        uri: fetchedSchema.uri,
        schema: fetchedSchema.body,
      };
    });
  }
}
