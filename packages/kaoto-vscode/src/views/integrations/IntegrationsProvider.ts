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
import { commands, Event, EventEmitter, FileSystemWatcher, TreeDataProvider, TreeItem, TreeItemCollapsibleState, TreeItemLabel, Uri, workspace } from 'vscode';
import { basename, join, relative, sep } from 'path'; // NOSONAR
import { parse } from 'yaml';
import { XMLParser } from 'fast-xml-parser';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';
import { Integration } from './Integration';
import { Route } from './Route';
import { Folder } from './Folder';
import { File } from './File';
import { CONTEXT_INTEGRATION_EXISTS, KAOTO_EXCLUDE_PATTERN, KAOTO_INTEGRATIONS_FILES_REGEXP_SETTING_ID } from '../../constants';
import { IntegrationFile, IntegrationFileIcon, IntegrationFileIconType, IntegrationFileDSL } from '../../types/IntegrationTreeItemType';

type TreeItemType = TreeItem | undefined | null | void;

export class IntegrationsProvider implements TreeDataProvider<TreeItem> {
	private readonly _onDidChangeTreeData: EventEmitter<TreeItemType> = new EventEmitter<TreeItemType>();
	readonly onDidChangeTreeData: Event<TreeItemType> = this._onDidChangeTreeData.event;

	public static readonly EXCLUDE_PATTERN = KAOTO_EXCLUDE_PATTERN;

	private fileWatcher: FileSystemWatcher;
	private filePattern: string;

	constructor(readonly extensionUriPath: string) {
		this.filePattern = this.getFilePattern();
		this.fileWatcher = workspace.createFileSystemWatcher(this.filePattern);

		this.fileWatcher.onDidChange(this.refresh.bind(this));
		this.fileWatcher.onDidCreate(this.refresh.bind(this));
		this.fileWatcher.onDidDelete(this.refresh.bind(this));

		workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(KAOTO_INTEGRATIONS_FILES_REGEXP_SETTING_ID)) {
				this.filePattern = this.getFilePattern();
				this.fileWatcher.dispose();

				this.fileWatcher = workspace.createFileSystemWatcher(this.filePattern);
				this.fileWatcher.onDidChange(this.refresh.bind(this));
				this.fileWatcher.onDidCreate(this.refresh.bind(this));
				this.fileWatcher.onDidDelete(this.refresh.bind(this));

				this.refresh();
			}
		});
	}

	/**
	 * Get the file pattern for the integrations view
	 * @returns The file pattern
	 */
	private getFilePattern(): string {
		const filesRegexp: string[] = workspace.getConfiguration().get(KAOTO_INTEGRATIONS_FILES_REGEXP_SETTING_ID) as string[];
		return '{' + filesRegexp.map((r) => '**/' + r).join(',') + '}';
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	dispose(): void {
		this.fileWatcher?.dispose();
	}

	getTreeItem(element: TreeItem): TreeItem {
		return element;
	}

	async getChildren(element?: TreeItem): Promise<TreeItem[]> {
		if (element instanceof Integration) {
			return await this.getRouteChildren(element);
		}
		const files = await workspace.findFiles(this.filePattern, IntegrationsProvider.EXCLUDE_PATTERN);
		this.setContext(files.length > 0);
		if (!element) {
			return await this.getRootChildren(files);
		}
		if (element instanceof Folder) {
			return await this.getFolderChildren(files, element);
		}
		return [];
	}

	/**
	 * Get the children for a route
	 * @param integration The integration to get the children for
	 * @returns The children
	 */
	private async getRouteChildren(integration: Integration): Promise<TreeItem[]> {
		if (integration.type !== 'route') {
			return [];
		}
		return (await this.getRoutesInsideIntegrationFile(integration.dsl, integration.filepath)) || [];
	}

	/**
	 * Get the children for the root
	 * @param files The files to build children for
	 * @returns The children
	 */
	private async getRootChildren(files: readonly Uri[]): Promise<TreeItem[]> {
		const wfs = workspace.workspaceFolders || [];
		if (wfs.length === 1) {
			return await this.buildChildrenForPath(files, wfs[0].uri.fsPath, false, true);
		}
		const folders = wfs
			.filter((wf) => files.some((f) => f.fsPath.startsWith(wf.uri.fsPath + sep)))
			.map(
				(wf) =>
					new Folder(
						wf.name,
						wf.uri,
						undefined,
						false,
						files.some((f) => f.fsPath === join(wf.uri.fsPath, 'pom.xml')),
						true,
					),
			);
		return folders;
	}

	/**
	 * Get the children for a folder
	 * @param files The files to build children for
	 * @param folder The folder to get the children for
	 * @returns The children
	 */
	private async getFolderChildren(files: readonly Uri[], folder: Folder): Promise<TreeItem[]> {
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
	private async buildChildrenForPath(
		files: readonly Uri[],
		parentPath: string,
		ancestorUnderMavenRoot: boolean,
		parentIsWorkspaceRoot: boolean,
	): Promise<TreeItem[]> {
		const directFiles: Uri[] = [];
		const subfolderNames = new Set<string>();
		const filePathSet = new Set<string>(files.map((f) => f.fsPath));
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

		// check if the current path has a pom.xml file
		const hasPomXml = directFiles.some((f) => basename(f.fsPath) === 'pom.xml');
		// if the current path is under a Maven root or has a pom.xml file, set the underMavenRootForChildren flag to true
		const underMavenRootForChildren = ancestorUnderMavenRoot || hasPomXml;

		// build subfolders for the current path
		const subfolders = Array.from(subfolderNames.values())
			.sort((a, b) => a.localeCompare(b))
			.map((name) => {
				const childPath = join(parentPath, name);
				const isChildMavenRoot = filePathSet.has(join(childPath, 'pom.xml'));
				return new Folder(name, Uri.file(childPath), undefined, underMavenRootForChildren, isChildMavenRoot);
			});

		// build file items for the current path
		const sortedDirectFiles = directFiles.slice().sort((a, b) => a.fsPath.localeCompare(b.fsPath));
		const fileItems = await Promise.all(
			sortedDirectFiles.map(async (file) => this.toTreeItemForFile(file, underMavenRootForChildren, parentIsWorkspaceRoot && !underMavenRootForChildren)),
		);

		// sort the items alphabetically
		const items: TreeItem[] = [...subfolders, ...fileItems];
		items.sort((a, b) => {
			// Folders first, then files/integrations, both alphabetically
			const aIsFolder = a instanceof Folder;
			const bIsFolder = b instanceof Folder;
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
	 * Get the label of an item
	 * @param item The item to get the label for
	 * @returns The label
	 */
	private getItemLabel(item: TreeItem): string {
		// if the item has a label property that is a string, return it (for example, a MarkdownString)
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
	private isTreeItemLabel(value: unknown): value is TreeItemLabel {
		return !!value && typeof (value as TreeItemLabel).label === 'string';
	}

	/**
	 * Set the context for the integrations view
	 * @param value The value to set the context for
	 */
	private setContext(value: boolean): void {
		commands.executeCommand('setContext', CONTEXT_INTEGRATION_EXISTS, value);
	}

	/**
	 * Get the file type of an integration file
	 * @param fileName The name of the file
	 * @returns The file type
	 */
	private getFileType(fileName: string): IntegrationFile {
		if (fileName.endsWith('.kamelet.yaml')) {
			return { dsl: 'yaml', type: 'kamelet', name: basename(fileName, '.kamelet.yaml'), icon: this.getIcon('kamelet'), description: 'Kamelet' };
		}
		if (fileName.endsWith('-pipe.yaml')) {
			return { dsl: 'yaml', type: 'pipe', name: basename(fileName, '-pipe.yaml'), icon: this.getIcon('pipe'), description: 'Pipe' };
		}
		if (fileName.endsWith('.pipe.yaml')) {
			return { dsl: 'yaml', type: 'pipe', name: basename(fileName, '.pipe.yaml'), icon: this.getIcon('pipe'), description: 'Pipe' };
		}
		if (fileName.endsWith('.camel.xml')) {
			return { dsl: 'xml', type: 'route', name: basename(fileName, '.camel.xml'), icon: this.getIcon('route'), description: 'Camel Route' };
		}
		// every unknown integration file is considered as Route integration file
		return { dsl: 'yaml', type: 'route', name: basename(fileName, '.camel.yaml'), icon: this.getIcon('route'), description: 'Camel Route' };
	}

	/**
	 * Get the icon for an integration type
	 * @param type The type of the integration
	 * @returns The icon
	 */
	private getIcon(type: IntegrationFileIconType): IntegrationFileIcon {
		const basePath = join(this.extensionUriPath, 'icons', 'integrations');
		switch (type) {
			case 'kamelet':
				return { light: Uri.file(join(basePath, 'kamelets-file-icon-light.png')), dark: Uri.file(join(basePath, 'kamelets-file-icon-dark.png')) };
			case 'pipe':
				return { light: Uri.file(join(basePath, 'pipes-file-icon-light.png')), dark: Uri.file(join(basePath, 'pipes-file-icon-dark.png')) };
			case 'route':
				return { light: Uri.file(join(basePath, 'routes-file-icon-light.png')), dark: Uri.file(join(basePath, 'routes-file-icon-dark.png')) };
			case 'route-child':
				return { light: Uri.file(join(basePath, 'route-black.svg')), dark: Uri.file(join(basePath, 'route-white.svg')) };
			// every unknown is considered as Route integration file
			default:
				return { light: Uri.file(join(basePath, 'routes-file-icon-light.png')), dark: Uri.file(join(basePath, 'routes-file-icon-dark.png')) };
		}
	}

	/**
	 * Convert a file to a tree item for the integrations view
	 * @param file The file to convert
	 * @param isUnderMavenRoot Whether the file is under a Maven root
	 * @param isTopLevelWithinWorkspace Whether the file is a top level within the workspace
	 * @returns The tree item
	 */
	private async toTreeItemForFile(file: Uri, isUnderMavenRoot: boolean = false, isTopLevelWithinWorkspace: boolean = true): Promise<TreeItem> {
		const filename = basename(file.fsPath);
		// Treat Camel, Kamelet and Pipe files as Integration items; others as plain files
		if (
			filename.endsWith('.camel.yaml') ||
			filename.endsWith('.camel.xml') ||
			filename.endsWith('.kamelet.yaml') ||
			filename.endsWith('.pipe.yaml') ||
			filename.endsWith('-pipe.yaml')
		) {
			const { dsl, type, name, icon, description } = this.getFileType(filename);
			let collapsibleState = TreeItemCollapsibleState.None;
			// if the file is a route integration file, get the routes inside the file and set the collapsible state accordingly
			if (type === 'route') {
				const routes = await this.getRoutesInsideIntegrationFile(dsl, file);
				collapsibleState = routes.length > 0 ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None;
			}
			return new Integration(name, filename, file, collapsibleState, type, dsl, icon, description, isUnderMavenRoot, isTopLevelWithinWorkspace);
		}
		return new File(file, filename);
	}

	/**
	 * Get the routes inside an integration file
	 * @param dsl The DSL of the integration file
	 * @param filePath The Uri path to the integration file
	 * @returns The routes
	 */
	private async getRoutesInsideIntegrationFile(dsl: IntegrationFileDSL, filePath: Uri): Promise<Route[]> {
		// parse the integration file based on the DSL
		switch (dsl) {
			case 'yaml':
				return await this.parseYamlFile(filePath);
			case 'xml':
				return await this.parseXmlFile(filePath);
			default:
				return [];
		}
	}

	/**
	 * Parse a YAML integration file and return the routes
	 * @param filePath The Uri path to the YAML file
	 * @returns The routes
	 */
	private async parseYamlFile(filePath: Uri): Promise<Route[]> {
		try {
			const fileBuffer = await workspace.fs.readFile(filePath);
			const content = new TextDecoder('utf-8').decode(fileBuffer);
			const parsedYaml = parse(content);

			// skip empty YAML files
			if (!parsedYaml || typeof parsedYaml !== 'object') {
				return [];
			}

			return Object.values(parsedYaml)
				.filter((item: any) => item.route)
				.map((item: any) => new Route(item.route.id, item.route.description, this.getIcon('route-child')));
		} catch (error) {
			KaotoOutputChannel.logError(`Error parsing YAML file: ${filePath.fsPath}`, error);
			return [];
		}
	}

	/**
	 * Parse a XML integration file and return the routes
	 * @param filePath The Uri path to the XML file
	 * @returns The routes
	 */
	private async parseXmlFile(filePath: Uri): Promise<Route[]> {
		try {
			const fileBuffer = await workspace.fs.readFile(filePath);
			if (!fileBuffer || fileBuffer.length === 0) {
				// skip empty XML file
				return [];
			}

			const fileContent = fileBuffer.toString().trim(); // remove unnecessary whitespaces

			const parser = new XMLParser({
				ignoreAttributes: false,
				attributeNamePrefix: '',
				parseAttributeValue: true,
				trimValues: true,
				isArray: (name) => name === 'route', // force route to always be an array
			});

			const parsedXml = parser.parse(fileContent);
			if (!parsedXml || typeof parsedXml !== 'object') {
				KaotoOutputChannel.logWarning(`Invalid XML structure: ${filePath.fsPath}`);
				return [];
			}

			// normalize route structure (handling JBang init vs Kaoto XML)
			let routes: any[] = [];
			if (parsedXml.routes?.route) {
				routes = Array.isArray(parsedXml.routes.route) ? parsedXml.routes.route : [parsedXml.routes.route];
			} else if (parsedXml.camel?.route) {
				routes = Array.isArray(parsedXml.camel.route) ? parsedXml.camel.route : [parsedXml.camel.route];
			} else {
				KaotoOutputChannel.logWarning(`No <route> elements found in XML: ${filePath.fsPath}`);
				return [];
			}

			return routes.map((route) => new Route(route.id, route.description, this.getIcon('route-child')));
		} catch (error) {
			KaotoOutputChannel.logError(`Error parsing XML file: ${filePath.fsPath}`, error);
			return [];
		}
	}
}
