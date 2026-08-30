import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { DATAMAPPER_ID_PREFIX } from '../../../../utils';
import { CatalogKind } from '../../../catalog-kind';
import { REST_DSL_VERBS } from '../../../special-processors.constants';
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

  static canBeDisabled(processorName: keyof ProcessorDefinition): boolean {
    if (processorName == DATAMAPPER_ID_PREFIX) {
      return true;
    }

    const processorDefinition = CamelCatalogService.getComponent(CatalogKind.Processor, processorName);

    return Object.keys(processorDefinition?.properties ?? {}).includes('disabled');
  }
}
