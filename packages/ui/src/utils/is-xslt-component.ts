import { ProcessorDefinition } from '@kaoto/camel-catalog/types';
import { XSLT_COMPONENT_NAME } from './is-datamapper';
import type { ToObjectDef } from './is-to-processor';
import { isToProcessor } from './is-to-processor';

export type XsltComponentDef = ToObjectDef & { to: { uri: string } };

export const isXSLTComponent = (toDefinition: ProcessorDefinition): toDefinition is XsltComponentDef => {
  if (!isToProcessor(toDefinition)) {
    return false;
  }

  return toDefinition.to.uri?.startsWith(XSLT_COMPONENT_NAME) ?? false;
};
