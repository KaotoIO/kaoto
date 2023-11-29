import { ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
import type { JSONSchemaType } from 'ajv';
import { isDefined } from '../../../../utils';
import { ComponentsCatalogTypes } from '../../../camel-catalog-index';
import { CatalogKind } from '../../../catalog-kind';
import { VisualComponentSchema } from '../../base-visual-entity';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelProcessorStepsProperties, ICamelElementLookupResult } from './camel-component-types';
import { NodeDefinitionService } from './node-definition.service';

export class CamelComponentSchemaService {
  static DISABLED_SIBLING_STEPS = ['from', 'when', 'otherwise', 'doCatch', 'doFinally'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getVisualComponentSchema(path: string, definition: any): VisualComponentSchema | undefined {
    const camelElementLookup = this.getCamelComponentLookup(path, definition);
    const updatedDefinition = this.getUpdatedDefinition(camelElementLookup, definition);

    return {
      title: camelElementLookup.processorName,
      schema: this.getSchema(camelElementLookup),
      definition: updatedDefinition,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getCamelComponentLookup(path: string, definition: any): ICamelElementLookupResult {
    const splitPath = path.split('.');
    const lastPathSegment = splitPath[splitPath.length - 1];
    const pathAsIndex = Number.parseInt(lastPathSegment, 10);

    /**
     * If the last path segment is NaN, it means this is a Camel Processor
     * for instance, `from`, `otherwise` or `to` properties in a Route
     * and we can just return the path as the name of the component
     */
    if (Number.isNaN(pathAsIndex)) {
      return this.getCamelElement(lastPathSegment as keyof ProcessorDefinition, definition);
    }

    /**
     * The last path segment is a number, it means is an array of objects
     * and we need to look for the previous path segment to get the name of the processor
     * for instance, a `when` property in a `Choice` processor
     */
    const previousPathSegment = splitPath[splitPath.length - 2];
    return this.getCamelElement(previousPathSegment as keyof ProcessorDefinition, definition);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getLabel(camelElementLookup: ICamelElementLookupResult, definition: any): string {
    if (camelElementLookup.componentName !== undefined) {
      return camelElementLookup.componentName;
    }

    switch (camelElementLookup.processorName) {
      case 'from' as keyof ProcessorDefinition:
        return definition.uri ?? '';

      case 'to':
      case 'toD':
        return typeof definition === 'string' ? definition : definition.uri ?? camelElementLookup.processorName;

      default:
        return camelElementLookup.processorName;
    }
  }

  static canHavePreviousStep(processorName: keyof ProcessorDefinition): boolean {
    return !this.DISABLED_SIBLING_STEPS.includes(processorName);
  }

  static getProcessorStepsProperties(processorName: keyof ProcessorDefinition): CamelProcessorStepsProperties[] {
    switch (processorName) {
      /** choice */ case 'when':
      /** choice */ case 'otherwise':
      /** doTry */ case 'doCatch':
      /** doTry */ case 'doFinally':
      case 'aggregate':
      case 'circuitBreaker':
      case 'filter':
      case 'loadBalance':
      case 'loop':
      case 'multicast':
      case 'onFallback':
      case 'pipeline':
      case 'resequence':
      case 'saga':
      case 'split':
      case 'step':
      case 'whenSkipSendToEndpoint':
      case 'from' as keyof ProcessorDefinition:
        return [{ name: 'steps', type: 'branch' }];

      case 'choice':
        return [
          { name: 'when', type: 'clause-list' },
          { name: 'otherwise', type: 'single-clause' },
        ];

      case 'doTry':
        return [
          { name: 'steps', type: 'branch' },
          { name: 'doCatch', type: 'clause-list' },
          { name: 'doFinally', type: 'single-clause' },
        ];

      default:
        return [];
    }
  }

  static getIconName(camelElementLookup: ICamelElementLookupResult): string | undefined {
    if (isDefined(camelElementLookup.componentName)) {
      let catalogKind: CatalogKind = CatalogKind.Component;
      let lookupName: string = camelElementLookup.componentName;

      if (
        camelElementLookup.componentName === 'kamelet:source' ||
        camelElementLookup.componentName === 'kamelet:sink'
      ) {
        catalogKind = CatalogKind.KameletBoundary;
        lookupName = camelElementLookup.componentName.replace('kamelet:', '');
      } else if (camelElementLookup.componentName.startsWith('kamelet:')) {
        catalogKind = CatalogKind.Kamelet;
        lookupName = camelElementLookup.componentName.replace('kamelet:', '');
      }

      if (isDefined(CamelCatalogService.getComponent(catalogKind, lookupName))) {
        return camelElementLookup.componentName;
      }
    }

    if (
      isDefined(camelElementLookup.processorName) &&
      !isDefined(camelElementLookup.componentName) &&
      isDefined(CamelCatalogService.getComponent(CatalogKind.Processor, camelElementLookup.processorName))
    ) {
      return camelElementLookup.processorName;
    }

    return '';
  }

  /**
   * If the processor is a `from` or `to` processor, we need to extract the component name from the uri property
   * and return both the processor name and the underlying component name to build the combined schema
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static getCamelElement(processorName: keyof ProcessorDefinition, definition: any): ICamelElementLookupResult {
    switch (processorName) {
      case 'from' as keyof ProcessorDefinition:
        return {
          processorName,
          componentName: this.getComponentNameFromUri(definition.uri),
        };

      case 'to':
      case 'toD':
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
  static getComponentNameFromUri(uri: string): string | undefined {
    if (!uri) {
      return undefined;
    }
    const uriParts = uri.split(':');
    if (uriParts[0] === 'kamelet') {
      return uriParts[0] + ':' + uriParts[1];
    }
    return uriParts[0];
  }

  private static getSchema(camelElementLookup: ICamelElementLookupResult): JSONSchemaType<unknown> {
    const processorDefinition = CamelCatalogService.getComponent(
      CatalogKind.Processor,
      camelElementLookup.processorName,
    );

    if (processorDefinition === undefined) return {} as unknown as JSONSchemaType<unknown>;

    const schema = NodeDefinitionService.getSchemaFromCamelCommonProperties(processorDefinition.properties);

    if (camelElementLookup.componentName !== undefined) {
      let componentDefinition: ComponentsCatalogTypes | undefined;
      let componentSchema: JSONSchemaType<unknown>;

      if (camelElementLookup.componentName.startsWith('kamelet:')) {
        componentDefinition = CamelCatalogService.getComponent(
          CatalogKind.Kamelet,
          camelElementLookup.componentName.replace('kamelet:', ''),
        );
        componentSchema = NodeDefinitionService.getSchemaFromKameletDefinition(componentDefinition);
      } else {
        componentDefinition = CamelCatalogService.getComponent(CatalogKind.Component, camelElementLookup.componentName);
        componentSchema = NodeDefinitionService.getSchemaFromCamelCommonProperties(componentDefinition?.properties);
      }

      if (componentDefinition !== undefined && componentSchema !== undefined) {
        schema.properties.parameters = {
          type: 'object',
          title: 'Endpoint Properties',
          description: 'Endpoint properties description',
          properties: componentSchema.properties,
          required: componentSchema.required,
        };
      }
    }

    return schema;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static getUpdatedDefinition(camelElementLookup: ICamelElementLookupResult, definition: any) {
    switch (camelElementLookup.processorName) {
      case 'to':
      case 'toD':
        if (typeof definition === 'string') {
          return { uri: definition };
        }
        break;

      case 'log':
        if (typeof definition === 'string') {
          return { message: definition };
        }
        break;
    }
    return definition;
  }
}
