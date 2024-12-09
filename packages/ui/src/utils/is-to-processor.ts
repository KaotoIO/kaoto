import { ProcessorDefinition, To } from '@kaoto/camel-catalog/types';
import { isDefined } from './is-defined';

export type ToObjectDef = { to: Exclude<To, string> };

export const isToProcessor = (toDefinition: ProcessorDefinition): toDefinition is ToObjectDef => {
  const doesHaveTo = 'to' in toDefinition;
  const isStringBased = typeof toDefinition.to === 'string';

  return doesHaveTo && !isStringBased && isDefined(toDefinition.to);
};
