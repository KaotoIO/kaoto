import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import {
  DISABLED_SIBLING_STEPS,
  SPECIAL_PROCESSORS_PARENTS_MAP,
} from '../../../../models/special-processors.constants';
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
const CAMEL_REST_VERB_STEP_PROPERTIES: CamelProcessorStepsProperties[] = [{ name: 'to', type: 'single-clause' }];

export class ProcessorStepsService {
  static canHavePreviousStep(processorName: keyof ProcessorDefinition): boolean {
    return !(DISABLED_SIBLING_STEPS as readonly string[]).includes(processorName as string);
  }

  static canReplaceStep(processorName: keyof ProcessorDefinition): boolean {
    return (
      processorName === ('from' as keyof ProcessorDefinition) ||
      !(DISABLED_SIBLING_STEPS as readonly string[]).includes(processorName as string)
    );
  }

  static getProcessorStepsProperties(processorName: keyof ProcessorDefinition): CamelProcessorStepsProperties[] {
    if ((SPECIAL_PROCESSORS_PARENTS_MAP.rest as readonly string[]).includes(processorName as string)) {
      return CAMEL_REST_VERB_STEP_PROPERTIES;
    }

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
        return SPECIAL_PROCESSORS_PARENTS_MAP.rest.map((method) => ({ name: method, type: 'array-clause' as const }));

      default:
        return [];
    }
  }
}
