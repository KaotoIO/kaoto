import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';
import { CamelUriHelper, ParsedParameters, getValue, isDefined } from '../../../../utils';
import { ICamelComponentDefinition } from '../../../camel-components-catalog';
import { CatalogKind } from '../../../catalog-kind';
import { IKameletDefinition } from '../../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { NodeLabelType } from '../../../settings/settings.model';
import { VisualComponentSchema } from '../../base-visual-entity';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelProcessorStepsProperties, ICamelElementLookupResult } from './camel-component-types';

export class CamelComponentSchemaService {
  static DISABLED_SIBLING_STEPS = [
    'route',
    'from',
    'onWhen',
    'when',
    'otherwise',
    'doCatch',
    'doFinally',
    'intercept',
    'interceptFrom',
    'interceptSendToEndpoint',
    'onException',
    'onCompletion',
  ];
  static DISABLED_REMOVE_STEPS = ['from', 'route'] as unknown as (keyof ProcessorDefinition)[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getVisualComponentSchema(path: string, definition: any): VisualComponentSchema | undefined {
    const camelElementLookup = this.getCamelComponentLookup(path, definition);
    const updatedDefinition = this.getUpdatedDefinition(camelElementLookup, definition);

    return {
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

  static getNodeLabel(
    camelElementLookup: ICamelElementLookupResult,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    definition?: any,
    labelType?: NodeLabelType,
  ): string {
    const id: string | undefined = getValue(definition, 'id');
    if (labelType === NodeLabelType.Id && id) {
      return id;
    }

    const description: string | undefined = getValue(definition, 'description');
    if (description) {
      return description;
    }

    const semanticString = CamelUriHelper.getSemanticString(camelElementLookup, definition);
    if (camelElementLookup.componentName !== undefined) {
      return semanticString ?? camelElementLookup.componentName;
    }

    const uriString = CamelUriHelper.getUriString(definition);
    switch (camelElementLookup.processorName) {
      case 'route' as keyof ProcessorDefinition:
      case 'errorHandler' as keyof ProcessorDefinition:
      case 'onException' as keyof ProcessorDefinition:
      case 'onCompletion' as keyof ProcessorDefinition:
      case 'intercept' as keyof ProcessorDefinition:
      case 'interceptFrom' as keyof ProcessorDefinition:
      case 'interceptSendToEndpoint' as keyof ProcessorDefinition:
        return id ?? camelElementLookup.processorName;

      case 'from' as keyof ProcessorDefinition:
        return uriString ?? 'from: Unknown';

      case 'to':
      case 'toD':
      case 'poll':
        return semanticString ?? uriString ?? camelElementLookup.processorName;

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

  static canReplaceStep(processorName: keyof ProcessorDefinition): boolean {
    return (
      processorName === ('from' as keyof ProcessorDefinition) || !this.DISABLED_SIBLING_STEPS.includes(processorName)
    );
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
      case /** routeConfiguration */ 'intercept' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'interceptFrom' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'interceptSendToEndpoint' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'onException' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'onCompletion' as keyof ProcessorDefinition:
        return [{ name: 'steps', type: 'branch' }];

      case 'choice':
        return [
          { name: 'when', type: 'array-clause' },
          { name: 'otherwise', type: 'single-clause' },
        ];

      case 'doTry':
        return [
          { name: 'steps', type: 'branch' },
          { name: 'doCatch', type: 'array-clause' },
          { name: 'doFinally', type: 'single-clause' },
        ];

      case 'routeConfiguration' as keyof ProcessorDefinition:
        return [
          { name: 'intercept', type: 'array-clause' },
          { name: 'interceptFrom', type: 'array-clause' },
          { name: 'interceptSendToEndpoint', type: 'array-clause' },
          { name: 'onException', type: 'array-clause' },
          { name: 'onCompletion', type: 'array-clause' },
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMultiValueSerializedDefinition(path: string, definition: any): ParsedParameters | undefined {
    const camelElementLookup = this.getCamelComponentLookup(path, definition);
    if (camelElementLookup.componentName === undefined) {
      return definition;
    }

    const catalogLookup = CamelCatalogService.getCatalogLookup(camelElementLookup.componentName);
    if (catalogLookup.catalogKind === CatalogKind.Component) {
      const multiValueParameters: Map<string, string> = new Map<string, string>();
      if (catalogLookup.definition?.properties !== undefined) {
        Object.entries(catalogLookup.definition.properties).forEach(([key, value]) => {
          if (value.multiValue) multiValueParameters.set(key, value.prefix!);
        });
      }
      const defaultMultiValues: ParsedParameters = {};
      const filteredParameters = definition.parameters;

      if (definition.parameters !== undefined) {
        Object.keys(definition.parameters).forEach((key) => {
          if (multiValueParameters.has(key)) {
            if (definition.parameters[key] === undefined) {
              return;
            }
            Object.keys(definition.parameters[key]).forEach((subKey) => {
              defaultMultiValues[multiValueParameters.get(key) + subKey] = definition.parameters[key][subKey];
            });
            delete filteredParameters[key];
          }
        });
      }
      return Object.assign({}, definition, { parameters: { ...filteredParameters, ...defaultMultiValues } });
    }
    return definition;
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
      case 'poll':
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

      // Filter out producer/consumer properties depenging upon the endpoint usage
      const actualComponentProperties = Object.fromEntries(
        Object.entries(componentSchema.properties ?? {}).filter((property) => {
          if (camelElementLookup.processorName === ('from' as keyof ProcessorDefinition)) {
            return !property[1].group?.includes('producer');
          } else {
            return !property[1].group?.includes('consumer');
          }
        }),
      );

      if (catalogLookup.definition !== undefined && componentSchema !== undefined) {
        schema.properties!.parameters = {
          type: 'object',
          title: 'Endpoint Properties',
          description: 'Endpoint properties description',
          properties: actualComponentProperties,
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
      this.readMultiValue(camelElementLookup.componentName, updatedDefinition);
    }

    return updatedDefinition;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static readMultiValue(componentName: string, definition: any) {
    const catalogLookup = CamelCatalogService.getCatalogLookup(componentName);

    const multiValueParameters: Map<string, string> = new Map<string, string>();
    if (catalogLookup !== undefined && catalogLookup.definition?.properties !== undefined) {
      Object.entries(catalogLookup.definition.properties).forEach(([key, value]) => {
        if (value.multiValue) multiValueParameters.set(key, value.prefix!);
      });
    }
    if (multiValueParameters.size > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parameters: any = {};
      const filteredParameters = definition.parameters;

      multiValueParameters.forEach((value, key) => {
        const nestParameters: ParsedParameters = {};

        Object.entries(definition.parameters).forEach(([paramKey, paramValue]) => {
          if (paramKey.startsWith(value)) {
            nestParameters[paramKey.replace(value, '')] = paramValue as string;
            delete filteredParameters[paramKey];
          }
          parameters[key] = { ...nestParameters };
        });
      });
      Object.assign(definition, { parameters: { ...filteredParameters, ...parameters } });
    }
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

  static canBeDisabled(processorName: keyof ProcessorDefinition): boolean {
    const processorDefinition = CamelCatalogService.getComponent(CatalogKind.Pattern, processorName);

    return processorDefinition?.propertiesSchema?.properties?.disabled !== undefined;
  }
}
