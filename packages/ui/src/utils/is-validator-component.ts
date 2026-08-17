import { ProcessorDefinition } from '@kaoto/camel-catalog/types';

import { JSON_VALIDATOR_COMPONENT_NAME, VALIDATOR_COMPONENT_NAME } from './is-datamapper';
import type { ToObjectDef } from './is-to-processor';
import { isToProcessor } from './is-to-processor';

export type ValidatorComponentDef = ToObjectDef & { to: { uri: string } };

export const isValidatorComponent = (toDefinition: ProcessorDefinition): toDefinition is ValidatorComponentDef => {
  if (!isToProcessor(toDefinition)) {
    return false;
  }

  return toDefinition.to.uri?.startsWith(VALIDATOR_COMPONENT_NAME) ?? false;
};

export const isJsonValidatorComponent = (toDefinition: ProcessorDefinition): toDefinition is ValidatorComponentDef => {
  if (!isToProcessor(toDefinition)) {
    return false;
  }

  return toDefinition.to.uri?.startsWith(JSON_VALIDATOR_COMPONENT_NAME) ?? false;
};
