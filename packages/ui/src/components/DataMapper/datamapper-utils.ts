import { ProcessorDefinition, Step, To } from '@kaoto/camel-catalog/types';

import { XSLT_COMPONENT_NAME } from '../../utils';

/**
 * Find an XSLT step inside the DataMapper steps array. Note that this assumes that the XSLT step is only one
 * in the DataMapper step. In case we add more XSLT execution in a single DataMapper step, we have to update this.
 * @param dataMapperSteps
 */
export const findXsltStep = (dataMapperSteps: ProcessorDefinition[]): To | undefined => {
  const xsltStep = dataMapperSteps.find(
    (step) => typeof step.to === 'object' && step.to?.uri?.startsWith(XSLT_COMPONENT_NAME),
  );
  return xsltStep?.to;
};

export const setXsltUri = (dataMapperStepDef: Step, xsltPath = ''): void => {
  const steps = dataMapperStepDef.steps;
  if (steps && steps.length > 0) {
    const toStep = findXsltStep(steps);
    if (toStep && typeof toStep === 'object') {
      toStep.uri = `${XSLT_COMPONENT_NAME}:${xsltPath}`;
    }
  }
};

export const clearXsltUri = (dataMapperStepDef: Step): void => {
  setXsltUri(dataMapperStepDef, '');
};
