import type { JSONSchemaType } from 'ajv';
import { useCatalogStore } from '../../../store';
import { ICamelProcessorProperty } from '../../camel-processors-catalog';
import { CatalogKind } from '../../catalog-kind';
import { VisualComponentSchema } from '../base-visual-entity';
import { ICamelComponentProperty } from '../../camel-components-catalog';
import { isDefined } from '../../../utils';

interface ICamelElementLookupResult {
  processorName: string;
  componentName?: string;
}

export class CamelComponentSchemaService {
  static getVisualComponentSchema(path: string, definition: any): VisualComponentSchema | undefined {
    const camelElementLookup = this.getCamelComponentLookup(path, definition);

    return {
      title: camelElementLookup.processorName,
      schema: this.getSchema(camelElementLookup),
      definition,
    };
  }

  static getCamelComponentLookup(path: string, definition: any): ICamelElementLookupResult {
    const splitPath = path.split('.');
    const lastPathSegment = splitPath[splitPath.length - 1];
    const pathAsIndex = Number.parseInt(lastPathSegment, 10);

    /**
     * If the last path segment is NaN, it means this is a Camel Processor
     * for instance, `from`, `when`, `otherwise` or `to` properties in a Route
     * and we can just return the path as the name of the component
     */
    if (Number.isNaN(pathAsIndex)) {
      return this.getCamelElement(lastPathSegment, definition);
    }

    /**
     * The last path segment is a number, it means is an array of objects
     * and we need to look for the previous path segment to get the name of the processor
     * for instance, a `when` property in a `Choice` processor
     */
    const previousPathSegment = splitPath[splitPath.length - 2];
    if (typeof previousPathSegment === 'string') {
      return this.getCamelElement(previousPathSegment, definition);
    }

    /**
     * If we reach this point, it means we couldn't determine the name of the component
     */
    return { processorName: '' };
  }

  /**
   * If the processor is a `from` or `to` processor, we need to extract the component name from the uri property
   * and return both the processor name and the underlying component name to build the combined schema
   */
  private static getCamelElement(processorName: string, definition: any): ICamelElementLookupResult {
    switch (processorName) {
      case 'from':
        return {
          processorName,
          componentName: this.getComponentNameFromUri(definition.uri),
        };

      case 'to':
        /** The To processor is using `to: timer:tick?period=1000` form */
        if (typeof definition === 'string') {
          return {
            processorName,
            componentName: this.getComponentNameFromUri(definition),
          };
        }

        /** The To processor is using `to: { uri: 'timer:tick?period=1000' }` form */
        return {
          processorName,
          componentName: this.getComponentNameFromUri(definition.uri),
        };

      default:
        return { processorName };
    }
  }

  /**
   * Extract the component name from the endpoint uri
   * An URI is composed by a component name and query parameters, separated by a colon
   * For instance: `timer:tick?period=1000`
   */
  private static getComponentNameFromUri(uri: string): string | undefined {
    if (!uri) {
      return undefined;
    }
    const uriParts = uri.split(':');

    return uriParts[0];
  }

  private static getSchema(camelElementLookup: ICamelElementLookupResult): JSONSchemaType<unknown> {
    const processorDefinition =
      useCatalogStore.getState().catalogs[CatalogKind.Processor]?.[camelElementLookup.processorName];

    if (processorDefinition === undefined) return {} as unknown as JSONSchemaType<unknown>;

    const schema = this.getSchemaFromCamelCommonProperties(processorDefinition.properties);

    if (camelElementLookup.componentName !== undefined) {
      const componentDefinition =
        useCatalogStore.getState().catalogs[CatalogKind.Component]?.[camelElementLookup.componentName];

      if (componentDefinition !== undefined) {
        const componentSchema = this.getSchemaFromCamelCommonProperties(componentDefinition.properties);
        schema.properties.parameters = {
          type: 'object',
          title: 'Component Parameters',
          description: 'Component parameters description',
          properties: componentSchema.properties,
        };
      }
    }

    return schema;
  }

  static getIconName(camelElementLookup: ICamelElementLookupResult): string | undefined {
    if (
      isDefined(camelElementLookup.componentName) &&
      isDefined(useCatalogStore.getState().catalogs[CatalogKind.Component]?.[camelElementLookup.componentName])
    ) {
      return camelElementLookup.componentName;
    }
    if (
      isDefined(camelElementLookup.processorName) &&
      !isDefined(camelElementLookup.componentName) &&
      isDefined(useCatalogStore.getState().catalogs[CatalogKind.Processor]?.[camelElementLookup.processorName])
    ) {
      return camelElementLookup.processorName;
    }
    return '';
  }

  /**
   * Transform Camel Common properties into a JSON Schema
   */
  private static getSchemaFromCamelCommonProperties(
    properties: Record<string, ICamelProcessorProperty | ICamelComponentProperty>,
  ): JSONSchemaType<unknown> {
    const required: string[] = [];
    const schema = {
      type: 'object',
      properties: {},
      required,
    } as unknown as JSONSchemaType<unknown>;

    Object.keys(properties).forEach((propertyName) => {
      const property = properties[propertyName];
      const propertyType = this.getJSONType(property);
      const propertySchema = {
        type: propertyType,
        title: property.displayName,
        description: property.description,
        deprecated: property.deprecated,
      } as unknown as JSONSchemaType<unknown>;

      if (property.enum !== undefined) {
        propertySchema.enum = property.enum;
      }

      if (property.required) {
        required.push(propertyName);
      }

      schema.properties[propertyName] = propertySchema;
    });

    return schema;
  }

  /**
   * Transform Camel property types into JSON Schema types
   *
   * This is needed because the Camel Catalog is using different types than JSON Schema
   * For instance, the Camel Catalog is using `duration` instead of `number`
   */
  static getJSONType(property: ICamelProcessorProperty | ICamelComponentProperty): string | undefined {
    /** Camel defines enum as a type, whereas it should be string and let uniforms handle the right field */
    if (Array.isArray(property.enum)) {
      return undefined;
    }

    switch (property.type) {
      /** Camel defines duration as string since it supports placeholders */
      case 'duration':
        return 'string';

      default:
        return property.type;
    }
  }
}
