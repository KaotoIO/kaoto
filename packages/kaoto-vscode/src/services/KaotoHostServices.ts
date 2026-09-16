/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CanvasLayoutDirection, ColorScheme, FileTypes, NodeLabelType, NodeToolbarTrigger, SettingsModel } from '@kaoto/kaoto/models';
import type {
	CatalogKind,
	FileTypesResponse,
	ISettingsModel,
	RuntimeMavenInformation,
	StepUpdateAction,
	Suggestion,
	SuggestionRequestContext,
} from '@kaoto/kaoto/models';
import { BridgeError } from '@kaoto/kaoto/host-bridge';
import * as vscode from 'vscode';
import path from 'path'; // NOSONAR: webpack supplies path-browserify in the worker
import {
	KAOTO_CATALOG_URL_SETTING_ID,
	KAOTO_NODE_LABEL_SETTING_ID,
	KAOTO_NODE_TOOLBAR_TRIGGER_SETTING_ID,
	KAOTO_COLOR_THEME_SETTING_ID,
	KAOTO_CANVAS_LAYOUT_DIRECTION_SETTING_ID,
	KAOTO_REST_CUSTOM_MEDIA_TYPES_SETTING_ID,
	KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID,
	KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID,
} from '../constants';
import { getSuggestions } from './SuggestionRegistry';
import { readKameletsFromDirectory } from './KameletFileReader';

export interface KaotoDesktopOperations {
	getSelectedCatalog?: (uri: vscode.Uri) => Promise<{ name: string; runtime: string } | undefined>;
	findClasspathRoot?: (uri: vscode.Uri) => vscode.Uri;
	resolveKameletDirectories?: (directories: string[], uri: vscode.Uri) => vscode.Uri[];
	getEnvironmentSuggestions?: (word: string, context: SuggestionRequestContext, uri: vscode.Uri) => Suggestion[] | Promise<Suggestion[]>;
	getRuntimeInfoFromMavenContext?: (uri: vscode.Uri) => Promise<RuntimeMavenInformation | undefined>;
	onStepUpdated?: (uri: vscode.Uri, action: StepUpdateAction, stepType: CatalogKind, stepName: string) => void | Promise<void>;
	disposeFor?: (uri: vscode.Uri) => void;
}

/** Shared host operations. Desktop integrations are supplied by the document owner. */
export class KaotoHostServices implements vscode.Disposable {
	private ownedUri: vscode.Uri;
	private disposed = false;

	constructor(
		private readonly getDocumentUri: () => vscode.Uri,
		private readonly desktop: KaotoDesktopOperations = {},
	) {
		this.ownedUri = getDocumentUri();
	}

	private get documentUri(): vscode.Uri {
		if (this.disposed) {
			throw new BridgeError('DISPOSED', 'Host services have been disposed');
		}
		const uri = this.getDocumentUri();
		if (uri.toString() !== this.ownedUri.toString()) {
			this.desktop.disposeFor?.(this.ownedUri);
			this.ownedUri = uri;
		}
		return uri;
	}

	async getCatalogURL(): Promise<string | undefined> {
		return vscode.workspace.getConfiguration().get<string>(KAOTO_CATALOG_URL_SETTING_ID) || undefined;
	}

	async getVSCodeKaotoSettings(): Promise<ISettingsModel> {
		const catalog = await this.desktop.getSelectedCatalog?.(this.documentUri);
		const config = vscode.workspace.getConfiguration();
		const theme = config.get<ColorScheme | null>(KAOTO_COLOR_THEME_SETTING_ID);
		const dark =
			vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark || vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast;
		const colorScheme = theme === ColorScheme.Dark || (theme === ColorScheme.Auto && dark) ? ColorScheme.Dark : ColorScheme.Light;
		return {
			...new SettingsModel({
				catalogUrl: config.get<string | null>(KAOTO_CATALOG_URL_SETTING_ID) ?? '',
				runtimeCatalogName: catalog && catalog.runtime.toLowerCase() !== 'citrus' ? catalog.name : '',
				testingCatalogName: catalog?.runtime.toLowerCase() === 'citrus' ? catalog.name : '',
				nodeLabel: config.get<NodeLabelType | null>(KAOTO_NODE_LABEL_SETTING_ID) ?? NodeLabelType.Description,
				nodeToolbarTrigger: config.get<NodeToolbarTrigger | null>(KAOTO_NODE_TOOLBAR_TRIGGER_SETTING_ID) ?? NodeToolbarTrigger.onHover,
				colorScheme,
				canvasLayoutDirection:
					config.get<CanvasLayoutDirection | null>(KAOTO_CANVAS_LAYOUT_DIRECTION_SETTING_ID) ?? CanvasLayoutDirection.SelectInCanvas,
				rest: {
					apicurioRegistryUrl: config.get<string | null>(KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID) ?? '',
					customMediaTypes: config.get<string[] | null>(KAOTO_REST_CUSTOM_MEDIA_TYPES_SETTING_ID) ?? [],
				},
			}),
		};
	}

	async getMetadata<T>(key: string): Promise<T | undefined> {
		const metadata = await this.findExistingMetadata(this.documentUri);
		if (!metadata) {
			return undefined;
		}
		const content = await this.readMetadata(metadata);
		return Object.hasOwn(content, key) ? (this.normalizeMetadataFilePaths(content[key]) as T) : undefined;
	}

	async setMetadata<T>(key: string, value: T | undefined): Promise<void> {
		const uri = this.documentUri;
		const existing = await this.findExistingMetadata(uri);
		const content = existing ? await this.readMetadata(existing) : {};
		if (value === null || value === undefined) {
			delete content[key];
		} else {
			Object.defineProperty(content, key, { value, enumerable: true, writable: true, configurable: true });
		}
		await vscode.workspace.fs.writeFile(existing ?? this.metadataToCreate(uri), new TextEncoder().encode(JSON.stringify(content, null, '\t')));
	}

	async getResourceContent(relativePath: string): Promise<string | undefined> {
		const uri = this.documentUri;
		try {
			return await this.readText(this.resolveResource(this.classpathRoot(uri), relativePath));
		} catch (error) {
			if (!this.isMissing(error)) {
				throw error;
			}
		}
		const metadata = await this.findExistingMetadata(uri);
		if (!metadata) {
			return undefined;
		}
		try {
			return await this.readText(this.resolveResource(vscode.Uri.joinPath(metadata, '..'), relativePath));
		} catch (error) {
			if (!this.isMissing(error)) {
				throw error;
			}
			return undefined;
		}
	}

	async saveResourceContent(relativePath: string, content: string): Promise<void> {
		await vscode.workspace.fs.writeFile(this.resolveResource(this.classpathRoot(this.documentUri), relativePath), new TextEncoder().encode(content));
	}

	async deleteResource(relativePath: string): Promise<boolean> {
		try {
			await vscode.workspace.fs.delete(this.resolveResource(this.classpathRoot(this.documentUri), relativePath));
			return true;
		} catch (error) {
			if (!this.isMissing(error)) {
				throw error;
			}
			return false;
		}
	}

	async isResourceExist(relativePath: string): Promise<boolean> {
		try {
			await vscode.workspace.fs.stat(this.resolveResource(this.classpathRoot(this.documentUri), relativePath));
			return true;
		} catch (error) {
			if (!this.isMissing(error)) {
				throw error;
			}
			return false;
		}
	}

	async getResourcesContentByType(fileType: FileTypes): Promise<FileTypesResponse[]> {
		if (fileType !== FileTypes.Kamelets) {
			return [];
		}
		const configured = vscode.workspace.getConfiguration().get<string[]>(KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID);
		if (!Array.isArray(configured) || configured.length === 0) {
			return [];
		}
		const uri = this.documentUri;
		const directories =
			uri.scheme === 'file' && this.desktop.resolveKameletDirectories
				? this.desktop.resolveKameletDirectories(configured, uri)
				: configured.map((directory) => this.resolveKameletDirectory(directory, uri));
		const resources: FileTypesResponse[] = [];
		const seen = new Set<string>();
		for (const directory of directories) {
			if (seen.has(directory.toString())) {
				continue;
			}
			seen.add(directory.toString());
			resources.push(...(await readKameletsFromDirectory(directory)));
		}
		return resources;
	}

	async askUserForFileSelection(include: string, exclude?: string, options?: Record<string, unknown>): Promise<string[] | string | undefined> {
		const uri = this.documentUri;
		const folder = vscode.workspace.getWorkspaceFolder(uri);
		if (!folder) {
			throw new Error(`No associated workspace folder was found for ${uri.toString()}`);
		}
		const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folder, include), exclude);
		if (files.length === 0) {
			throw new Error(`No candidate file was found in ${folder.uri.toString()}`);
		}
		const metadata = (await this.findExistingMetadata(uri)) ?? this.metadataToCreate(uri);
		const directory = path.posix.dirname(metadata.path);
		return vscode.window.showQuickPick(
			files.map((file) => path.posix.relative(directory, file.path)),
			options as vscode.QuickPickOptions,
		);
	}

	async getSuggestions(topic: string, word: string, context: SuggestionRequestContext): Promise<Suggestion[]> {
		const uri = this.documentUri;
		if (topic === 'env') {
			if (!this.desktop.getEnvironmentSuggestions) {
				throw new BridgeError('UNSUPPORTED_REQUEST', 'Environment suggestions are unavailable on this host');
			}
			return this.desktop.getEnvironmentSuggestions(word, context, uri);
		}
		return getSuggestions(topic, word, context, uri);
	}

	async getRuntimeInfoFromMavenContext(): Promise<RuntimeMavenInformation | undefined> {
		if (!this.desktop.getRuntimeInfoFromMavenContext) {
			throw new BridgeError('UNSUPPORTED_REQUEST', 'Maven discovery is unavailable on this host');
		}
		return this.desktop.getRuntimeInfoFromMavenContext(this.documentUri);
	}

	async onStepUpdated(action: StepUpdateAction, stepType: CatalogKind, stepName: string): Promise<void> {
		await this.desktop.onStepUpdated?.(this.documentUri, action, stepType, stepName);
	}

	dispose(): void {
		if (this.disposed) {
			return;
		}
		const uri = this.documentUri;
		this.disposed = true;
		this.desktop.disposeFor?.(uri);
	}

	private async findExistingMetadata(uri: vscode.Uri): Promise<vscode.Uri | undefined> {
		let current = uri;
		while (true) {
			const parent = vscode.Uri.joinPath(current, '..');
			if (parent.path === current.path) {
				return undefined;
			}
			const candidate = vscode.Uri.joinPath(parent, '.kaoto');
			try {
				await vscode.workspace.fs.stat(candidate);
				return candidate;
			} catch (error) {
				if (!this.isMissing(error)) {
					throw error;
				}
			}
			current = parent;
		}
	}

	private metadataToCreate(uri: vscode.Uri): vscode.Uri {
		return vscode.Uri.joinPath(vscode.workspace.getWorkspaceFolder(uri)?.uri ?? vscode.Uri.joinPath(uri, '..'), '.kaoto');
	}

	private async readText(uri: vscode.Uri): Promise<string> {
		return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
	}

	private async readMetadata(uri: vscode.Uri): Promise<Record<string, unknown>> {
		const value: unknown = JSON.parse(await this.readText(uri));
		if (!value || typeof value !== 'object' || Array.isArray(value)) {
			throw new SyntaxError('Kaoto metadata must be a JSON object');
		}
		return value as Record<string, unknown>;
	}

	private classpathRoot(uri: vscode.Uri): vscode.Uri {
		if (uri.scheme === 'file' && this.desktop.findClasspathRoot) {
			return this.desktop.findClasspathRoot(uri);
		}
		const pattern = '/src/main/resources/';
		const index = uri.path.lastIndexOf(pattern);
		return uri.with({ path: index < 0 ? path.posix.dirname(uri.path) : uri.path.slice(0, index + pattern.length - 1) });
	}

	private resolveResource(base: vscode.Uri, relativePath: string): vscode.Uri {
		if (base.scheme === 'file') {
			return vscode.Uri.file(path.resolve(base.fsPath, relativePath));
		}
		this.rejectHostLocalPath(relativePath);
		return vscode.Uri.joinPath(base, relativePath.replaceAll('\\', '/'));
	}

	private resolveKameletDirectory(directory: string, uri: vscode.Uri): vscode.Uri {
		const cwd = vscode.Uri.joinPath(uri, '..');
		const folder = vscode.workspace.getWorkspaceFolder(uri);
		if (uri.scheme !== 'file') {
			this.rejectHostLocalPath(directory);
		}
		let expanded = directory.replaceAll('${cwd}', cwd.path);
		if (folder) {
			expanded = expanded.replaceAll('${workspaceFolder}', folder.uri.path).replaceAll('${workspaceFolderBasename}', folder.name);
		}
		if (expanded.includes('${')) {
			throw new BridgeError('UNSUPPORTED_REQUEST', `Cannot resolve directory: ${directory}`);
		}
		if (uri.scheme === 'file') {
			return vscode.Uri.file(path.resolve(cwd.fsPath, expanded));
		}
		return cwd.with({ path: path.posix.resolve(cwd.path, expanded.replaceAll('\\', '/')) });
	}

	private rejectHostLocalPath(value: string): void {
		if (/^(?:[a-z][a-z\d+.-]*:|[/\\])/i.test(value)) {
			throw new BridgeError('UNSUPPORTED_REQUEST', 'Host-local paths are unavailable in this workspace');
		}
	}

	private isMissing(error: unknown): boolean {
		return error instanceof vscode.FileSystemError && error.code === 'FileNotFound';
	}

	private normalizeMetadataFilePaths(value: unknown): unknown {
		if (!value || typeof value !== 'object') {
			return value;
		}
		if (Array.isArray(value)) {
			return value.map((entry) => this.normalizeMetadataFilePaths(entry));
		}
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [
				key,
				key === 'filePath' && Array.isArray(entry)
					? entry.map((file) => (typeof file === 'string' ? file.replaceAll('\\', '/') : file))
					: this.normalizeMetadataFilePaths(entry),
			]),
		);
	}
}
