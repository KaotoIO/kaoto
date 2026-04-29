import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

export const REST_ELEMENT_NAME = 'rest' as keyof ProcessorDefinition;

export type RestMethods = 'get' | 'head' | 'post' | 'put' | 'patch' | 'delete';
export const REST_DSL_VERBS: RestMethods[] = ['get', 'post', 'put', 'delete', 'patch', 'head'];

/**
 * Processors that have icon overlays in the visualization.
 * These processors display special icons to indicate their purpose.
 */
export const PROCESSORS_WITH_ICONS = ['from', 'to', 'toD', 'poll'] as const;

/**
 * Processors with icons used in ComponentMode (excludes 'from').
 * These are the processors that can be toggled in the component mode switcher.
 */
export const COMPONENT_MODE_PROCESSORS = ['to', 'toD', 'poll'] as const;

/**
 * Display prefixes for processors with icon overlays.
 * Used for formatting tooltip text.
 */
export const PROCESSOR_ICON_PREFIXES: Record<(typeof PROCESSORS_WITH_ICONS)[number], string> = {
  from: 'From',
  to: 'To',
  toD: 'ToD',
  poll: 'Poll',
} as const;

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
