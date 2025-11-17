import { FromDefinition, ProcessorDefinition, Step } from '@kaoto/camel-catalog/types';

import { ParsedStep } from '../../models/documentation';
import { isDataMapperNode, XSLT_COMPONENT_NAME } from '../../utils';

type ComponentDefinition = {
  id?: string;
  uri: string;
  description?: string;
  parameters?: { [p: string]: unknown };
};

type AnyProcessorDefinition =
  | string
  | {
      id?: string;
      description?: string;
      steps?: ProcessorDefinition[];
    };

export class CommonParser {
  static readonly EXCLUDED_COMPONENT_PROPERTIES: ReadonlyArray<string> = [];
  static readonly BRANCH_PROCESSORS: ReadonlyArray<string> = ['when', 'otherwise', 'doCatch', 'doFinally'];
  static readonly EXCLUDED_PROCESSOR_PROPERTIES: ReadonlyArray<string> = [
    'steps',
    'id',
    ...CommonParser.BRANCH_PROCESSORS,
  ];
  static readonly EXPRESSION_PARAMETERS: ReadonlyArray<string> = [
    'expression',
    'completionPredicate',
    'completionSizeExpression',
    'completionTimeoutExpression',
    'correlationExpression',
    'onWhen',
  ];

  static parseFrom(fromModel: FromDefinition) {
    const parsedSteps: ParsedStep[] = [];
    const parsedFrom = CommonParser.parseComponentStep('from', fromModel);
    parsedFrom && parsedSteps.push(parsedFrom);
    const parsedSubSteps = CommonParser.parseSteps(fromModel.steps);
    parsedSteps.push(...parsedSubSteps);
    return parsedSteps;
  }

  static parseSteps(stepsModel: ProcessorDefinition[]): ParsedStep[] {
    const parsedSteps: ParsedStep[] = [];
    stepsModel.forEach((step) => {
      const [stepType, stepModel] = Object.entries(step)[0];
      if (stepModel.uri) {
        const parsedStep = CommonParser.parseComponentStep(stepType, stepModel);
        parsedSteps.push(parsedStep);
        return;
      } else if (stepType === 'step' && isDataMapperNode(stepModel)) {
        const parsedStep = CommonParser.parseDataMapperStep(stepModel);
        parsedSteps.push(parsedStep);
        return;
      }

      const parsedStep = CommonParser.parseProcessorStep(stepType, stepModel);
      parsedSteps.push(parsedStep);
      if (stepModel.steps && stepModel.steps.length > 0) {
        const parsedSubSteps = CommonParser.parseSteps(stepModel.steps);
        parsedSteps.push(...parsedSubSteps);
      }
      const parsedBranches = CommonParser.parseBranches(stepModel);
      parsedSteps.push(...parsedBranches);
    });
    return parsedSteps;
  }

  private static parseBranches(stepModel: Record<string, unknown>): ParsedStep[] {
    const parsedSteps: ParsedStep[] = [];
    CommonParser.BRANCH_PROCESSORS.filter((b) => stepModel[b]).forEach((branchName) => {
      const branch = stepModel[branchName];
      if (Array.isArray(branch)) {
        branch.forEach((branchItem: Record<string, unknown>) => {
          const parsedBranch = CommonParser.parseProcessorStep(branchName, branchItem);
          parsedSteps.push(parsedBranch);
          if (Array.isArray(branchItem.steps) && branchItem.steps.length > 0) {
            const parsedSubSteps = CommonParser.parseSteps(branchItem.steps);
            parsedSteps.push(...parsedSubSteps);
          }
        });
      } else {
        const branchObj = branch as Record<string, unknown>;
        const parsedBranch = CommonParser.parseProcessorStep(branchName, branchObj);
        parsedSteps.push(parsedBranch);
        if (Array.isArray(branchObj.steps) && branchObj.steps.length > 0) {
          const parsedSubSteps = CommonParser.parseSteps(branchObj.steps);
          parsedSteps.push(...parsedSubSteps);
        }
      }
    });
    return parsedSteps;
  }

  private static parseDataMapperStep(stepDefinition: Step): ParsedStep {
    const xsltStep = stepDefinition.steps?.find((step) => {
      if (typeof step.to === 'string') {
        return step.to.startsWith(XSLT_COMPONENT_NAME);
      }
      return step.to?.uri?.startsWith(XSLT_COMPONENT_NAME);
    });
    const xsltFileName =
      typeof xsltStep?.to === 'string'
        ? xsltStep?.to?.substring(XSLT_COMPONENT_NAME.length + 1)
        : xsltStep?.to?.uri?.substring(XSLT_COMPONENT_NAME.length + 1);

    return new ParsedStep({
      id: stepDefinition.id,
      description: stepDefinition.description,
      uri: '',
      name: 'Kaoto DataMapper',
      parameters: { 'XSLT file name': xsltFileName || '' },
    });
  }

  static parseComponentStep(stepType: string, stepModel: ComponentDefinition): ParsedStep {
    const parsedStep = new ParsedStep({
      id: stepModel.id,
      name: stepType,
      uri: stepModel.uri,
      description: stepModel.description,
    });
    if (stepModel.parameters) {
      parsedStep.parameters = CommonParser.parseParameters(
        stepModel.parameters,
        CommonParser.EXCLUDED_COMPONENT_PROPERTIES,
      );
    }
    return parsedStep;
  }

  static parseProcessorStep(processorType: string, processorModel: AnyProcessorDefinition): ParsedStep {
    if (typeof processorModel === 'string') {
      return new ParsedStep({
        id: '',
        name: processorType,
        uri: processorModel,
      });
    }
    const parsedStep = new ParsedStep({
      id: processorModel.id,
      name: processorType,
      uri: '',
      description: processorModel.description,
    });
    const filteredParameters = Object.fromEntries(
      Object.entries(processorModel).filter(([key]) => !CommonParser.EXCLUDED_PROCESSOR_PROPERTIES.includes(key)),
    );

    const parsedParameters = CommonParser.parseParameters(
      filteredParameters,
      CommonParser.EXCLUDED_PROCESSOR_PROPERTIES,
    );
    Object.entries(parsedParameters).forEach(([key, value]) => (parsedStep.parameters[key] = value));
    return parsedStep;
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any */
  static parseParameters(
    model?: Record<string, any>,
    excluded: ReadonlyArray<string> = [],
    prefix?: string,
  ): Record<string, string> {
    const answer: Record<string, string> = {};
    if (!model) return answer;
    Object.entries(model)
      .filter(([key]) => !excluded.includes(key))
      .forEach(([key, value]) => {
        if (typeof value !== 'object') {
          answer[prefix ? `${prefix}.${key}` : key] = value;
          return;
        }
        if (CommonParser.EXPRESSION_PARAMETERS.includes(key)) {
          const expressionType = Object.keys(value)[0];
          answer[`${key} (${expressionType})`] = value[expressionType].expression;
          return;
        }
        if (Array.isArray(value)) {
          if (value.length > 0 && typeof value[0] === 'string') {
            answer[prefix ? `${prefix}.${key}` : key] = value.join(', ');
            return;
          }
        }
        const objParams = CommonParser.parseParameters(value, excluded, prefix ? prefix + '.' + key : key);
        Object.assign(answer, objParams);
      });
    return answer;
  }
}
