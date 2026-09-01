/**
 * Supported Apicurio Registry REST API versions.
 *
 * - `v2` — Legacy API at `/apis/registry/v2`
 * - `v3` — Current API at `/apis/registry/v3`
 */
export type ApicurioApiVersion = 'v2' | 'v3';

/**
 * Normalized representation of an Apicurio Registry artifact.
 * Field names are aligned with the v3 API; the service normalizes
 * v2 responses (which use `id` / `type`) into this shape.
 */
export interface ApicurioArtifact {
	readonly artifactId: string;
	readonly groupId?: string;
	readonly name?: string;
	readonly description?: string;
}

/**
 * Raw artifact object returned by the Apicurio search endpoint.
 * Intentionally loose — the service normalizes this into {@link ApicurioArtifact}.
 */
interface RawSearchArtifact {
	readonly artifactId?: string;
	/** v2 uses `id` instead of `artifactId`. */
	readonly id?: string;
	readonly groupId?: string | null;
	readonly name?: string | null;
	readonly description?: string | null;
	readonly artifactType?: string;
	/** v2 uses `type` instead of `artifactType`. */
	readonly type?: string;
}

/**
 * Raw search response envelope returned by the Apicurio
 * `GET /search/artifacts` endpoint (both v2 and v3).
 */
interface RawSearchResponse {
	readonly count?: number;
	readonly artifacts?: RawSearchArtifact[];
}

/**
 * Error thrown when an Apicurio Registry URL is malformed or unsupported.
 */
export class ApicurioRegistryUrlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ApicurioRegistryUrlError';
	}
}

/**
 * Error thrown when parsing an Apicurio Registry response fails.
 */
export class ApicurioRegistryParseError extends Error {
	constructor(
		message: string,
		public readonly cause?: Error,
	) {
		super(message);
		this.name = 'ApicurioRegistryParseError';
	}
}

const V3_PATH_PATTERN = /\/v3(\/|$)/;
const V2_PATH_PATTERN = /\/v2(\/|$)/;

/**
 * Service for building Apicurio Registry REST API URLs and normalizing responses.
 *
 * This service does **not** perform any network I/O — it only builds URLs and
 * parses/normalizes response payloads. The actual HTTP calls are the
 * responsibility of the consumer (VS Code extension, browser app, etc.).
 *
 * Supports both Apicurio Registry **v2** and **v3** REST APIs.
 *
 * @example
 * ```typescript
 * const service = new ApicurioRegistryService();
 *
 * const baseUrl = 'https://registry.example.com/apis/registry/v3';
 * const version = service.detectApiVersion(baseUrl);
 *
 * // 1. Build URL to search for OpenAPI artifacts
 * const searchUrl = service.buildSearchUrl(baseUrl);
 * const searchJson = await fetch(searchUrl).then(r => r.text());
 *
 * // 2. Parse the search response into normalized artifacts
 * const artifacts = service.parseSearchResponse(searchJson);
 *
 * // 3. Build URL to fetch a specific artifact's content
 * const contentUrl = service.buildArtifactContentUrl(baseUrl, artifacts[0]);
 * const specContent = await fetch(contentUrl).then(r => r.text());
 * ```
 */
export class ApicurioRegistryService {
	/**
	 * Detects the Apicurio Registry API version from the base URL.
	 *
	 * @param registryUrl - The registry base URL (e.g. `https://host/apis/registry/v3`)
	 * @returns The detected API version
	 * @throws {ApicurioRegistryUrlError} If the URL does not contain a recognizable version path
	 */
	detectApiVersion(registryUrl: string): ApicurioApiVersion {
		const url = this.normalizeBaseUrl(registryUrl);
		if (V3_PATH_PATTERN.test(url)) {
			return 'v3';
		}
		if (V2_PATH_PATTERN.test(url)) {
			return 'v2';
		}
		throw new ApicurioRegistryUrlError(
			`Unable to detect API version from URL "${registryUrl}". The URL must contain /v2 or /v3 (e.g. https://host/apis/registry/v3).`,
		);
	}

	/**
	 * Builds the URL to search for OpenAPI artifacts in the registry.
	 *
	 * - **v3**: Uses the `artifactType` query parameter (server-side filtering)
	 * - **v2**: Does not filter by type server-side (the v2 API has no `type` query param);
	 *   filtering is done client-side in {@link parseSearchResponse}
	 *
	 * @param registryUrl - The registry base URL
	 * @param limit - Maximum number of results to return (default: 100)
	 * @returns The fully-qualified search URL
	 * @throws {ApicurioRegistryUrlError} If the URL is invalid or version cannot be detected
	 */
	buildSearchUrl(registryUrl: string, limit = 100): string {
		const baseUrl = this.normalizeBaseUrl(registryUrl);
		const version = this.detectApiVersion(baseUrl);

		if (version === 'v3') {
			return `${baseUrl}/search/artifacts?artifactType=OPENAPI&limit=${limit}`;
		}
		return `${baseUrl}/search/artifacts?limit=${limit}`;
	}

	/**
	 * Parses a raw JSON search response into normalized {@link ApicurioArtifact} objects.
	 *
	 * Handles the differences between v2 and v3 response shapes:
	 * - `id` (v2) vs `artifactId` (v3)
	 * - `type` (v2) vs `artifactType` (v3)
	 * - `null` groupId → `undefined`
	 *
	 * For v2 responses, also filters to only OPENAPI artifacts client-side
	 * (since the v2 search endpoint has no type query parameter).
	 *
	 * @param responseBody - The raw JSON string from the search endpoint
	 * @param version - The API version, used to determine the filtering strategy
	 * @returns Array of normalized artifacts
	 * @throws {ApicurioRegistryParseError} If the response body is not valid JSON
	 */
	parseSearchResponse(responseBody: string, version: ApicurioApiVersion): ApicurioArtifact[] {
		let data: RawSearchResponse;
		try {
			data = JSON.parse(responseBody) as RawSearchResponse;
		} catch (error) {
			throw new ApicurioRegistryParseError('Failed to parse Apicurio Registry search response as JSON', error instanceof Error ? error : undefined);
		}

		const raw = data.artifacts ?? [];

		return raw.reduce<ApicurioArtifact[]>((acc, entry) => {
			const artifactId = entry.artifactId ?? entry.id;
			if (!artifactId) {
				return acc;
			}
			const artifactType = (entry.artifactType ?? entry.type)?.toUpperCase();
			if (version === 'v2' && artifactType !== 'OPENAPI') {
				return acc;
			}
			acc.push({
				artifactId,
				groupId: entry.groupId ?? undefined,
				name: entry.name ?? undefined,
				description: entry.description ?? undefined,
			});
			return acc;
		}, []);
	}

	/**
	 * Builds the URL to fetch the content of a specific artifact.
	 *
	 * - **v3**: Content lives at `/groups/{g}/artifacts/{a}/versions/branch=latest/content`.
	 *   The `versionExpression` parameter requires the `branch=` prefix to reference the
	 *   auto-created `latest` branch (a bare `latest` is treated as a literal version ID).
	 * - **v2**: Content is returned directly from `/groups/{g}/artifacts/{a}`.
	 *
	 * When the artifact has no explicit `groupId`, the Apicurio default group (`"default"`)
	 * is used.
	 *
	 * @param registryUrl - The registry base URL
	 * @param artifact - The artifact whose content URL to build
	 * @returns The fully-qualified content URL
	 * @throws {ApicurioRegistryUrlError} If the URL is invalid or version cannot be detected
	 */
	buildArtifactContentUrl(registryUrl: string, artifact: ApicurioArtifact): string {
		const baseUrl = this.normalizeBaseUrl(registryUrl);
		const version = this.detectApiVersion(baseUrl);
		const group = encodeURIComponent(artifact.groupId ?? 'default');
		const id = encodeURIComponent(artifact.artifactId);

		if (version === 'v3') {
			return `${baseUrl}/groups/${group}/artifacts/${id}/versions/branch=latest/content`;
		}
		return `${baseUrl}/groups/${group}/artifacts/${id}`;
	}

	/**
	 * Validates and normalizes a registry base URL by stripping trailing slashes.
	 *
	 * @param registryUrl - The registry URL to normalize
	 * @returns The normalized URL without trailing slashes
	 * @throws {ApicurioRegistryUrlError} If the value is not a valid URL
	 */
	private normalizeBaseUrl(registryUrl: string): string {
		try {
			new URL(registryUrl);
		} catch {
			throw new ApicurioRegistryUrlError(`Invalid URL: "${registryUrl}"`);
		}
		return registryUrl.replace(/\/+$/, ''); // NOSONAR - /\/+$/ is a simple anchored pattern with no backtracking ambiguity; Sonar's super-linear analysis is a false positive for this input domain (short URL strings)
	}
}
