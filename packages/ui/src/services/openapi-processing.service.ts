import { OpenApi, OpenApiOperation, OpenApiPath } from 'openapi-v3';

import { REST_DSL_VERBS } from '../models/special-processors.constants';
import { ImportOperation } from '../pages/RestDslImport/RestDslImportTypes';

/**
 * Service for processing OpenAPI specifications and converting them to Camel REST DSL format.
 *
 * This service provides utilities for:
 * - Parsing OpenAPI specs into ImportOperation objects
 * - Building Camel REST definitions from operations
 * - Managing operation selection state
 * - Tracking which operations have existing routes
 */
export class OpenApiProcessingService {
  private static readonly SUCCESS_STATUS_CODE_REGEX = /^2\d\d$/;

  /**
   * Builds a list of ImportOperation objects from an OpenAPI specification.
   *
   * Iterates through all paths and REST verbs (GET, POST, PUT, DELETE, PATCH, HEAD),
   * extracting operation details including parameters, security, and response information.
   *
   * @param spec - The OpenAPI specification object
   * @returns Array of ImportOperation objects, empty if spec has no paths
   */
  static buildOperationsFromSpec(spec: OpenApi): ImportOperation[] {
    const operations: ImportOperation[] = [];
    const paths = spec.paths;
    if (!paths) return operations;

    /**
     * Each path contains a set of get, post, etc operations
     * {
     *   "/hello": {
     *     "get": {}
     *     "post": {}
     *   }
     * }
     */
    Object.entries(paths).forEach(([pathKey, definition]) => {
      if (!definition || typeof definition !== 'object') return;
      REST_DSL_VERBS.forEach((method) => {
        const op = definition[method as keyof Pick<OpenApiPath, 'get' | 'put' | 'post' | 'delete' | 'patch' | 'head'>];
        if (!op) return;

        const operationId = op.operationId ?? `${method}-${pathKey}`;
        const description = op.description ?? op.summary;
        const requestBodyContent = (op.requestBody as { content?: Record<string, unknown> } | undefined)?.content;
        const consumes = requestBodyContent ? Object.keys(requestBodyContent).join(',') : undefined;

        const responseEntries = Object.entries((op.responses as Record<string, unknown> | undefined) ?? {});
        const successResponse = responseEntries.find(([statusCode]) =>
          OpenApiProcessingService.SUCCESS_STATUS_CODE_REGEX.test(statusCode),
        )?.[1] as { content?: Record<string, unknown> } | undefined;
        const fallbackResponse = responseEntries[0]?.[1] as { content?: Record<string, unknown> } | undefined;
        const responseContent = successResponse?.content ?? fallbackResponse?.content;
        const produces = responseContent ? Object.keys(responseContent).join(',') : undefined;
        const param = OpenApiProcessingService.buildCamelParamList(definition, op);
        const security = OpenApiProcessingService.buildCamelSecurityList(op);
        const responseMessage = OpenApiProcessingService.buildCamelResponseMessageList(op);
        const deprecated = typeof op.deprecated === 'boolean' ? op.deprecated : undefined;

        operations.push({
          operationId,
          method,
          path: pathKey,
          description,
          consumes,
          produces,
          param,
          security,
          responseMessage,
          deprecated,
          selected: true,
          routeExists: false,
        });
      });
    });

    return operations;
  }

  /**
   * Builds a Camel REST definition from a list of operations.
   *
   * Groups operations by HTTP method and formats them according to Camel REST DSL schema.
   * Includes optional OpenAPI specification reference if sourceIdentifier is provided.
   *
   * @param operations - Array of ImportOperation objects to include in the REST definition
   * @param restId - Unique identifier for the REST definition
   * @param sourceIdentifier - Optional source identifier (file path or URI) for the OpenAPI spec
   * @returns Camel REST definition object with operations grouped by HTTP method
   */
  static buildRestDefinitionFromOperations(
    operations: ImportOperation[],
    restId: string,
    sourceIdentifier: string,
  ): Record<string, unknown> {
    const restDefinition: Record<string, unknown> = { id: restId };
    const trimmedIdentifier = sourceIdentifier.trim();
    if (trimmedIdentifier) {
      restDefinition.openApi = { specification: trimmedIdentifier };
    }

    operations.forEach((operation) => {
      const methodKey = operation.method;
      const list = (restDefinition[methodKey] as Record<string, unknown>[] | undefined) ?? [];
      const operationDefinition: Record<string, unknown> = {
        id: operation.operationId,
        path: operation.path,
        routeId: `route-${operation.operationId}`,
        to: `direct:${operation.operationId}`,
      };
      const operationDescription = operation.description?.trim();
      if (operationDescription) {
        operationDefinition.description = operationDescription;
      }
      const operationConsumes = operation.consumes?.trim();
      if (operationConsumes) {
        operationDefinition.consumes = operationConsumes;
      }
      const operationProduces = operation.produces?.trim();
      if (operationProduces) {
        operationDefinition.produces = operationProduces;
      }
      if (operation.param && operation.param.length > 0) {
        operationDefinition.param = operation.param;
      }
      if (operation.responseMessage && operation.responseMessage.length > 0) {
        operationDefinition.responseMessage = operation.responseMessage;
      }
      if (operation.security && operation.security.length > 0) {
        operationDefinition.security = operation.security;
      }
      if (typeof operation.deprecated === 'boolean') {
        operationDefinition.deprecated = operation.deprecated;
      }
      list.push(operationDefinition);
      restDefinition[methodKey] = list;
    });

    return restDefinition;
  }

  /**
   * Generates a unique key for an operation based on operationId, method, and path.
   *
   * @param operation - Operation object with operationId, method, and path properties
   * @returns Unique operation key in format "operationId-method-path"
   */
  static getOperationKey(operation: Pick<ImportOperation, 'operationId' | 'method' | 'path'>): string {
    return `${operation.operationId}-${operation.method}-${operation.path}`;
  }

  /**
   * Marks operations that have existing routes based on route names.
   *
   * An operation is considered to have an existing route if its operationId matches
   * a route name in the provided set.
   *
   * @param operations - Array of operations to check
   * @param routeNames - Set of existing route names (extracted from direct: URIs)
   * @returns New array with routeExists flag updated for each operation
   */
  static applyRouteExistsToOperations(operations: ImportOperation[], routeNames: Set<string>): ImportOperation[] {
    return operations.map((operation) => ({
      ...operation,
      routeExists: routeNames.has(operation.operationId),
    }));
  }

  /**
   * Updates the selected state for all operations based on the checked flag.
   *
   * Operations with existing routes (routeExists: true) remain unselected regardless
   * of the checked value to prevent duplicate route creation.
   *
   * @param operations - Array of operations to update
   * @param checked - Whether to select (true) or deselect (false) operations
   * @returns New array with updated selection state
   */
  static toggleSelectAllOperations(operations: ImportOperation[], checked: boolean): ImportOperation[] {
    return operations.map((operation) => ({
      ...operation,
      selected: operation.routeExists ? false : checked,
    }));
  }

  /**
   * Maps an OpenAPI parameter to Camel REST DSL parameter format.
   *
   * @param parameter - OpenAPI parameter object
   * @returns Camel parameter object or undefined if parameter is invalid
   */
  private static mapOpenApiParameterToCamelParam(
    parameter: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const name = typeof parameter.name === 'string' ? parameter.name : undefined;
    const location = typeof parameter.in === 'string' ? parameter.in : undefined;
    if (!name || !location) return undefined;

    const schema = (parameter.schema as Record<string, unknown> | undefined) ?? {};
    const mapped: Record<string, unknown> = {
      name,
      type: location,
    };

    if (typeof parameter.required === 'boolean') {
      mapped.required = parameter.required;
    }
    if (typeof parameter.description === 'string' && parameter.description.trim()) {
      mapped.description = parameter.description;
    }
    if (typeof schema.type === 'string') {
      mapped.dataType = schema.type;
    }
    if ('default' in schema) {
      mapped.defaultValue = schema.default;
    }

    const enumValues = Array.isArray(schema.enum) ? schema.enum : undefined;
    if (enumValues?.length) {
      mapped.allowableValues = enumValues.map((value) => ({ value: String(value) }));
    }

    return mapped;
  }

  /**
   * Builds a merged list of Camel parameters from path-level and operation-level parameters.
   *
   * Operation-level parameters override path-level parameters with the same name and location.
   *
   * @param pathItem - OpenAPI path item containing path-level parameters
   * @param operation - OpenAPI operation containing operation-level parameters
   * @returns Array of Camel parameter objects
   */
  private static buildCamelParamList(pathItem: OpenApiPath, operation: OpenApiOperation): Record<string, unknown>[] {
    const merged = new Map<string, Record<string, unknown>>();
    const addParameters = (parameters: unknown) => {
      if (!Array.isArray(parameters)) return;
      parameters.forEach((parameter) => {
        if (!parameter || typeof parameter !== 'object') return;
        const asRecord = parameter as Record<string, unknown>;
        const name = typeof asRecord.name === 'string' ? asRecord.name : '';
        const location = typeof asRecord.in === 'string' ? asRecord.in : '';
        if (!name || !location) return;
        merged.set(`${location}:${name}`, asRecord);
      });
    };

    addParameters(pathItem.parameters);
    addParameters(operation.parameters);

    return Array.from(merged.values())
      .map(OpenApiProcessingService.mapOpenApiParameterToCamelParam)
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  /**
   * Builds a list of Camel security requirements from OpenAPI operation security.
   *
   * @param operation - OpenAPI operation containing security requirements
   * @returns Array of Camel security objects with key and optional scopes
   */
  private static buildCamelSecurityList(operation: OpenApiOperation): Record<string, unknown>[] {
    const security = operation.security;
    if (!Array.isArray(security)) return [];

    const mapped: Record<string, unknown>[] = [];
    security.forEach((securityRequirement) => {
      if (!securityRequirement || typeof securityRequirement !== 'object') return;
      Object.entries(securityRequirement as Record<string, unknown>).forEach(([key, value]) => {
        const scopes = Array.isArray(value) ? value.map(String).join(',') : '';
        mapped.push(scopes ? { key, scopes } : { key });
      });
    });

    return mapped;
  }

  /**
   * Builds a list of Camel response messages from OpenAPI operation responses.
   *
   * Includes response code, message (description), and optional headers with allowable values.
   *
   * @param operation - OpenAPI operation containing response definitions
   * @returns Array of Camel response message objects
   */
  private static buildCamelResponseMessageList(operation: OpenApiOperation): Record<string, unknown>[] {
    const responses = operation.responses as Record<string, unknown> | undefined;
    if (!responses || typeof responses !== 'object') return [];

    return Object.entries(responses).map(([code, response]) => {
      const responseRecord = (response as Record<string, unknown> | undefined) ?? {};
      const mapped: Record<string, unknown> = { code: String(code) };

      if (typeof responseRecord.description === 'string' && responseRecord.description.trim()) {
        mapped.message = responseRecord.description;
      }

      const headers = responseRecord.headers as Record<string, unknown> | undefined;
      if (headers && typeof headers === 'object') {
        const mappedHeaders = Object.entries(headers)
          .map(([name, headerValue]) => {
            const headerRecord = (headerValue as Record<string, unknown> | undefined) ?? {};
            const schema = (headerRecord.schema as Record<string, unknown> | undefined) ?? {};
            const mappedHeader: Record<string, unknown> = { name };
            if (typeof headerRecord.description === 'string' && headerRecord.description.trim()) {
              mappedHeader.description = headerRecord.description;
            }
            const enumValues = Array.isArray(schema.enum) ? schema.enum : undefined;
            if (enumValues?.length) {
              mappedHeader.allowableValues = enumValues.map((value) => ({ value: String(value) }));
            }
            return mappedHeader;
          })
          .filter((header) => Boolean(header.name));

        if (mappedHeaders.length > 0) {
          mapped.header = mappedHeaders;
        }
      }

      return mapped;
    });
  }
}
