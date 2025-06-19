import { CatalogDefinitionEntry } from '@kaoto/camel-catalog/types';
import { KaotoSchemaDefinition } from '../models/kaoto-schema';

export class CatalogSchemaLoader {
  /** The `.` is required to support relative routes in GitHub pages */
  static readonly DEFAULT_CATALOG_PATH = './camel-catalog/index.json';
  static readonly VISUAL_FLOWS = ['route', 'Integration', 'Kamelet', 'KameletBinding', 'Pipe'];

  static async fetchFile<T>(file: string): Promise<{ body: T; uri: string }> {
    const response = await fetch(file);
    const body = await response.json();

    return { body, uri: response.url };
  }

  static getSchemasFiles(
    indexPath: string,
    schemaFiles: Record<string, CatalogDefinitionEntry>,
  ): Promise<KaotoSchemaDefinition>[] {
    return Object.entries(schemaFiles).map(async ([name, schemaDef]) => {
      const file = `${this.getRelativeBasePath(indexPath)}/${schemaDef.file}`;
      const fetchedSchema = await this.fetchFile(file);
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

  static getRelativeBasePath(catalogIndexFile: string): string {
    return catalogIndexFile.substring(0, catalogIndexFile.lastIndexOf('/'));
  }
}
