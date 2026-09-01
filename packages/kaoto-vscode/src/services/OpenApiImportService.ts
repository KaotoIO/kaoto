import type {
	FromDefinition,
	Param1,
	ProcessorDefinition,
	ResponseHeader,
	ResponseMessage1,
	Rest,
	RestSecurity,
	RouteDefinition,
	Type5,
} from '@kaoto/camel-catalog/types';
import type {
	OpenApi,
	OpenApiHeader,
	OpenApiMap,
	OpenApiMediaType,
	OpenApiParameter,
	OpenApiPaths,
	OpenApiReference,
	OpenApiRequestBody,
	OpenApiResponse,
	OpenApiResponses,
	OpenApiSchema,
	OpenApiSecurityRequirement,
} from 'openapi-v3';
import { parse, stringify } from 'yaml';

/**
 * Utility type to flatten array types.
 */
export type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;

/**
 * REST HTTP methods supported by Camel REST DSL.
 */
export type RestMethods = 'get' | 'head' | 'post' | 'put' | 'patch' | 'delete';

/**
 * Union type of all REST method definition types.
 */
export type RestMethodDefinitions =
	| Flatten<Rest['get']>
	| Flatten<Rest['head']>
	| Flatten<Rest['post']>
	| Flatten<Rest['put']>
	| Flatten<Rest['patch']>
	| Flatten<Rest['delete']>;

/**
 * Array of supported REST DSL verbs.
 */
export const REST_DSL_VERBS: RestMethods[] = ['get', 'post', 'put', 'delete', 'patch', 'head'];

/**
 * Configuration options for OpenAPI import process.
 */
export interface OpenApiImportOptions {
	/**
	 * Whether to generate a REST definition from the OpenAPI spec.
	 * Default: false
	 */
	shouldGenerateRest?: boolean;

	/**
	 * Whether to generate RouteDefinition entities for each operation.
	 * Default: true
	 */
	shouldGenerateRoutes?: boolean;

	/**
	 * Optional source identifier (file path or URI) to reference in the REST definition.
	 * This will be set in the REST definition's openApi.specification field.
	 */
	sourceIdentifier?: string;
}

/**
 * Representation of a parsed OpenAPI operation with all necessary data
 * for generating Camel REST and Route definitions.
 */
export interface ParsedOperation {
	operationId: string;
	method: RestMethods;
	path: string;
	description?: string;
	deprecated?: boolean;
	consumes?: string;
	produces?: string;
	parameters: Param1[];
	security: RestSecurity[];
	responseMessages: ResponseMessage1[];
}

/**
 * Error thrown when OpenAPI specification parsing fails.
 */
export class OpenApiParseError extends Error {
	constructor(
		message: string,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = 'OpenApiParseError';
	}
}

/**
 * Error thrown when OpenAPI specification validation fails.
 */
export class OpenApiValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'OpenApiValidationError';
	}
}

/**
 * Service for importing OpenAPI v3 specifications and converting them to Apache Camel entities.
 *
 * This service parses OpenAPI specifications and generates:
 * - REST definitions (Camel REST DSL)
 * - RouteDefinition entities with default implementations
 *
 * @example
 * ```typescript
 * const service = new OpenApiImportService();
 * const openApiYaml = `
 *   openapi: 3.0.0
 *   info:
 *     title: My API
 *   paths:
 *     /users:
 *       get:
 *         operationId: getUsers
 * `;
 *
 * const entities = await service.parseOpenApi(openApiYaml, {
 *   shouldGenerateRest: true,
 *   shouldGenerateRoutes: true,
 *   sourceIdentifier: 'file:///path/to/api.yaml'
 * });
 * ```
 */
export class OpenApiImportService {
	/**
	 * Cache for resolved references to prevent infinite loops in circular references.
	 * Maps $ref paths to their resolved values.
	 */
	private readonly referenceCache: Map<string, unknown> = new Map();

	/**
	 * The current OpenAPI specification being processed.
	 * Used for resolving internal references.
	 */
	private currentSpec?: OpenApi;

	private readonly BRACES_REGEXP = /[{}/]/g;
	private readonly MULTIPLE_DASH_REGEXP = /-+/g;

	/**
	 * Parses an OpenAPI v3 specification and generates Camel entities.
	 *
	 * @param openApiString - The OpenAPI specification as a YAML or JSON string
	 * @param options - Configuration options for the import process
	 * @returns A promise that resolves to an array containing REST and/or RouteDefinition entities
	 * @throws {OpenApiValidationError} If the input is invalid or options are misconfigured
	 * @throws {OpenApiParseError} If parsing fails
	 */
	async parseOpenApi(openApiString: string, options: OpenApiImportOptions = {}): Promise<Array<RouteDefinition | Rest>> {
		const { shouldGenerateRest = false, shouldGenerateRoutes = true, sourceIdentifier } = options;

		// Validate input
		if (!openApiString?.trim()) {
			throw new OpenApiValidationError('OpenAPI specification string cannot be empty');
		}

		if (!shouldGenerateRest && !shouldGenerateRoutes) {
			throw new OpenApiValidationError('At least one of shouldGenerateRest or shouldGenerateRoutes must be true');
		}

		try {
			// Parse and validate OpenAPI spec
			const openApi = this.parseOpenApiSpec(openApiString);

			// Initialize spec reference and clear cache for this parsing session
			this.currentSpec = openApi;
			this.referenceCache.clear();

			// Extract operations
			const operations = this.extractOperations(openApi);

			if (operations.length === 0) {
				throw new OpenApiValidationError('No operations found in OpenAPI specification');
			}

			// Build result array
			const result: Array<RouteDefinition | Rest> = [];

			// Generate REST definition if requested
			if (shouldGenerateRest) {
				const restId = `rest-${Date.now()}`;
				const rest = this.buildRestDefinition(operations, restId, sourceIdentifier);
				result.push(rest);
			}

			// Generate route definitions if requested
			if (shouldGenerateRoutes) {
				const routes = this.buildRouteDefinitions(operations);
				result.push(...routes);
			}

			return result;
		} catch (error) {
			if (error instanceof OpenApiParseError || error instanceof OpenApiValidationError) {
				throw error;
			}
			throw new OpenApiParseError('Failed to process OpenAPI specification', error instanceof Error ? error : undefined);
		}
	}

	/**
	 * Lists all operations found in an OpenAPI specification without generating Camel entities.
	 * Useful for presenting a selection UI to the user before importing.
	 *
	 * @param openApiString - The OpenAPI specification as a YAML or JSON string
	 * @returns Array of parsed operations with metadata (method, path, operationId, description)
	 * @throws {OpenApiValidationError} If the input is invalid
	 * @throws {OpenApiParseError} If parsing fails
	 */
	listOperations(openApiString: string): ParsedOperation[] {
		if (!openApiString?.trim()) {
			throw new OpenApiValidationError('OpenAPI specification string cannot be empty');
		}

		try {
			const openApi = this.parseOpenApiSpec(openApiString);
			this.currentSpec = openApi;
			this.referenceCache.clear();
			return this.extractOperations(openApi);
		} catch (error) {
			if (error instanceof OpenApiParseError || error instanceof OpenApiValidationError) {
				throw error;
			}
			throw new OpenApiParseError('Failed to list operations from OpenAPI specification', error instanceof Error ? error : undefined);
		}
	}

	/**
	 * Filters an OpenAPI specification to include only the selected operations.
	 * Non-verb properties (parameters, summary, description, etc.) on each path are preserved.
	 *
	 * @param specContent - The full OpenAPI specification as a YAML or JSON string
	 * @param selectedOperations - Operations to keep in the filtered spec
	 * @returns Filtered OpenAPI specification as a YAML string
	 */
	filterSpecByOperations(specContent: string, selectedOperations: ParsedOperation[]): string {
		const spec = parse(specContent) as OpenApi;
		const selectedKeys = new Set(selectedOperations.map((op) => `${op.method}::${op.path}`));
		const filteredPaths: OpenApiPaths = {};

		for (const [pathStr, pathItem] of Object.entries(spec.paths)) {
			const filteredPathItem = { ...pathItem };

			for (const method of REST_DSL_VERBS) {
				if (!selectedKeys.has(`${method}::${pathStr}`)) {
					delete filteredPathItem[method];
				}
			}

			const hasOperations = REST_DSL_VERBS.some((m) => filteredPathItem[m] !== undefined);
			if (hasOperations) {
				filteredPaths[pathStr] = filteredPathItem;
			}
		}

		spec.paths = filteredPaths;
		return stringify(spec, { lineWidth: 0 });
	}

	/**
	 * High-level method that parses an OpenAPI specification and produces a complete
	 * Camel YAML string with route and/or rest definitions.
	 *
	 * @param specContent - The OpenAPI specification as a YAML or JSON string
	 * @param options - Configuration options for the import process
	 * @returns YAML string containing Camel route and/or rest definitions
	 * @throws {OpenApiValidationError} If the input is invalid or options are misconfigured
	 * @throws {OpenApiParseError} If parsing fails
	 */
	async generateCamelYaml(specContent: string, options: OpenApiImportOptions = {}): Promise<string> {
		const entities = await this.parseOpenApi(specContent, options);

		const yamlElements = entities.map((entity) => {
			if (this.isRouteDefinition(entity)) {
				return { route: entity };
			}
			return { rest: entity };
		});

		return stringify(yamlElements, { lineWidth: 0 });
	}

	private isRouteDefinition(entity: RouteDefinition | Rest): entity is RouteDefinition {
		return 'from' in entity;
	}

	/**
	 * Parses and validates an OpenAPI specification string.
	 *
	 * @param openApiString - The OpenAPI specification as a YAML or JSON string
	 * @returns The parsed OpenAPI specification object
	 * @throws {OpenApiParseError} If parsing fails
	 * @throws {OpenApiValidationError} If validation fails
	 */
	parseOpenApiSpec(openApiString: string): OpenApi {
		try {
			const spec = parse(openApiString) as OpenApi;
			this.validateOpenApiSpec(spec);
			return spec;
		} catch (error) {
			if (error instanceof OpenApiValidationError) {
				throw error;
			}
			throw new OpenApiParseError(`Failed to parse OpenAPI specification: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Validates an OpenAPI specification object.
	 *
	 * @param spec - The OpenAPI specification to validate
	 * @throws {OpenApiValidationError} If validation fails
	 */
	private validateOpenApiSpec(spec: OpenApi): void {
		if (!spec || typeof spec !== 'object') {
			throw new OpenApiValidationError('Invalid OpenAPI specification: not an object');
		}

		if (!spec.openapi?.startsWith('3.')) {
			throw new OpenApiValidationError('Invalid OpenAPI specification: only OpenAPI 3.x is supported');
		}

		if (!spec.paths || typeof spec.paths !== 'object') {
			throw new OpenApiValidationError('Invalid OpenAPI specification: missing or invalid paths');
		}

		if (Object.keys(spec.paths).length === 0) {
			throw new OpenApiValidationError('Invalid OpenAPI specification: no paths defined');
		}
	}

	/**
	 * Extracts operations from an OpenAPI specification.
	 *
	 * @param spec - The OpenAPI specification
	 * @returns Array of parsed operations
	 */
	private extractOperations(spec: OpenApi): ParsedOperation[] {
		const operations: ParsedOperation[] = [];
		const paths = spec.paths;

		for (const [pathKey, pathItem] of Object.entries(paths)) {
			if (!pathItem || typeof pathItem !== 'object') {
				continue;
			}

			// Get path-level parameters
			const pathParameters = this.resolveParameters(pathItem.parameters);

			for (const method of REST_DSL_VERBS) {
				const operation = pathItem[method];
				if (!operation) {
					continue;
				}

				const operationId = operation.operationId ?? this.generateOperationId(method, pathKey);
				const description = operation.description ?? operation.summary;

				// Merge path-level and operation-level parameters
				const operationParameters = this.resolveParameters(operation.parameters);
				const allParameters = this.mergeParameters(pathParameters, operationParameters);
				const mappedParameters = allParameters.map((param) => this.mapParameter(param));

				// Extract media types from request body
				const requestBody = this.resolveReference<OpenApiRequestBody>(operation.requestBody);
				const consumes = requestBody?.content ? this.getMediaTypes(requestBody.content) : undefined;

				// Extract media types from responses
				const responses = this.resolveReference<OpenApiResponses>(operation.responses);
				const produces = this.extractProducesFromResponses(responses);

				// Map security requirements
				const security = this.mapSecurityRequirements(operation.security);

				// Map response messages
				const responseMessages = this.mapResponseMessages(responses);

				operations.push({
					operationId,
					method,
					path: pathKey,
					description,
					deprecated: operation.deprecated,
					consumes,
					produces,
					parameters: mappedParameters,
					security,
					responseMessages,
				});
			}
		}

		return operations;
	}

	/**
	 * Generates a unique operation ID from method and path.
	 *
	 * @param method - HTTP method
	 * @param path - API path
	 * @returns Generated operation ID
	 */
	private generateOperationId(method: string, path: string): string {
		return `${method}-${path}`.replaceAll(this.BRACES_REGEXP, '-').replaceAll(this.MULTIPLE_DASH_REGEXP, '-');
	}

	/**
	 * Maps an OpenAPI parameter to Camel REST DSL parameter format.
	 *
	 * @param parameter - OpenAPI parameter
	 * @returns Camel parameter object
	 */
	private mapParameter(parameter: OpenApiParameter): Param1 {
		/* OpenApi parameter in: 'path' | 'query' | 'header' | 'cookie'; */
		/* Camel rest parameter: 'body' | 'formData' | 'header' | 'path' | 'query'; */
		const paramType: Type5 = parameter.in === 'cookie' ? 'header' : parameter.in;

		const mapped: Param1 = {
			name: parameter.name,
			type: paramType,
		};

		if (parameter.required !== undefined) {
			mapped.required = parameter.required;
		}

		if (parameter.description) {
			mapped.description = parameter.description;
		}

		// Extract data type from schema
		const schema = this.resolveReference<OpenApiSchema>(parameter.schema);
		if (schema?.type) {
			mapped.dataType = schema.type;
		}

		// Extract default value
		if (schema && 'default' in schema) {
			mapped.defaultValue = String(schema.default);
		}

		// Extract enum values as allowable values
		if (schema?.enum && Array.isArray(schema.enum)) {
			mapped.allowableValues = schema.enum.map((value) => ({ value: String(value) }));
		}

		return mapped;
	}

	/**
	 * Merges path-level and operation-level parameters, with operation-level taking precedence.
	 *
	 * @param pathParams - Path-level parameters
	 * @param operationParams - Operation-level parameters
	 * @returns Merged parameters array
	 */
	private mergeParameters(pathParams: OpenApiParameter[], operationParams: OpenApiParameter[]): OpenApiParameter[] {
		const merged = new Map<string, OpenApiParameter>();

		// Add path-level parameters
		for (const param of pathParams) {
			const key = `${param.in}:${param.name}`;
			merged.set(key, param);
		}

		// Override with operation-level parameters
		for (const param of operationParams) {
			const key = `${param.in}:${param.name}`;
			merged.set(key, param);
		}

		return Array.from(merged.values());
	}

	/**
	 * Maps OpenAPI security requirements to Camel REST DSL format.
	 *
	 * @param security - OpenAPI security requirements
	 * @returns Array of Camel security objects
	 */
	private mapSecurityRequirements(security?: OpenApiSecurityRequirement[]): RestSecurity[] {
		if (!security || !Array.isArray(security)) {
			return [];
		}

		const mapped: RestSecurity[] = [];

		for (const requirement of security) {
			for (const [key, scopes] of Object.entries(requirement)) {
				const securityItem: RestSecurity = { key };

				if (scopes && scopes.length > 0) {
					securityItem.scopes = scopes.join(',');
				}

				mapped.push(securityItem);
			}
		}

		return mapped;
	}

	/**
	 * Maps OpenAPI responses to Camel REST DSL response messages.
	 *
	 * @param responses - OpenAPI responses object
	 * @returns Array of Camel response message objects
	 */
	private mapResponseMessages(responses: OpenApiResponses | undefined): ResponseMessage1[] {
		if (!responses || typeof responses !== 'object') {
			return [];
		}

		const mapped: ResponseMessage1[] = [];

		for (const [statusCode, response] of Object.entries(responses)) {
			if (statusCode === 'default') {
				continue;
			}

			const resolvedResponse = this.resolveReference<OpenApiResponse>(response);
			if (!resolvedResponse) {
				continue;
			}

			const message: ResponseMessage1 = {
				code: statusCode,
				message: resolvedResponse.description || `Response ${statusCode}`,
			};

			// Extract content type
			if (resolvedResponse.content) {
				const contentTypes = Object.keys(resolvedResponse.content);
				if (contentTypes.length > 0) {
					message.contentType = contentTypes.join(',');
				}
			}

			// Map headers
			if (resolvedResponse.headers) {
				message.header = this.mapResponseHeaders(resolvedResponse.headers);
			}

			mapped.push(message);
		}

		return mapped;
	}

	/**
	 * Maps OpenAPI response headers to Camel REST DSL format.
	 *
	 * @param headers - OpenAPI response headers
	 * @returns Array of Camel response header objects
	 */
	private mapResponseHeaders(headers: OpenApiMap<OpenApiHeader | OpenApiReference>): ResponseHeader[] {
		const mapped: ResponseHeader[] = [];

		for (const [name, header] of Object.entries(headers)) {
			const resolvedHeader = this.resolveReference<OpenApiHeader>(header);
			if (!resolvedHeader) {
				continue;
			}

			const mappedHeader: ResponseHeader = { name };

			if (resolvedHeader.description) {
				mappedHeader.description = resolvedHeader.description;
			}

			const schema = this.resolveReference<OpenApiSchema>(resolvedHeader.schema);
			if (schema?.type) {
				mappedHeader.dataType = schema.type;
			}

			if (schema?.enum && Array.isArray(schema.enum)) {
				mappedHeader.allowableValues = schema.enum.map((value) => ({ value: String(value) }));
			}

			mapped.push(mappedHeader);
		}

		return mapped;
	}

	/**
	 * Builds a Camel REST definition from parsed operations.
	 *
	 * @param operations - Array of parsed operations
	 * @param restId - Unique identifier for the REST definition
	 * @param sourceIdentifier - Optional source identifier for the OpenAPI spec
	 * @returns Camel REST definition
	 */
	private buildRestDefinition(operations: ParsedOperation[], restId: string, sourceIdentifier?: string): Rest {
		const rest: Rest = { id: restId };

		// Add OpenAPI specification reference if provided
		if (sourceIdentifier?.trim()) {
			rest.openApi = { specification: sourceIdentifier.trim() };
		}

		// Group operations by HTTP method
		const restByMethod = rest as Pick<Rest, RestMethods>;
		for (const operation of operations) {
			const methodKey = operation.method;
			const methodArray = (restByMethod[methodKey] as RestMethodDefinitions[]) ?? [];
			methodArray.push(this.buildOperationDefinition(operation));
			restByMethod[methodKey] = methodArray as Rest[typeof methodKey];
		}

		return rest;
	}

	private buildOperationDefinition(operation: ParsedOperation): RestMethodDefinitions {
		const operationDef: Partial<RestMethodDefinitions> = {
			id: operation.operationId,
			path: operation.path,
			routeId: `route-${operation.operationId}`,
			to: `direct:${operation.operationId}`,
		};

		if (operation.description?.trim()) {
			operationDef.description = operation.description;
		}

		if (operation.consumes?.trim()) {
			operationDef.consumes = operation.consumes;
		}

		if (operation.produces?.trim()) {
			operationDef.produces = operation.produces;
		}

		if (operation.parameters.length > 0) {
			operationDef.param = operation.parameters;
		}

		if (operation.responseMessages.length > 0) {
			operationDef.responseMessage = operation.responseMessages;
		}

		if (operation.security.length > 0) {
			operationDef.security = operation.security;
		}

		if (operation.deprecated !== undefined) {
			operationDef.deprecated = operation.deprecated;
		}

		return operationDef as RestMethodDefinitions;
	}

	/**
	 * Builds Camel RouteDefinition entities from parsed operations.
	 *
	 * @param operations - Array of parsed operations
	 * @returns Array of Camel RouteDefinition entities
	 */
	private buildRouteDefinitions(operations: ParsedOperation[]): RouteDefinition[] {
		return operations.map((operation) => {
			const from: FromDefinition = {
				uri: `direct:${operation.operationId}`,
				id: `direct-from-${operation.operationId}`,
				steps: [
					{
						setBody: {
							constant: `Operation ${operation.operationId} not yet implemented`,
						},
					} as ProcessorDefinition,
				],
			};

			const route: RouteDefinition = {
				id: `route-${operation.operationId}`,
				from,
			};

			return route;
		});
	}

	/**
	 * Resolves an OpenAPI reference or returns the item as-is.
	 * Supports internal references only (e.g., #/components/schemas/Pet).
	 *
	 * @param item - Item that may be a reference
	 * @returns Resolved item or undefined
	 */
	private resolveReference<T>(item: T | OpenApiReference | undefined): T | undefined {
		if (!item) {
			return undefined;
		}

		// Check if it's a reference object
		if (typeof item === 'object' && '$ref' in item) {
			const ref = item.$ref;

			// Only support internal references
			if (!ref?.startsWith('#/')) {
				console.warn('External references are not supported:', ref);
				return undefined;
			}

			// Check cache first to prevent infinite loops
			if (this.referenceCache.has(ref)) {
				return this.referenceCache.get(ref) as T;
			}

			// Parse the reference path
			const resolved = this.resolveInternalReference<T>(ref);

			// Cache the result (even if undefined to prevent repeated lookups)
			this.referenceCache.set(ref, resolved);

			return resolved;
		}

		return item as T;
	}

	/**
	 * Resolves an internal OpenAPI reference by navigating the spec object.
	 *
	 * @param ref - Reference path (e.g., "#/components/schemas/Pet")
	 * @returns Resolved value or undefined if not found
	 */
	private resolveInternalReference<T>(ref: string): T | undefined {
		if (!this.currentSpec) {
			console.warn('Cannot resolve reference: no spec loaded');
			return undefined;
		}

		// Remove leading '#/' and split path
		const path = ref.replace(/^#\//, '').split('/');

		// Navigate the spec object
		let current: any = this.currentSpec;
		for (const segment of path) {
			if (current === null || current === undefined || typeof current !== 'object') {
				console.warn(`Reference resolution failed at segment "${segment}" in path: ${ref}`);
				return undefined;
			}

			// Decode URI-encoded segments (e.g., "~1" -> "/", "~0" -> "~")
			const decodedSegment = segment.replaceAll('~1', '/').replaceAll('~0', '~');
			current = current[decodedSegment];
		}

		return current as T;
	}

	/**
	 * Resolves an array of parameters that may contain references.
	 *
	 * @param parameters - Array of parameters or references
	 * @returns Array of resolved parameters
	 */
	private resolveParameters(parameters?: (OpenApiParameter | OpenApiReference)[]): OpenApiParameter[] {
		if (!parameters || !Array.isArray(parameters)) {
			return [];
		}

		return parameters.map((param) => this.resolveReference<OpenApiParameter>(param)).filter((param): param is OpenApiParameter => param !== undefined);
	}

	/**
	 * Extracts media types from OpenAPI content object.
	 *
	 * @param content - OpenAPI content object
	 * @returns Comma-separated media types
	 */
	private getMediaTypes(content: OpenApiMap<OpenApiMediaType>): string {
		return Object.keys(content).join(',');
	}

	/**
	 * Extracts produces media types from OpenAPI responses.
	 *
	 * @param responses - OpenAPI responses object
	 * @returns Comma-separated media types or undefined
	 */
	private extractProducesFromResponses(responses: OpenApiResponses | undefined): string | undefined {
		if (!responses) {
			return undefined;
		}

		const mediaTypes = new Set<string>();

		for (const response of Object.values(responses)) {
			const resolvedResponse = this.resolveReference<OpenApiResponse>(response);
			if (resolvedResponse?.content) {
				for (const mediaType of Object.keys(resolvedResponse.content)) {
					mediaTypes.add(mediaType);
				}
			}
		}

		return mediaTypes.size > 0 ? Array.from(mediaTypes).join(',') : undefined;
	}
}
