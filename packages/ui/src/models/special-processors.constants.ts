import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

export const REST_ELEMENT_NAME = 'rest' as keyof ProcessorDefinition;

export const REST_DSL_VERBS = ['get', 'post', 'put', 'delete', 'patch', 'head'];

/**
 * Map of processor names and their special children.
 * This is used to determine which special child processors can be added to a parent processor.
 */
export const SPECIAL_PROCESSORS_PARENTS_MAP = {
  circuitBreaker: ['onFallback'],
  choice: ['when', 'otherwise'],
  doTry: ['doCatch', 'doFinally'],
  routeConfiguration: ['intercept', 'interceptFrom', 'interceptSendToEndpoint', 'onException', 'onCompletion'],
  rest: REST_DSL_VERBS,
} as const;
