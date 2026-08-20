import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { cloneDeep } from 'lodash';

import { CamelUriHelper, DATAMAPPER_ID_PREFIX, ParsedParameters } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { REST_DSL_VERBS } from '../../../special-processors.constants';
import { IVisualizationNodeIds } from '../../base-visual-entity';
import { IClipboardContent } from '../../clipboard';
import { CamelCatalogService } from '../camel-catalog.service';
import { CamelProcessorStepsProperties } from './camel-component-types';

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
  static getNodeDefinitionValue(clipboardContent: IClipboardContent): ProcessorDefinition {
    const { name, definition: defaultValue } = clipboardContent;

    if (this.SPECIAL_CHILD_PROCESSORS.includes(name)) {
      return defaultValue as ProcessorDefinition;
    } else {
      return { [name]: defaultValue } as ProcessorDefinition;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getUpdatedDefinition(ids: IVisualizationNodeIds | undefined, definition: any) {
    /** Clone the original definition since we want to preserve the original one, until the form is changed */
    let updatedDefinition = cloneDeep(definition);

    const processorName = ids?.primaryNodeId?.name;
    const componentName =
      ids?.secondaryNodeId?.name === 'kamelet' && ids?.tertiaryNodeId?.name !== undefined
        ? `kamelet:${ids.tertiaryNodeId.name}`
        : ids?.secondaryNodeId?.name;

    if (processorName !== undefined) {
      const prop = this.PROCESSOR_STRING_DEFINITIONS[processorName];
      if (prop && typeof definition === 'string') {
        updatedDefinition = { [prop]: definition };
      }
    }

    if (componentName !== undefined) {
      if (updatedDefinition == null) {
        return updatedDefinition;
      }
      updatedDefinition.parameters = updatedDefinition.parameters ?? {};
      this.applyParametersFromSyntax(componentName, updatedDefinition);
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
