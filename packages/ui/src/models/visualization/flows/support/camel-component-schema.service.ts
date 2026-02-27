import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { isDefined } from '@kaoto/forms';
import { cloneDeep } from 'lodash';

import { CamelUriHelper, DATAMAPPER_ID_PREFIX, getValue, isDataMapperNode, ParsedParameters } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { IKameletDefinition } from '../../../kamelets-catalog';
import { KaotoSchemaDefinition } from '../../../kaoto-schema';
import { NodeLabelType } from '../../../settings/settings.model';
import { REST_DSL_VERBS } from '../../../special-processors.constants';
import { IClipboardCopyObject } from '../../clipboard';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelProcessorStepsProperties, ICamelElementLookupResult } from './camel-component-types';

const CAMEL_EIP_STEP_PROPERTIES: CamelProcessorStepsProperties[] = [{ name: 'steps', type: 'branch' }];
const CAMEL_CIRCUIT_BREAK_STEP_PROPERTIES: CamelProcessorStepsProperties[] = [
  { name: 'steps', type: 'branch' },
  { name: 'onFallback', type: 'single-clause' },
];
const CAMEL_CHOICE_STEP_PROPERTIES: CamelProcessorStepsProperties[] = [
  { name: 'when', type: 'array-clause' },
  { name: 'otherwise', type: 'single-clause' },
];
const CAMEL_DO_TRY_STEP_PROPERTIES: CamelProcessorStepsProperties[] = [
  { name: 'steps', type: 'branch' },
  { name: 'doCatch', type: 'array-clause' },
  { name: 'doFinally', type: 'single-clause' },
];
const CAMEL_ROUTE_CONFIGURATION_STEP_PROPERTIES: CamelProcessorStepsProperties[] = [
  { name: 'intercept', type: 'array-clause' },
  { name: 'interceptFrom', type: 'array-clause' },
  { name: 'interceptSendToEndpoint', type: 'array-clause' },
  { name: 'onException', type: 'array-clause' },
  { name: 'onCompletion', type: 'array-clause' },
];
const CAMEL_REST_DSL_STEP_PROPERTIES: CamelProcessorStepsProperties[] = REST_DSL_VERBS.map((method) => ({
  name: method,
  type: 'array-clause',
}));
const CAMEL_REST_VERB_STEP_PROPERTIES: CamelProcessorStepsProperties[] = [{ name: 'to', type: 'single-clause' }];

export class CamelComponentSchemaService {
  static readonly DISABLED_SIBLING_STEPS = [
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
    ...REST_DSL_VERBS,
  ];
  static readonly DISABLED_REMOVE_STEPS = ['from', 'route'] as unknown as (keyof ProcessorDefinition)[];
  static readonly SPECIAL_CHILD_PROCESSORS = [
    'onFallback',
    'when',
    'otherwise',
    'doCatch',
    'doFinally',
    ...REST_DSL_VERBS,
  ];
  static readonly PROCESSOR_STRING_DEFINITIONS: Record<string, string> = {
    to: 'uri',
    toD: 'uri',
    log: 'message',
    convertBodyTo: 'type',
    setExchangePattern: 'pattern',
    bean: 'ref',
    customLoadlBadalancer: ' ref',
    routingSlip: 'expression',
    routeBuilder: 'ref',
    removeVariable: 'name',
    removeProperty: 'name',
    removeProperties: 'pattern',
    removeHeader: 'name',
    removeHeaders: 'pattern',
    kamelet: 'name',
  };

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
      case 'step':
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

  static getNodeTitle(camelElementLookup: ICamelElementLookupResult): string {
    if (camelElementLookup.componentName !== undefined) {
      const catalogLookup = CamelCatalogService.getCatalogLookup(camelElementLookup.componentName);
      if (catalogLookup.catalogKind === CatalogKind.Component) {
        return catalogLookup.definition?.component.title ?? camelElementLookup.componentName;
      }

      if (catalogLookup.catalogKind === CatalogKind.Kamelet) {
        return (
          (catalogLookup.definition as unknown as IKameletDefinition)?.spec.definition.title ??
          camelElementLookup.componentName
        );
      }
    }

    const catalogLookup = CamelCatalogService.getComponent(CatalogKind.Processor, camelElementLookup.processorName);

    return catalogLookup?.model.title ?? camelElementLookup.processorName;
  }

  static getTooltipContent(camelElementLookup: ICamelElementLookupResult): string {
    if (camelElementLookup.componentName !== undefined) {
      const catalogLookup = CamelCatalogService.getCatalogLookup(camelElementLookup.componentName);
      if (catalogLookup.catalogKind === CatalogKind.Component) {
        return catalogLookup.definition?.component.description ?? camelElementLookup.componentName;
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
      /** choice */ case 'when' as keyof ProcessorDefinition:
      /** choice */ case 'otherwise' as keyof ProcessorDefinition:
      /** doTry */ case 'doCatch':
      /** doTry */ case 'doFinally':
      case 'aggregate':
      case 'filter':
      case 'loadBalance':
      case 'loop':
      case 'multicast':
      case 'onFallback' as keyof ProcessorDefinition:
      case 'pipeline':
      case 'resequence':
      case 'saga':
      case 'split':
      case 'step':
      case 'whenSkipSendToEndpoint' as keyof ProcessorDefinition:
      case 'from' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'intercept' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'interceptFrom' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'interceptSendToEndpoint' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'onException' as keyof ProcessorDefinition:
      case /** routeConfiguration */ 'onCompletion' as keyof ProcessorDefinition:
        return CAMEL_EIP_STEP_PROPERTIES;

      case 'circuitBreaker':
        return CAMEL_CIRCUIT_BREAK_STEP_PROPERTIES;

      case 'choice':
        return CAMEL_CHOICE_STEP_PROPERTIES;

      case 'doTry':
        return CAMEL_DO_TRY_STEP_PROPERTIES;

      case 'routeConfiguration' as keyof ProcessorDefinition:
        return CAMEL_ROUTE_CONFIGURATION_STEP_PROPERTIES;

      case 'rest' as keyof ProcessorDefinition:
        return CAMEL_REST_DSL_STEP_PROPERTIES;
      case /** rest */ 'get' as keyof ProcessorDefinition:
      case /** rest */ 'post' as keyof ProcessorDefinition:
      case /** rest */ 'put' as keyof ProcessorDefinition:
      case /** rest */ 'delete' as keyof ProcessorDefinition:
      case /** rest */ 'patch' as keyof ProcessorDefinition:
      case /** rest */ 'head' as keyof ProcessorDefinition:
        return CAMEL_REST_VERB_STEP_PROPERTIES;
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
      return { ...definition, parameters: { ...filteredParameters, ...defaultMultiValues } };
    }
    return definition;
  }

  /**
   * Flatten multivalue parameters for display in PropertiesField
   */
  static flattenMultivalueParameters(
    componentName: string,
    parameters: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!parameters) return {};
    const fakeDefinition = { uri: componentName, parameters: cloneDeep(parameters) };
    const serialized = this.getMultiValueSerializedDefinition('from', fakeDefinition);
    return (serialized?.parameters ?? parameters) as Record<string, unknown>;
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

  /**
   * Get the definition for a given component and property
   */
  static getNodeDefinitionValue(clipboardContent: IClipboardCopyObject): ProcessorDefinition {
    const { name, definition: defaultValue } = clipboardContent;

    if (this.SPECIAL_CHILD_PROCESSORS.includes(name)) {
      return defaultValue as ProcessorDefinition;
    } else {
      return { [name]: defaultValue } as ProcessorDefinition;
    }
  }

  static getSchema(camelElementLookup: ICamelElementLookupResult): KaotoSchemaDefinition['schema'] {
    let catalogKind: CatalogKind;
    switch (camelElementLookup.processorName) {
      case 'route' as keyof ProcessorDefinition:
      case 'intercept' as keyof ProcessorDefinition:
      case 'interceptFrom' as keyof ProcessorDefinition:
      case 'interceptSendToEndpoint' as keyof ProcessorDefinition:
      case 'onException' as keyof ProcessorDefinition:
      case 'onCompletion' as keyof ProcessorDefinition:
      case 'from' as keyof ProcessorDefinition:
        catalogKind = CatalogKind.Entity;
        break;
      default:
        catalogKind = CatalogKind.Pattern;
    }

    const processorDefinition = CamelCatalogService.getComponent(catalogKind, camelElementLookup.processorName);

    let schema = {} as unknown as KaotoSchemaDefinition['schema'];
    if (processorDefinition?.propertiesSchema === undefined) {
      return schema;
    }
    schema = cloneDeep(processorDefinition.propertiesSchema);

    if (camelElementLookup.componentName !== undefined) {
      const catalogLookup = CamelCatalogService.getCatalogLookup(camelElementLookup.componentName);
      const componentSchema: KaotoSchemaDefinition['schema'] =
        catalogLookup.definition?.propertiesSchema ?? ({} as unknown as KaotoSchemaDefinition['schema']);

      // Filter out producer/consumer properties depending upon the endpoint usage
      const actualComponentProperties = Object.fromEntries(
        Object.entries(componentSchema.properties ?? {}).filter((property) => {
          if (camelElementLookup.processorName === ('from' as keyof ProcessorDefinition)) {
            return !property[1].$comment?.includes('producer');
          } else {
            return !property[1].$comment?.includes('consumer');
          }
        }),
      );

      if (catalogLookup.definition !== undefined && componentSchema !== undefined) {
        if (!schema.properties) {
          schema.properties = {};
        }
        if (!schema.properties.parameters) {
          schema.properties.parameters = { type: 'object', properties: {} };
        }
        schema.properties.parameters.properties = actualComponentProperties;
        schema.properties.parameters.required = componentSchema.required;
        schema.properties.parameters['x-component-name'] = camelElementLookup.componentName;
      }
    }

    return schema;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getUpdatedDefinition(camelElementLookup: ICamelElementLookupResult, definition: any) {
    /** Clone the original definition since we want to preserve the original one, until the form is changed */
    let updatedDefinition = cloneDeep(definition);

    const prop = this.PROCESSOR_STRING_DEFINITIONS[camelElementLookup.processorName];
    if (prop && typeof definition === 'string') {
      updatedDefinition = { [prop]: definition };
    }

    if (camelElementLookup.componentName !== undefined) {
      updatedDefinition.parameters = updatedDefinition.parameters ?? {};
      this.applyParametersFromSyntax(camelElementLookup.componentName, updatedDefinition);
      this.readMultiValue(camelElementLookup.componentName, updatedDefinition);
    }

    return updatedDefinition;
  }

  static canBeDisabled(processorName: keyof ProcessorDefinition): boolean {
    if (processorName == DATAMAPPER_ID_PREFIX) {
      return true;
    }

    const processorDefinition = CamelCatalogService.getComponent(CatalogKind.Processor, processorName);

    return Object.keys(processorDefinition?.properties ?? {}).includes('disabled');
  }

  static getComponentDefinitionFromUri(uri: string): { uri: string; parameters?: ParsedParameters } {
    const componentName = CamelComponentSchemaService.getComponentNameFromUri(uri);
    if (!componentName) return { uri: uri };

    const component = CamelCatalogService.getComponent(CatalogKind.Component, componentName);
    if (!component) {
      return { uri: uri };
    }

    const [path, query] = uri.split('?');
    const pathParams = CamelUriHelper.getParametersFromPathString(component?.component.syntax, path, {
      requiredParameters: component?.propertiesSchema.required as [],
    });

    const queryParams = CamelUriHelper.getParametersFromQueryString(query);
    return { uri: componentName, parameters: { ...pathParams, ...queryParams } };
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

    if (processorName === 'step' && isDataMapperNode(definition)) {
      return {
        processorName: DATAMAPPER_ID_PREFIX,
      };
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static readMultiValue(componentName: string, definition: any) {
    const catalogLookup = CamelCatalogService.getCatalogLookup(componentName);

    const multiValueParameters: Map<string, string> = new Map<string, string>();
    if (catalogLookup?.definition?.properties !== undefined) {
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

  /**
   * Nest flat multivalue parameters for model storage
   */
  static nestMultivalueParameters(
    componentName: string,
    flatParameters: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    if (!flatParameters) return {};
    const fakeDefinition = { parameters: cloneDeep(flatParameters) };
    this.readMultiValue(componentName, fakeDefinition);
    return fakeDefinition.parameters as Record<string, unknown>;
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
