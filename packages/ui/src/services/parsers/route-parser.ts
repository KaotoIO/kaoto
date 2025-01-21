import { CamelRouteVisualEntity } from '../../models';
import {
  ErrorHandler,
  Intercept,
  InterceptFrom,
  InterceptSendToEndpoint,
  OnCompletion,
  OnException,
  ProcessorDefinition,
} from '@kaoto/camel-catalog/types';
import { CommonParser } from './common-parser';
import { CamelRouteConfigurationVisualEntity } from '../../models/visualization/flows/camel-route-configuration-visual-entity';
import { CamelErrorHandlerVisualEntity } from '../../models/visualization/flows/camel-error-handler-visual-entity';
import { CamelInterceptVisualEntity } from '../../models/visualization/flows/camel-intercept-visual-entity';
import { CamelInterceptFromVisualEntity } from '../../models/visualization/flows/camel-intercept-from-visual-entity';
import { CamelInterceptSendToEndpointVisualEntity } from '../../models/visualization/flows/camel-intercept-send-to-endpoint-visual-entity';
import { CamelOnCompletionVisualEntity } from '../../models/visualization/flows/camel-on-completion-visual-entity';
import { CamelOnExceptionVisualEntity } from '../../models/visualization/flows/camel-on-exception-visual-entity';
import { HeadingLevel, ParsedTable } from '../../models/documentation';

type ObjectWithSteps = {
  id?: string;
  steps?: ProcessorDefinition[];
  [p: string]: unknown;
};

export class RouteParser {
  static readonly HEADERS_STEP_PARAMETER: ReadonlyArray<string> = ['Step ID', 'Step', 'URI', 'Parameter Name', 'Value'];
  static readonly HEADERS_OBJECT_WITH_STEPS: ReadonlyArray<string> = ['ID', ...RouteParser.HEADERS_STEP_PARAMETER];

  static parseRouteEntity(entity: CamelRouteVisualEntity): ParsedTable {
    const routeDefinition = entity.entityDef.route;
    const parameterTable: ParsedTable = new ParsedTable({
      title: routeDefinition.id,
      description: routeDefinition.description,
      headers: RouteParser.HEADERS_STEP_PARAMETER,
    });

    const routeParameters = CommonParser.parseParameters(routeDefinition, ['from', 'id', 'description']);
    Object.entries(routeParameters).forEach(([key, value]) => parameterTable.data.push(['', '', '', key, value]));

    const routeSteps = CommonParser.parseFrom(routeDefinition.from);
    routeSteps.forEach((step) => {
      const paramWithDesc = step.description ? { description: step.description } : {};
      step.parameters && Object.assign(paramWithDesc, step.parameters);
      if (Object.keys(paramWithDesc).length === 0) {
        parameterTable.data.push([step.id, step.name, step.uri, '', '']);
        return;
      }
      Object.entries(paramWithDesc).forEach(([paramKey, paramValue], index) => {
        parameterTable.data.push([
          index === 0 ? step.id : '',
          index === 0 ? step.name : '',
          index === 0 ? step.uri : '',
          paramKey,
          paramValue,
        ]);
      });
    });
    return parameterTable;
  }

  static parseErrorHandlerEntity(entity: CamelErrorHandlerVisualEntity): ParsedTable | undefined {
    return RouteParser.doParseErrorHandler(entity.errorHandlerDef, 'h1', entity.id);
  }

  private static doParseErrorHandler(
    errorHandler: ErrorHandler,
    level: HeadingLevel,
    id?: string,
  ): ParsedTable | undefined {
    if (Object.keys(errorHandler).length === 0) return;

    const [errorHandlerName, errorHandlerObj] = Object.entries(errorHandler)[0];

    const parsedTable = new ParsedTable({
      headingLevel: level,
      title: id ?? errorHandlerName,
      headers: ['Parameter Name', 'Parameter Value'],
    });
    const parameters = CommonParser.parseParameters(errorHandlerObj as Record<string, unknown>);
    Object.entries(parameters).forEach(([propKey, propValue]) => parsedTable.data.push([propKey, propValue]));
    return parsedTable;
  }

  static parseInterceptEntity(entity: CamelInterceptVisualEntity): ParsedTable | undefined {
    return RouteParser.doParseIntercept(entity.interceptDef.intercept, 'h1');
  }

  private static doParseIntercept(
    intercept: Intercept | { intercept?: Intercept }[],
    level: HeadingLevel,
  ): ParsedTable | undefined {
    const interceptArray: Intercept[] = Array.isArray(intercept)
      ? intercept.reduce((acc, item) => {
          item.intercept && acc.push(item.intercept);
          return acc;
        }, [] as Intercept[])
      : [intercept];

    if (interceptArray.length === 0) return;

    const parsedTable = new ParsedTable({
      headingLevel: level,
      title: 'Intercept',
      headers: RouteParser.HEADERS_OBJECT_WITH_STEPS,
    });

    interceptArray.forEach((intercept) =>
      RouteParser.populateObjectWithSteps(parsedTable, intercept as ObjectWithSteps),
    );

    return parsedTable;
  }

  private static populateObjectWithSteps(parsedTable: ParsedTable, model: ObjectWithSteps) {
    const parsedParams = CommonParser.parseParameters(model, ['id', 'steps']);
    const objectParamsLength = Object.keys(parsedParams).length;
    objectParamsLength !== 0 &&
      Object.entries(parsedParams).forEach(([paramKey, paramValue], index) =>
        parsedTable.data.push([index === 0 && model.id ? model.id : '', '', '', '', paramKey, paramValue]),
      );
    const parsedSteps = model.steps && CommonParser.parseSteps(model.steps);
    if (!parsedParams && (!parsedSteps || parsedSteps.length === 0)) {
      parsedTable.data.push([model.id ?? '', '', '', '', '', '']);
      return;
    }
    parsedSteps &&
      parsedSteps.forEach((step, stepIndex) => {
        const paramsWithDesc = step.description ? { description: step.description } : {};
        step.parameters && Object.assign(paramsWithDesc, step.parameters);
        if (Object.keys(paramsWithDesc).length === 0) {
          parsedTable.data.push([
            objectParamsLength === 0 && stepIndex === 0 && model.id ? model.id : '',
            step.id,
            step.name,
            step.uri,
            '',
            '',
          ]);
          return;
        }
        Object.entries(paramsWithDesc).forEach(([paramKey, paramValue], paramIndex) =>
          parsedTable.data.push([
            objectParamsLength === 0 && stepIndex === 0 && paramIndex === 0 && model.id ? model.id : '',
            paramIndex === 0 ? step.id : '',
            paramIndex === 0 ? step.name : '',
            paramIndex === 0 ? step.uri : '',
            paramKey,
            paramValue,
          ]),
        );
      });
  }

  static parseInterceptFromEntity(entity: CamelInterceptFromVisualEntity): ParsedTable | undefined {
    return RouteParser.doParseInterceptFrom(entity.interceptFromDef.interceptFrom, 'h1', entity.id);
  }

  private static doParseInterceptFrom(
    interceptFrom: InterceptFrom | { interceptFrom?: InterceptFrom }[],
    level: HeadingLevel,
    id?: string,
  ): ParsedTable | undefined {
    const interceptFromArray: InterceptFrom[] = Array.isArray(interceptFrom)
      ? interceptFrom.reduce((acc, item) => {
          item.interceptFrom && acc.push(item.interceptFrom);
          return acc;
        }, [] as InterceptFrom[])
      : [interceptFrom];
    if (interceptFromArray.length === 0) return;

    const parsedTable = new ParsedTable({
      headingLevel: level,
      title: id ?? 'Intercept From',
      headers: RouteParser.HEADERS_OBJECT_WITH_STEPS,
    });

    interceptFromArray.forEach((interceptFrom) => RouteParser.populateUriOrObjectWithSteps(parsedTable, interceptFrom));

    return parsedTable;
  }

  private static populateUriOrObjectWithSteps(parsedTable: ParsedTable, model: string | ObjectWithSteps) {
    if (typeof model === 'string') {
      parsedTable.data.push(['', '', '', '', 'uri', model]);
    } else {
      RouteParser.populateObjectWithSteps(parsedTable, model);
    }
  }

  static parseInterceptSendToEndpointEntity(entity: CamelInterceptSendToEndpointVisualEntity): ParsedTable | undefined {
    return RouteParser.doParseInterceptSendToEndpoint(entity.interceptSendToEndpointDef.interceptSendToEndpoint, 'h1');
  }

  private static doParseInterceptSendToEndpoint(
    interceptSendToEndpoint: InterceptSendToEndpoint | { interceptSendToEndpoint?: InterceptSendToEndpoint }[],
    level: HeadingLevel,
  ): ParsedTable | undefined {
    const interceptSendToEndpointArray: InterceptSendToEndpoint[] = Array.isArray(interceptSendToEndpoint)
      ? interceptSendToEndpoint.reduce((acc, item) => {
          item.interceptSendToEndpoint && acc.push(item.interceptSendToEndpoint);
          return acc;
        }, [] as InterceptFrom[])
      : [interceptSendToEndpoint];
    if (interceptSendToEndpointArray.length === 0) return;

    const parsedTable = new ParsedTable({
      headingLevel: level,
      title: 'Intercept Send To Endpoint',
      headers: RouteParser.HEADERS_OBJECT_WITH_STEPS,
    });

    interceptSendToEndpointArray.forEach((interceptSendToEndpoint) =>
      RouteParser.populateUriOrObjectWithSteps(parsedTable, interceptSendToEndpoint),
    );

    return parsedTable;
  }

  static parseOnCompletionEntity(entity: CamelOnCompletionVisualEntity): ParsedTable | undefined {
    return RouteParser.doParseOnCompletion(entity.onCompletionDef.onCompletion, 'h1', entity.id);
  }

  private static doParseOnCompletion(
    onCompletion: OnCompletion | { onCompletion?: OnCompletion }[],
    level: HeadingLevel,
    id?: string,
  ): ParsedTable | undefined {
    const onCompletionArray: OnCompletion[] = Array.isArray(onCompletion)
      ? onCompletion.reduce((acc, item) => {
          item.onCompletion && acc.push(item.onCompletion);
          return acc;
        }, [] as OnCompletion[])
      : [onCompletion];
    if (onCompletionArray.length === 0) return;

    const parsedTable = new ParsedTable({
      headingLevel: level,
      title: id ?? 'On Completion',
      headers: RouteParser.HEADERS_OBJECT_WITH_STEPS,
    });

    onCompletionArray.forEach((onCompletion) =>
      RouteParser.populateObjectWithSteps(parsedTable, onCompletion as ObjectWithSteps),
    );

    return parsedTable;
  }

  static parseOnExceptionEntity(entity: CamelOnExceptionVisualEntity): ParsedTable | undefined {
    return RouteParser.doParseOnException(entity.onExceptionDef.onException, 'h1', entity.id);
  }

  private static doParseOnException(
    onException: OnException | { onException?: OnException }[],
    level: HeadingLevel,
    id?: string,
  ): ParsedTable | undefined {
    const onExceptionArray: OnException[] = Array.isArray(onException)
      ? onException.reduce((acc, item) => {
          item.onException && acc.push(item.onException);
          return acc;
        }, [] as OnException[])
      : [onException];
    if (onExceptionArray.length === 0) return;

    const parsedTable = new ParsedTable({
      headingLevel: level,
      title: id ?? 'On Exception',
      headers: RouteParser.HEADERS_OBJECT_WITH_STEPS,
    });

    onExceptionArray.forEach((onException) =>
      RouteParser.populateObjectWithSteps(parsedTable, onException as ObjectWithSteps),
    );

    return parsedTable;
  }

  static parseRouteConfigurationEntity(entity: CamelRouteConfigurationVisualEntity): ParsedTable[] {
    const answer: ParsedTable[] = [];
    const routeConfiguration = entity.routeConfigurationDef.routeConfiguration;
    answer.push(
      new ParsedTable({
        title: routeConfiguration.id,
        description: routeConfiguration.description,
        headers: ['Parameter Name', 'Parameter Value'],
        data: routeConfiguration.precondition ? [['Precondition', routeConfiguration.precondition]] : [],
      }),
    );

    if (routeConfiguration.errorHandler) {
      const parsed = RouteParser.doParseErrorHandler(routeConfiguration.errorHandler, 'h2');
      parsed && answer.push(parsed);
    }
    if (routeConfiguration.intercept) {
      const parsed = RouteParser.doParseIntercept(routeConfiguration.intercept, 'h2');
      parsed && answer.push(parsed);
    }
    if (routeConfiguration.interceptFrom) {
      const parsed = RouteParser.doParseInterceptFrom(routeConfiguration.interceptFrom, 'h2');
      parsed && answer.push(parsed);
    }
    if (routeConfiguration.interceptSendToEndpoint) {
      const parsed = RouteParser.doParseInterceptSendToEndpoint(routeConfiguration.interceptSendToEndpoint, 'h2');
      parsed && answer.push(parsed);
    }
    if (routeConfiguration.onCompletion) {
      const parsed = RouteParser.doParseOnCompletion(routeConfiguration.onCompletion, 'h2');
      parsed && answer.push(parsed);
    }
    if (routeConfiguration.onException) {
      const parsed = RouteParser.doParseOnException(routeConfiguration.onException, 'h2');
      parsed && answer.push(parsed);
    }

    return answer;
  }
}
