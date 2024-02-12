import { KaotoSchemaDefinition, SchemaEntry } from '../models';

export class CatalogSchemaLoader {
  /** The `.` is required to support relative routes in GitHub pages */
  static readonly DEFAULT_CATALOG_PATH = './camel-catalog';
  static readonly VISUAL_FLOWS = ['route', 'Integration', 'Kamelet', 'KameletBinding', 'Pipe'];

  static async fetchFile<T>(file: string): Promise<{ body: T; uri: string }> {
    const response = await fetch(file);
    const body = await response.json();

    return { body, uri: response.url };
  }

  static getSchemasFiles(basePath: string, schemaFiles: Record<string, SchemaEntry>): Promise<KaotoSchemaDefinition>[] {
    return Object.entries(schemaFiles).map(async ([name, schemaDef]) => {
      const fetchedSchema = await this.fetchFile(`${basePath}/${schemaDef.file}`);
      const tags = [];

      if (this.VISUAL_FLOWS.includes(name)) {
        tags.push('visualization');
      }

      return {
        name,
        tags,
        version: schemaDef.version,
        uri: fetchedSchema.uri,
        schema: fetchedSchema.body as KaotoSchemaDefinition['schema'],
      };
    });
  }
}
