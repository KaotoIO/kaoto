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
import { promises as fsPromises } from 'fs';
import { Disposable, TreeItem, TreeItemCollapsibleState, Uri, workspace } from 'vscode';
import { basename, normalize } from 'path';
import { OpenApiFile } from './OpenApiFile';
import { OpenApiFolder } from './OpenApiFolder';
import { AbstractFolderTreeProvider } from '../shared/AbstractFolderTreeProvider';
import {
	COMMAND_OPENAPI_DELETE,
	COMMAND_OPENAPI_SHOW_SOURCE,
	DEFAULT_KAOTO_OPENAPI_FILES_REGEXP,
	KAOTO_OPENAPI_FILES_REGEXP_SETTING_ID,
} from '../../constants';
import { OpenApiImportService } from '../../services/OpenApiImportService';

export class OpenApiProvider extends AbstractFolderTreeProvider<OpenApiFolder> {
	public readonly VIEW_ITEM_SHOW_SOURCE_COMMAND_ID: string = COMMAND_OPENAPI_SHOW_SOURCE;
	public readonly VIEW_ITEM_DELETE_COMMAND_ID: string = COMMAND_OPENAPI_DELETE;

	/** Cached OpenAPI files after content-based filtering */
	private openApiFilesCache: Uri[] | undefined;
	private openApiCacheInvalidated = true;

	/** Parsed OpenAPI data cached during filtering to avoid re-reading in toTreeItemForFile */
	private readonly openApiDataCache = new Map<string, { version: string }>();

	private readonly openApiService = new OpenApiImportService();
	private configChangeDisposable?: Disposable;

	constructor() {
		super();
		this.initFileWatcher();
		this.onConfigurationChange();
	}

	protected getFilePattern(): string {
		const filesRegexp: string[] = workspace.getConfiguration().get(KAOTO_OPENAPI_FILES_REGEXP_SETTING_ID) ?? DEFAULT_KAOTO_OPENAPI_FILES_REGEXP;
		return '{' + filesRegexp.map((r) => '**/' + r).join(',') + '}';
	}

	protected getExcludePattern(): string {
		return AbstractFolderTreeProvider.EXCLUDE_PATTERN;
	}

	protected onConfigurationChange(): void {
		this.configChangeDisposable = workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(KAOTO_OPENAPI_FILES_REGEXP_SETTING_ID)) {
				this.fileWatcher?.dispose();
				this.initFileWatcher();
				this.refresh();
			}
		});
	}

	protected createFolderItem(name: string, folderUri: Uri, isUnderMavenRoot: boolean, isMavenRoot: boolean, isWorkspaceRoot: boolean = false): OpenApiFolder {
		return new OpenApiFolder(name, folderUri, isUnderMavenRoot, isMavenRoot, isWorkspaceRoot);
	}

	protected async toTreeItemForFile(file: Uri, _isUnderMavenRoot: boolean, _isTopLevelWithinWorkspace: boolean): Promise<TreeItem> {
		const filepath = normalize(file.fsPath);
		const cached = this.openApiDataCache.get(filepath);
		if (cached) {
			const fileName = basename(filepath);
			return new OpenApiFile(fileName, filepath, cached.version);
		}

		const item = await this.parseOpenApiFile(filepath);
		return item ?? new TreeItem(basename(filepath), TreeItemCollapsibleState.None);
	}

	protected isFolderItem(element: TreeItem): element is OpenApiFolder {
		return element instanceof OpenApiFolder;
	}

	/**
	 * Override getChildren to add content-based filtering.
	 * The glob pattern matches all YAML/JSON files, but only files containing
	 * an `openapi` field should appear in the tree.
	 */
	override async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (this.openApiCacheInvalidated || !this.openApiFilesCache) {
			const allFiles = await workspace.findFiles(this.getFilePattern(), this.getExcludePattern());
			this.openApiFilesCache = await this.filterToOpenApiFiles(allFiles);
			this.openApiCacheInvalidated = false;
		}

		const files = this.openApiFilesCache;

		if (!element) {
			if (files.length === 0) {
				return [];
			}
			return await this.getRootChildren(files);
		}
		if (this.isFolderItem(element)) {
			return await this.getFolderChildren(files, element);
		}
		return [];
	}

	override refresh(): void {
		this.invalidateCache();
		super.refresh();
	}

	override dispose(): void {
		this.configChangeDisposable?.dispose();
		super.dispose();
	}

	protected override invalidateCache(): void {
		super.invalidateCache();
		this.openApiCacheInvalidated = true;
		this.openApiDataCache.clear();
	}

	/**
	 * Filter files to only those containing a valid OpenAPI spec.
	 * Delegates parsing and validation to {@link OpenApiImportService.parseOpenApiSpec}.
	 */
	private async filterToOpenApiFiles(files: Uri[]): Promise<Uri[]> {
		this.openApiDataCache.clear();
		const results = await Promise.all(
			files.map(async (file) => {
				const filepath = normalize(file.fsPath);
				try {
					const content = await fsPromises.readFile(filepath, 'utf8');
					const spec = this.openApiService.parseOpenApiSpec(content);
					this.openApiDataCache.set(filepath, { version: spec.openapi });
					return file;
				} catch {
					// Not a valid OpenAPI file or parse error - skip
				}
				return undefined;
			}),
		);
		return results.filter((f): f is Uri => f !== undefined);
	}

	private async parseOpenApiFile(filepath: string): Promise<OpenApiFile | undefined> {
		try {
			const content = await fsPromises.readFile(filepath, 'utf8');
			const spec = this.openApiService.parseOpenApiSpec(content);
			return new OpenApiFile(basename(filepath), filepath, spec.openapi);
		} catch (error) {
			console.error(`Error parsing file: ${filepath}`, error);
		}
		return undefined;
	}
}
