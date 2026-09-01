/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { commands, ProgressLocation, QuickPickItem, Uri, window, workspace } from 'vscode';
import {
	COMMAND_OPEN_WITH_KAOTO,
	DEFAULT_KAOTO_OPENAPI_FILES_REGEXP,
	KAOTO_OPENAPI_FILES_REGEXP_SETTING_ID,
	KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID,
} from '../constants';
import { ApicurioRegistryService, ApicurioRegistryUrlError, type ApicurioArtifact } from '../services/ApicurioRegistryService';
import { OpenApiImportService, OpenApiParseError, OpenApiValidationError, type ParsedOperation } from '../services/OpenApiImportService';
import { AbstractNewCamelRouteCommand } from './AbstractNewCamelRouteCommand';

interface OutputOptions {
	shouldGenerateRest: boolean;
	shouldGenerateRoutes: boolean;
}

const OPENAPI_SOURCE_ITEMS: QuickPickItem[] = [
	{ label: 'Upload file', description: 'Select an OpenAPI file from the workspace' },
	{ label: 'Import from URI', description: 'Provide a URL to an OpenAPI specification' },
	{ label: 'Import from Apicurio Registry', description: 'Fetch from a configured Apicurio Registry instance' },
];

export class ImportOpenApiCommand extends AbstractNewCamelRouteCommand {
	private readonly importService = new OpenApiImportService();
	private readonly registryService = new ApicurioRegistryService();

	public async create(): Promise<void> {
		this.camelDSL ??= this.getDSL('YAML');

		const specContent = await this.stepSelectSource();
		if (!specContent) {
			return;
		}

		let operations: ParsedOperation[];
		try {
			operations = this.importService.listOperations(specContent);
		} catch (error) {
			if (error instanceof OpenApiValidationError || error instanceof OpenApiParseError) {
				window.showErrorMessage(`Failed to parse OpenAPI specification: ${error.message}`);
			} else {
				window.showErrorMessage('Failed to parse the OpenAPI specification. Ensure it is valid YAML or JSON.');
			}
			return;
		}

		if (operations.length === 0) {
			window.showWarningMessage('No operations found in the provided OpenAPI specification.');
			return;
		}

		const selectedOperations = await this.stepSelectOperations(operations);
		if (!selectedOperations || selectedOperations.length === 0) {
			return;
		}

		const outputOptions = await this.stepSelectOutputOptions();
		if (!outputOptions) {
			return;
		}

		const filteredSpec = this.importService.filterSpecByOperations(specContent, selectedOperations);

		let content: string;
		try {
			content = await this.importService.generateCamelYaml(filteredSpec, {
				shouldGenerateRest: outputOptions.shouldGenerateRest,
				shouldGenerateRoutes: outputOptions.shouldGenerateRoutes,
			});
		} catch (error) {
			if (error instanceof OpenApiValidationError || error instanceof OpenApiParseError) {
				window.showErrorMessage(`OpenAPI import failed: ${error.message}`);
			} else {
				window.showErrorMessage(`Unexpected error during import: ${error instanceof Error ? error.message : String(error)}`);
			}
			return;
		}

		await this.saveAndOpen(content);
	}

	// --- Step 1: Select source and fetch OpenAPI spec ---

	private async stepSelectSource(): Promise<string | undefined> {
		const source = await window.showQuickPick(OPENAPI_SOURCE_ITEMS, {
			placeHolder: 'Select an OpenAPI specification source',
			title: 'Import OpenAPI - Step 1/3: Select Source',
		});

		if (!source) {
			return undefined;
		}

		switch (source.label) {
			case 'Upload file':
				return this.fetchFromFile();
			case 'Import from URI':
				return this.fetchFromUri();
			case 'Import from Apicurio Registry':
				return this.fetchFromApicurio();
			default:
				return undefined;
		}
	}

	private async fetchFromFile(): Promise<string | undefined> {
		const filesRegexp: string[] = workspace.getConfiguration().get(KAOTO_OPENAPI_FILES_REGEXP_SETTING_ID) ?? DEFAULT_KAOTO_OPENAPI_FILES_REGEXP;
		const globPattern = '{' + filesRegexp.map((r) => '**/' + r).join(',') + '}';

		const matchingFiles = await workspace.findFiles(globPattern);
		if (matchingFiles.length === 0) {
			window.showWarningMessage(`No OpenAPI files matching pattern [${filesRegexp.join(', ')}] found in the workspace.`);
			return undefined;
		}

		const items: QuickPickItem[] = matchingFiles.map((file) => ({
			label: workspace.asRelativePath(file),
		}));

		const selected = await window.showQuickPick(items, {
			placeHolder: 'Select an OpenAPI specification file',
			title: 'Import OpenAPI - Select File',
		});

		if (!selected) {
			return undefined;
		}

		const selectedFile = matchingFiles.find((f) => workspace.asRelativePath(f) === selected.label);
		if (!selectedFile) {
			return undefined;
		}

		const fileContent = await workspace.fs.readFile(selectedFile);
		return Buffer.from(fileContent).toString('utf-8');
	}

	private async fetchFromUri(): Promise<string | undefined> {
		const uri = await window.showInputBox({
			prompt: 'Enter the URL to the OpenAPI specification',
			placeHolder: 'https://example.com/api-docs',
			title: 'Import OpenAPI - Enter URL',
			validateInput: (value) => {
				if (!value) {
					return 'URL is required';
				}
				let url: URL;
				try {
					url = new URL(value);
				} catch {
					return 'Please enter a valid URL';
				}
				if (url.protocol !== 'http:' && url.protocol !== 'https:') {
					return 'Only HTTP and HTTPS URLs are supported';
				}
				return undefined;
			},
		});

		if (!uri) {
			return undefined;
		}

		return this.fetchUrl(uri);
	}

	private async fetchFromApicurio(): Promise<string | undefined> {
		const config = workspace.getConfiguration();
		let registryUrl: string | undefined = config.get<string>(KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID);

		registryUrl = await window.showInputBox({
			prompt: 'Enter the Apicurio Registry URL (will be saved as default)',
			placeHolder: 'https://registry.example.com/apis/registry/v3',
			title: 'Import OpenAPI - Apicurio Registry URL',
			value: registryUrl,
			validateInput: (value) => {
				if (!value) {
					return 'URL is required';
				}
				try {
					this.registryService.detectApiVersion(value);
				} catch (error) {
					if (error instanceof ApicurioRegistryUrlError) {
						return error.message;
					}
					return 'Please enter a valid URL';
				}
				return undefined;
			},
		});

		if (!registryUrl) {
			return undefined;
		}

		await config.update(KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID, registryUrl, true);

		const artifacts = await this.fetchApicurioArtifacts(registryUrl);
		if (!artifacts || artifacts.length === 0) {
			window.showWarningMessage('No OpenAPI artifacts found in the Apicurio Registry.');
			return undefined;
		}

		const items: (QuickPickItem & { artifactId: string })[] = artifacts.map((a) => ({
			label: a.name ?? a.artifactId,
			description: a.groupId ? `${a.groupId}/${a.artifactId}` : a.artifactId,
			detail: a.description,
			artifactId: a.artifactId,
		}));

		const selected = await window.showQuickPick(items, {
			placeHolder: 'Select an OpenAPI artifact',
			title: 'Import OpenAPI - Select Artifact from Registry',
		});

		if (!selected) {
			return undefined;
		}

		const artifact = artifacts.find((a) => a.artifactId === selected.artifactId);
		if (!artifact) {
			return undefined;
		}

		const contentUrl = this.registryService.buildArtifactContentUrl(registryUrl, artifact);
		return this.fetchUrl(contentUrl);
	}

	private async fetchApicurioArtifacts(registryUrl: string): Promise<ApicurioArtifact[]> {
		try {
			const version = this.registryService.detectApiVersion(registryUrl);
			const searchUrl = this.registryService.buildSearchUrl(registryUrl);
			const response = await this.fetchUrl(searchUrl);
			if (!response) {
				return [];
			}
			return this.registryService.parseSearchResponse(response, version);
		} catch (error) {
			window.showErrorMessage(`Failed to fetch artifacts from Apicurio Registry: ${error instanceof Error ? error.message : String(error)}`);
			return [];
		}
	}

	private async fetchUrl(url: string): Promise<string | undefined> {
		return window.withProgress(
			{
				location: ProgressLocation.Notification,
				title: `Fetching OpenAPI specification...`,
				cancellable: false,
			},
			async () => {
				try {
					const response = await fetch(url);
					if (!response.ok) {
						const sanitizedUrl = this.sanitizeUrl(url);
						window.showErrorMessage(`Failed to fetch: ${response.status} ${response.statusText} (${sanitizedUrl})`);
						return undefined;
					}
					return await response.text();
				} catch (error) {
					const sanitizedUrl = this.sanitizeUrl(url);
					window.showErrorMessage(`Failed to fetch from URL: ${error instanceof Error ? error.message : String(error)} (${sanitizedUrl})`);
					return undefined;
				}
			},
		);
	}

	/**
	 * Sanitizes a URL by removing sensitive information (credentials, query parameters, and fragments).
	 *
	 * @param url - The URL to sanitize
	 * @returns Sanitized URL string safe for display in error messages
	 */
	private sanitizeUrl(url: string): string {
		try {
			const parsedUrl = new URL(url);
			// Clear sensitive information
			parsedUrl.username = '';
			parsedUrl.password = '';
			parsedUrl.search = '';
			parsedUrl.hash = '';
			return parsedUrl.toString();
		} catch {
			// If URL parsing fails, return a generic message
			return 'invalid URL';
		}
	}

	// --- Step 2: Select operations ---

	private async stepSelectOperations(operations: ParsedOperation[]): Promise<ParsedOperation[] | undefined> {
		const items: (QuickPickItem & { operation?: ParsedOperation })[] = operations.map((op) => ({
			label: `${op.method.toUpperCase()} ${op.path}`,
			description: op.description ?? op.operationId ?? '',
			picked: true,
			operation: op,
		}));

		const selected = await window.showQuickPick(items, {
			canPickMany: true,
			placeHolder: 'Select operations to import',
			title: 'Import OpenAPI - Step 2/3: Select Operations',
		});

		if (!selected || selected.length === 0) {
			return undefined;
		}

		return selected.reduce<ParsedOperation[]>((acc, s) => {
			if (s.operation) {
				acc.push(s.operation);
			}
			return acc;
		}, []);
	}

	// --- Step 3: Select output options ---

	private async stepSelectOutputOptions(): Promise<OutputOptions | undefined> {
		const items: (QuickPickItem & { option: 'restDsl' | 'directRoutes' })[] = [
			{ label: 'Create Rest DSL operations', description: 'Generate Camel REST DSL definitions', option: 'restDsl' },
			{ label: 'Create routes with direct endpoints', description: 'Generate Camel routes with direct: consumers', picked: true, option: 'directRoutes' },
		];

		const selected = await window.showQuickPick(items, {
			canPickMany: true,
			placeHolder: 'Select output options',
			title: 'Import OpenAPI - Step 3/3: Define Output',
		});

		if (!selected || selected.length === 0) {
			return undefined;
		}

		const selectedOptions = new Set(selected.map((s) => s.option));
		return {
			shouldGenerateRest: selectedOptions.has('restDsl'),
			shouldGenerateRoutes: selectedOptions.has('directRoutes'),
		};
	}

	// --- Save and open ---

	private async saveAndOpen(content: string): Promise<void> {
		const wsFolder = workspace.workspaceFolders?.[0];
		if (!wsFolder) {
			await this.showNoWorkspaceNotification();
			return;
		}

		const targetFolder = await window.showOpenDialog({
			canSelectMany: false,
			canSelectFolders: true,
			canSelectFiles: false,
			openLabel: 'Select',
			title: 'Select a folder to create the file in. ESC to cancel a file creation.',
			defaultUri: wsFolder.uri,
		});

		if (!targetFolder || targetFolder.length === 0) {
			return;
		}

		const fileName = await window.showInputBox({
			prompt: 'Enter a name for the generated Camel file (without extension)',
			placeHolder: 'rest-api',
			title: 'Import OpenAPI - File Name',
			validateInput: async (value) => {
				return await this.validateCamelFileName(value, targetFolder[0].fsPath);
			},
		});

		if (!fileName) {
			return;
		}

		const filePath = this.computeFullPath(targetFolder[0].fsPath, this.getFullName(fileName, this.camelDSL!.extension));
		const fileUri = Uri.file(filePath);

		await workspace.fs.writeFile(fileUri, new TextEncoder().encode(content));
		await this.waitForFileExists(fileUri);
		await commands.executeCommand(COMMAND_OPEN_WITH_KAOTO, fileUri);
	}
}
