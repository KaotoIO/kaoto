import {
  FromDefinition as CamelFromDefinition,
  RouteDefinition as CamelRouteDefinition,
  ProcessorDefinition,
} from '@kaoto-next/camel-catalog/types';

export interface RouteDefinition extends Omit<CamelRouteDefinition, 'from'> {
  from: FromDefinition;
}

export interface FromDefinition extends Omit<CamelFromDefinition, 'steps'> {
  steps: CamelRouteStep[];
}

export type CamelRouteStep = ProcessorDefinition;
