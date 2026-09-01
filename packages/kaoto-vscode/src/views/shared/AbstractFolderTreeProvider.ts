/**
 * Copyright 2025 Red Hat, Inc. and/or its affiliates.
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
import { Event, EventEmitter, FileSystemWatcher, TreeDataProvider, TreeItem, TreeItemLabel, Uri, workspace } from 'vscode';
import { KAOTO_EXCLUDE_PATTERN } from '../../constants';
import { join, relative, sep } from 'path';

/**
 * Abstract base folder tree item interface for type checking
 */
export interface IFolderTreeItem extends TreeItem {
	readonly folderUri: Uri;
	readonly isUnderMavenRoot: boolean;
}

type TreeItemType = TreeItem | undefined | null | void;

/**
 * Abstract base class for tree data providers that display files in a folder hierarchy.
 * Provides common logic for building folder/file trees from workspace files.
 */
export abstract class AbstractFolderTreeProvider<TFolder extends IFolderTreeItem> implements TreeDataProvider<TreeItem> {
	public abstract readonly VIEW_ITEM_SHOW_SOURCE_COMMAND_ID: string;
	public abstract readonly VIEW_ITEM_DELETE_COMMAND_ID: string;

	public static readonly EXCLUDE_PATTERN = KAOTO_EXCLUDE_PATTERN;

	protected readonly _onDidChangeTreeData: EventEmitter<TreeItemType> = new EventEmitter<TreeItemType>();
	readonly onDidChangeTreeData: Event<TreeItemType> = this._onDidChangeTreeData.event;

	protected fileWatcher!: FileSystemWatcher;

	/** Debounce timer for refresh operations */
	private refreshDebounceTimer?: NodeJS.Timeout;
	private readonly DEBOUNCE_MS = 300;

	/** Cached file search results */
	private cachedFiles: Uri[] | undefined;
	private cacheInvalidated = true;

	/** Cache for pom.xml existence checks */
	private readonly pomXmlCache = new Map<string, boolean>();

	/**
	 * Initialize the file watcher. Must be called by subclasses after their constructor initialization.
	 */
	protected initFileWatcher(): void {
		const filePattern = this.getFilePattern();
		this.fileWatcher = workspace.createFileSystemWatcher(filePattern);
		const invalidateAndRefresh = () => {
			this.invalidateCache();
			this.refresh();
		};
		this.fileWatcher.onDidChange(invalidateAndRefresh);
		this.fileWatcher.onDidCreate(invalidateAndRefresh);
		this.fileWatcher.onDidDelete(invalidateAndRefresh);
	}

	/**
	 * Invalidate the cached file search results
	 */
	protected invalidateCache(): void {
		this.cacheInvalidated = true;
		this.pomXmlCache.clear();
	}

	/**
	 * Get the file pattern to watch for changes
	 */
	protected abstract getFilePattern(): string;

	/**
	 * Get the exclude pattern for file search
	 */
	protected abstract getExcludePattern(): string;

	/**
	 * Handle configuration file pattern changes
	 */
	protected abstract onConfigurationChange(): void;

	/**
	 * Create a folder tree item
	 * @param name The folder name
	 * @param folderUri The folder URI
	 * @param isUnderMavenRoot Whether this folder is under a Maven root
	 * @param isMavenRoot Whether this folder is a Maven root (contains pom.xml)
	 * @param isWorkspaceRoot Whether this is a workspace root folder
	 */
	protected abstract createFolderItem(name: string, folderUri: Uri, isUnderMavenRoot: boolean, isMavenRoot: boolean, isWorkspaceRoot?: boolean): TFolder;

	/**
	 * Convert a file to a tree item
	 * @param file The file URI
	 * @param isUnderMavenRoot Whether the file is under a Maven root
	 * @param isTopLevelWithinWorkspace Whether the file is at the top level within the workspace
	 */
	protected abstract toTreeItemForFile(file: Uri, isUnderMavenRoot: boolean, isTopLevelWithinWorkspace: boolean): Promise<TreeItem>;

	/**
	 * Check if a tree item is a folder item created by this provider
	 * @param element The tree item to check
	 */
	protected abstract isFolderItem(element: TreeItem): element is TFolder;

	/**
	 * Optional: Set context when files are found/not found
	 * @param hasFiles Whether files were found
	 */
	protected setContext?(hasFiles: boolean): void;

	/**
	 * Refresh the tree view with debouncing to prevent rapid successive refreshes
	 */
	refresh(): void {
		if (this.refreshDebounceTimer) {
			clearTimeout(this.refreshDebounceTimer);
		}
		this.refreshDebounceTimer = setTimeout(() => {
			this._onDidChangeTreeData.fire();
		}, this.DEBOUNCE_MS);
	}

	/**
	 * Force an immediate refresh without debouncing (for specific item updates)
	 * @param item Optional specific item to refresh
	 */
	protected refreshImmediate(item?: TreeItem): void {
		if (this.refreshDebounceTimer) {
			clearTimeout(this.refreshDebounceTimer);
			this.refreshDebounceTimer = undefined;
		}
		this._onDidChangeTreeData.fire(item);
	}

	dispose(): void {
		if (this.refreshDebounceTimer) {
			clearTimeout(this.refreshDebounceTimer);
			this.refreshDebounceTimer = undefined;
		}
		this._onDidChangeTreeData.dispose();
		this.fileWatcher?.dispose();
	}

	getTreeItem(element: TreeItem): TreeItem {
		return element;
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		// Use cached files if available, otherwise fetch and cache
		if (this.cacheInvalidated || !this.cachedFiles) {
			this.cachedFiles = await workspace.findFiles(this.getFilePattern(), this.getExcludePattern());
			this.cacheInvalidated = false;
		}

		const files = this.cachedFiles;

		if (this.setContext) {
			this.setContext(files.length > 0);
		}

		if (!element) {
			return await this.getRootChildren(files);
		}
		if (this.isFolderItem(element)) {
			return await this.getFolderChildren(files, element);
		}
		return [];
	}

	/**
	 * Get the children for the root level
	 * @param files The files to build children for
	 * @returns The children
	 */
	protected async getRootChildren(files: readonly Uri[]): Promise<TreeItem[]> {
		const wfs = workspace.workspaceFolders || [];
		if (wfs.length === 1) {
			return await this.buildChildrenForPath(files, wfs[0].uri.fsPath, false, true);
		}
		const filteredWfs = wfs.filter((wf) => files.some((f) => f.fsPath.startsWith(wf.uri.fsPath + sep)));
		const folders = await Promise.all(
			filteredWfs.map(async (wf) => {
				const isMavenRoot = await this.checkPomXmlExists(wf.uri.fsPath);
				return this.createFolderItem(wf.name, wf.uri, false, isMavenRoot, true);
			}),
		);
		return folders;
	}

	/**
	 * Get the children for a folder
	 * @param files The files to build children for
	 * @param folder The folder to get the children for
	 * @returns The children
	 */
	protected async getFolderChildren(files: readonly Uri[], folder: TFolder): Promise<TreeItem[]> {
		return await this.buildChildrenForPath(files, folder.folderUri.fsPath, folder.isUnderMavenRoot, false);
	}

	/**
	 * Build children for a path
	 * @param files The files to build children for
	 * @param parentPath The parent path
	 * @param ancestorUnderMavenRoot Whether the ancestor is under a Maven root
	 * @param parentIsWorkspaceRoot Whether the parent is a workspace root
	 * @returns The children
	 */
	protected async buildChildrenForPath(
		files: readonly Uri[],
		parentPath: string,
		ancestorUnderMavenRoot: boolean,
		parentIsWorkspaceRoot: boolean,
	): Promise<TreeItem[]> {
		const directFiles: Uri[] = [];
		const subfolderNames = new Set<string>();
		const prefix = parentPath + sep;

		// filter the files to only include those that are direct files or subfolders
		for (const file of files) {
			if (!file.fsPath.startsWith(prefix)) {
				continue;
			}
			const parts = relative(parentPath, file.fsPath).split(sep);
			if (parts.length === 1) {
				directFiles.push(file);
			} else {
				subfolderNames.add(parts[0]);
			}
		}

		// check if the current path has a pom.xml file (using file system check)
		const hasPomXml = await this.checkPomXmlExists(parentPath);
		// if the current path is under a Maven root or has a pom.xml file, set the underMavenRootForChildren flag to true
		const underMavenRootForChildren = ancestorUnderMavenRoot || hasPomXml;

		// build subfolders for the current path
		const sortedSubfolderNames = Array.from(subfolderNames.values()).sort((a, b) => a.localeCompare(b));
		const subfolders = await Promise.all(
			sortedSubfolderNames.map(async (name) => {
				const childPath = join(parentPath, name);
				const isChildMavenRoot = await this.checkPomXmlExists(childPath);
				return this.createFolderItem(name, Uri.file(childPath), underMavenRootForChildren, isChildMavenRoot);
			}),
		);

		// build file items for the current path
		const sortedDirectFiles = directFiles.slice().sort((a, b) => a.fsPath.localeCompare(b.fsPath));
		const isTopLevelWithinWorkspace = parentIsWorkspaceRoot && !underMavenRootForChildren;
		const fileItems = await Promise.all(
			sortedDirectFiles.map(async (file) => this.toTreeItemForFile(file, underMavenRootForChildren, isTopLevelWithinWorkspace)),
		);

		// sort the items alphabetically
		const items: TreeItem[] = [...subfolders, ...fileItems];
		items.sort((a, b) => {
			// Folders first, then files, both alphabetically
			const aIsFolder = this.isFolderItem(a);
			const bIsFolder = this.isFolderItem(b);
			if (aIsFolder !== bIsFolder) {
				return aIsFolder ? -1 : 1;
			}
			const aLabel = this.getItemLabel(a).toLowerCase();
			const bLabel = this.getItemLabel(b).toLowerCase();
			return aLabel.localeCompare(bLabel);
		});

		return items;
	}

	/**
	 * Check if a pom.xml file exists in the given directory (with caching)
	 * @param dirPath The directory path to check
	 * @returns True if pom.xml exists, false otherwise
	 */
	protected async checkPomXmlExists(dirPath: string): Promise<boolean> {
		// Return cached result if available
		if (this.pomXmlCache.has(dirPath)) {
			return this.pomXmlCache.get(dirPath)!;
		}

		try {
			const pomUri = Uri.file(join(dirPath, 'pom.xml'));
			await workspace.fs.stat(pomUri);
			this.pomXmlCache.set(dirPath, true);
			return true;
		} catch {
			this.pomXmlCache.set(dirPath, false);
			return false;
		}
	}

	/**
	 * Get the label of an item
	 * @param item The item to get the label for
	 * @returns The label
	 */
	protected getItemLabel(item: TreeItem): string {
		// if the item has a label property that is a string, return it
		if (typeof item.label === 'string') {
			return item.label;
		}
		// if the item has a label property that is a TreeItemLabel, return the label
		if (this.isTreeItemLabel(item.label)) {
			return item.label.label;
		}
		return '';
	}

	/**
	 * Check if a value is a TreeItemLabel
	 * @param value The value to check
	 * @returns True if the value is a TreeItemLabel, false otherwise
	 */
	protected isTreeItemLabel(value: unknown): value is TreeItemLabel {
		return !!value && typeof (value as TreeItemLabel).label === 'string';
	}
}
