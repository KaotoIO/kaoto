import { ProcessorDefinition } from '@kaoto-next/camel-catalog/types';
import cloneDeep from 'lodash/cloneDeep';
import { CamelUriHelper, ROOT_PATH, isDefined } from '../../../../utils';
import { ICamelComponentDefinition } from '../../../camel-components-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { IKameletDefinition } from '../../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { VisualComponentSchema } from '../../base-visual-entity';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelProcessorStepsProperties, ICamelElementLookupResult } from './camel-component-types';

export class CamelComponentSchemaService {
  static DISABLED_SIBLING_STEPS = ['from', 'onWhen', 'when', 'otherwise', 'doCatch', 'doFinally', 'onException'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getVisualComponentSchema(path: string, definition: any): VisualComponentSchema | undefined {
    const camelElementLookup = this.getCamelComponentLookup(path, definition);
    const updatedDefinition = this.getUpdatedDefinition(camelElementLookup, definition);

    return {
      title: camelElementLookup.componentName ?? camelElementLookup.processorName,
      schema: this.getSchema(camelElementLookup),
      definition: updatedDefinition,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getCamelComponentLookup(path: string, definition: any): ICamelElementLookupResult {
    const splitPath = path.split('.');
    const lastPathSegment = splitPath[splitPath.length - 1];
    const pathAsIndex = Number.parseInt(lastPathSegment, 10);

    /** If path is `#` it means the root of the Camel Route */
    if (path === ROOT_PATH) {
      return { processorName: 'route' as keyof ProcessorDefinition };
    }

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
  static getNodeLabel(camelElementLookup: ICamelElementLookupResult, definition?: any): string {
    if (typeof definition?.description === 'string' && definition.description !== '') {
      return definition.description;
    }

    if (camelElementLookup.componentName !== undefined) {
      return camelElementLookup.componentName;
    }

    const uriString = CamelUriHelper.getUriString(definition);
    switch (camelElementLookup.processorName) {
      case 'route' as keyof ProcessorDefinition:
      case 'onException' as keyof ProcessorDefinition:
        return definition?.id ?? '';

      case 'from' as keyof ProcessorDefinition:
        return uriString ?? 'from: Unknown';

      case 'to':
      case 'toD':
        return uriString ?? camelElementLookup.processorName;

      default:
        return camelElementLookup.processorName;
    }
  }

  static getTooltipContent(camelElementLookup: ICamelElementLookupResult): string {
    if (camelElementLookup.componentName !== undefined) {
      const catalogLookup = CamelCatalogService.getCatalogLookup(camelElementLookup.componentName);
      if (catalogLookup.catalogKind === CatalogKind.Component) {
        return (
          (catalogLookup.definition as unknown as ICamelComponentDefinition)?.component.description ??
          camelElementLookup.componentName
        );
      }

      if (catalogLookup.catalogKind === CatalogKind.Kamelet) {
        return (
          (catalogLookup.definition as unknown as IKameletDefinition)?.spec.definition.description ??
          camelElementLookup.componentName
        );
      }
    }

    const schema = this.getSchema(camelElementLookup);
    if (schema.description !== undefined) {
      return schema.description;
    }

    return camelElementLookup.processorName;
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
      case 'onException' as keyof ProcessorDefinition:
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
      const catalogLookup = CamelCatalogService.getCatalogLookup(camelElementLookup.componentName);
      if (isDefined(catalogLookup.definition)) {
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
    if (!isDefined(definition)) {
      return { processorName };
    }

    switch (processorName) {
      case 'from' as keyof ProcessorDefinition:
        return {
          processorName,
          componentName: this.getComponentNameFromUri(definition?.uri),
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
          componentName: this.getComponentNameFromUri(definition?.uri),
        };

      default:
        return { processorName };
    }
  }

  /**
   * Extract the component name from the endpoint uri
   * An URI is composed by a component name and query parameters, separated by a colon
   * For instance:
   *    - `log:MyLogger`
   *    - `timer:tick?period=1000`
   *    - `file:inbox?fileName=orders.txt&noop=true`
   *    - `kamelet:kafka-not-secured-sink?topic=foobar&bootstrapServers=localhost`
   */
  static getComponentNameFromUri(uri: string): string | undefined {
    if (!uri) {
      return undefined;
    }
    const uriParts = uri.split(':');
    if (uriParts[0] === 'kamelet' && uriParts.length > 1) {
      const kameletName = uriParts[1].split('?')[0];
      return uriParts[0] + ':' + kameletName;
    }
    return uriParts[0];
  }

  private static getSchema(camelElementLookup: ICamelElementLookupResult): KaotoSchemaDefinition['schema'] {
    let catalogKind: CatalogKind;
    switch (camelElementLookup.processorName) {
      case 'route' as keyof ProcessorDefinition:
      case 'onException' as keyof ProcessorDefinition:
        catalogKind = CatalogKind.Entity;
        break;
      case 'from' as keyof ProcessorDefinition:
        /**
         * The `from` processor is a special case, since it's not a ProcessorDefinition
         * so its schema is not defined in the Camel Catalog
         * @see CamelCatalogProcessor#getModelCatalog()
         */
        catalogKind = CatalogKind.Processor;
        break;
      default:
        catalogKind = CatalogKind.Pattern;
    }

    const processorDefinition = CamelCatalogService.getComponent(catalogKind, camelElementLookup.processorName);

    if (processorDefinition === undefined) return {} as unknown as KaotoSchemaDefinition['schema'];

    let schema = {} as unknown as KaotoSchemaDefinition['schema'];
    if (processorDefinition.propertiesSchema !== undefined) {
      schema = cloneDeep(processorDefinition.propertiesSchema);
    }

    if (camelElementLookup.componentName !== undefined) {
      const catalogLookup = CamelCatalogService.getCatalogLookup(camelElementLookup.componentName);
      const componentSchema: KaotoSchemaDefinition['schema'] =
        catalogLookup.definition?.propertiesSchema ?? ({} as unknown as KaotoSchemaDefinition['schema']);

      if (catalogLookup.definition !== undefined && componentSchema !== undefined) {
        schema.properties!.parameters = {
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
    /** Clone the original definition since we want to preserve the original one, until the form is changed */
    let updatedDefinition = cloneDeep(definition);
    switch (camelElementLookup.processorName) {
      case 'to':
      case 'toD':
        if (typeof definition === 'string') {
          updatedDefinition = { uri: definition };
        }
        break;

      case 'log':
        if (typeof definition === 'string') {
          updatedDefinition = { message: definition };
        }
        break;
    }

    if (camelElementLookup.componentName !== undefined) {
      updatedDefinition.parameters = updatedDefinition.parameters ?? {};
      this.applyParametersFromSyntax(camelElementLookup.componentName, updatedDefinition);
    }

    return updatedDefinition;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static applyParametersFromSyntax(componentName: string, definition: any) {
    const catalogLookup = CamelCatalogService.getCatalogLookup(componentName);
    if (catalogLookup === undefined) return;

    const [pathUri, queryUri] = definition.uri?.split('?') ?? [undefined, undefined];
    if (queryUri) {
      definition.uri = pathUri;
      Object.assign(definition.parameters, CamelUriHelper.getParametersFromQueryString(queryUri));
    }

    if (pathUri && catalogLookup.catalogKind === CatalogKind.Component) {
      const requiredParameters: string[] = [];
      if (catalogLookup.definition?.properties !== undefined) {
        Object.entries(catalogLookup.definition.properties).forEach(([key, value]) => {
          if (value.required) {
            requiredParameters.push(key);
          }
        });
      }

      const parametersFromSyntax = CamelUriHelper.getParametersFromPathString(
        catalogLookup.definition?.component.syntax,
        definition?.uri,
        { requiredParameters },
      );
      definition.uri = this.getComponentNameFromUri(definition.uri);
      Object.assign(definition.parameters, parametersFromSyntax);
    }
  }
}
