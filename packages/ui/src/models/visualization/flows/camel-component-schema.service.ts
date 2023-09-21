import type { JSONSchemaType } from 'ajv';
import { VisualComponentSchema } from '../base-visual-entity';
import { CatalogKind } from '../../catalog-kind';

export class CamelComponentSchemaService {
  static getVisualComponentSchema(path: string, model: Record<string, any>): VisualComponentSchema | undefined {
    const componentDef = this.getCamelComponentName(path, model);

    return {
      name: componentDef.name,
      schema: this.getSchema(path, model),
    };
  }

  private static getSchema(path: string, model: Record<string, any>): JS {
    return {
      $schema: 'https://json-schema.org/draft-04/schema#',
      type: 'object',
      properties: {
        'example-property': {
          title: 'Example Property Title',
          description: 'Example Property Description',
          defaultValue: 'Example Property Default Value',
          type: 'object',
          properties: {
            allowEmptyDirectory: {
              type: 'boolean',
              description:
                'If the tar file has more than one entry, setting this option to true, allows to get the iterator even if the directory is empty',
              title: 'Allow Empty Directory',
            },
            id: {
              type: 'string',
              description: 'The id of this node',
              title: 'Id',
            },
            maxDecompressedSize: {
              type: 'number',
              description:
                'Set the maximum decompressed size of a tar file (in bytes). The default value if not specified corresponds to 1 gigabyte. An IOException will be thrown if the decompressed size exceeds this amount. Set to -1 to disable setting a maximum decompressed size.',
              title: 'Max Decompressed Size',
            },
            preservePathElements: {
              type: 'boolean',
              description:
                'If the file name contains path elements, setting this option to true, allows the path to be maintained in the tar file.',
              title: 'Preserve Path Elements',
            },
            usingIterator: {
              type: 'boolean',
              description:
                'If the tar file has more than one entry, the setting this option to true, allows working with the splitter EIP, to split the data using an iterator in a streaming mode.',
              title: 'Using Iterator',
            },
          },
        },
      },
    } as unknown as JSONSchemaType<unknown>;
  }

  private static getCamelComponentName(path: string, definition: any): { name: string; type: CatalogKind } {
    const splitPath = path.split('.');
    const lastPathSegment = splitPath[splitPath.length - 1];
    const pathAsIndex = Number.parseInt(lastPathSegment, 10);

    /**
     * If the last path segment is NaN, it means this is a Camel Processor
     * for instance, `from`, `when`, `otherwise` or `to` properties in a Route
     * and we can just return the path as the name of the component
     */
    if (Number.isNaN(pathAsIndex)) return { name: lastPathSegment, type: CatalogKind.Processor };

    /**
     * The last path segment is a number, it means is part of a list of components
     * and we need to get the name of the component from the definition
     */
    const propertiesList = Object.keys(definition);
    if (propertiesList.length !== 1) {
      throw new Error('No properties or more than one found in definition');
    }

    const componentName = propertiesList[0];

    switch (componentName) {
      case 'from':
        return { name: this.getNameFromUri(definition[componentName].uri), type: CatalogKind.Component };
      case 'to':
        /** The To processor is using `to: timer:tick?period=1000` form */
        if (typeof definition[componentName] === 'string') {
          return { name: this.getNameFromUri(definition[componentName]), type: CatalogKind.Component };
        }

        /** The To processor is using `to: { uri: 'timer:tick?period=1000' }` form */
        return { name: this.getNameFromUri(definition[componentName].uri), type: CatalogKind.Component };
      default:
        return { name: componentName, type: CatalogKind.Component };
    }
  }

  /**
   * Extract the component name from the endpoint uri
   * An URI is composed by a component name and query parameters, separated by a colon
   * For instance: `timer:tick?period=1000`
   */
  private static getNameFromUri(uri: string): string {
    const uriParts = uri.split(':');

    return uriParts[0];
  }
}
