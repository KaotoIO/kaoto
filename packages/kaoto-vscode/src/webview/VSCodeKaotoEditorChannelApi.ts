import {
	CanvasLayoutDirection,
	CatalogKind,
	ColorScheme,
	FileTypes,
	FileTypesResponse,
	ISettingsModel,
	KaotoEditorChannelApi,
	NodeLabelType,
	NodeToolbarTrigger,
	RuntimeMavenInformation,
	SettingsModel,
	StepUpdateAction,
	Suggestion,
	SuggestionRequestContext,
} from '@kaoto/kaoto/models';
import { BackendProxy } from '@kie-tools-core/backend/dist/api';
import { I18n } from '@kie-tools-core/i18n/dist/core';
import { DefaultVsCodeKieEditorChannelApiImpl } from '@kie-tools-core/vscode-extension/dist/DefaultVsCodeKieEditorChannelApiImpl';
import { VsCodeI18n } from '@kie-tools-core/vscode-extension/dist/i18n';
import { VsCodeNotificationsChannelApiImpl } from '@kie-tools-core/vscode-extension/dist/notifications/VsCodeNotificationsChannelApiImpl';
import { VsCodeKieEditorController } from '@kie-tools-core/vscode-extension/dist/VsCodeKieEditorController';
import { VsCodeKieEditorCustomDocument } from '@kie-tools-core/vscode-extension/dist/VsCodeKieEditorCustomDocument';
import { VsCodeWorkspaceChannelApiImpl } from '@kie-tools-core/vscode-extension/dist/workspace/VsCodeWorkspaceChannelApiImpl';
import { JavaCodeCompletionApi } from '@kie-tools-core/vscode-java-code-completion/dist/api';
import { ResourceContentService } from '@kie-tools-core/workspace/dist/api';
import * as path from 'path'; // NOSONAR
import * as vscode from 'vscode';
import {
	KAOTO_CANVAS_LAYOUT_DIRECTION_SETTING_ID,
	KAOTO_CATALOG_URL_SETTING_ID,
	KAOTO_COLOR_THEME_SETTING_ID,
	KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID,
	KAOTO_NODE_LABEL_SETTING_ID,
	KAOTO_NODE_TOOLBAR_TRIGGER_SETTING_ID,
	KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID,
	KAOTO_REST_CUSTOM_MEDIA_TYPES_SETTING_ID,
} from '../constants';
import { RuntimeType } from '../executors/types/ExecutorTypes';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { findClasspathRoot } from '../utils/ClasspathRootFinder';
import { resolvePaths } from '../utils/Path';
import { readKameletsFromDirectory } from '../services/KameletFileReader';
import { MavenRuntimeDetector } from '../services/MavenRuntimeDetector';
import { StepsOnSaveManager } from '../services/StepsOnSaveManager';
import { getSuggestions } from '../services/SuggestionRegistry';
import { KaotoCatalogService } from '../services/KaotoCatalogService';

export class VSCodeKaotoEditorChannelApi extends DefaultVsCodeKieEditorChannelApiImpl implements KaotoEditorChannelApi {
	private readonly currentEditedDocument: vscode.TextDocument | VsCodeKieEditorCustomDocument;

	constructor(
		/* NOSONAR — parameter count is dictated by the parent class DefaultVsCodeKieEditorChannelApiImpl */
		editor: VsCodeKieEditorController,
		resourceContentService: ResourceContentService,
		workspaceApi: VsCodeWorkspaceChannelApiImpl,
		backendProxy: BackendProxy,
		notificationsApi: VsCodeNotificationsChannelApiImpl,
		javaCodeCompletionApi: JavaCodeCompletionApi,
		viewType: string,
		i18n: I18n<VsCodeI18n>,
	) {
		super(editor, resourceContentService, workspaceApi, backendProxy, notificationsApi, javaCodeCompletionApi, viewType, i18n);
		this.currentEditedDocument = editor.document.document;

		// Dispose watcher when the webview/editor is closed
		editor.setupPanelOnDidDispose();
		editor.panel.onDidDispose(() => {
			StepsOnSaveManager.instance.disposeFor(this.currentEditedDocument.uri);
		});
	}

	/**
	 * @deprecated Use getVSCodeKaotoSettings().catalogUrl instead
	 * This method is kept for backward compatibility but now only returns custom catalog URLs.
	 * For catalog selection, use getVSCodeKaotoSettings().selectedCatalog
	 */
	async getCatalogURL(): Promise<string | undefined> {
		// Check for custom catalog URL setting
		const customCatalogUrl = vscode.workspace.getConfiguration().get<string>(KAOTO_CATALOG_URL_SETTING_ID);
		return customCatalogUrl || undefined;
	}

	async getVSCodeKaotoSettings(): Promise<ISettingsModel> {
		// Get custom catalog URL if set (takes precedence)
		const catalogUrl = vscode.workspace.getConfiguration().get<string | null>(KAOTO_CATALOG_URL_SETTING_ID);

		let runtimeCatalogName: string | undefined;
		let testingCatalogName: string | undefined;

		// Get selected catalog from KaotoCatalogService for standalone projects
		if (!(await KaotoCatalogService.isMavenProject(this.currentEditedDocument.uri))) {
			try {
				const catalogService = KaotoCatalogService.getInstance();
				const catalog = await catalogService.getSelectedCatalog(this.currentEditedDocument.uri);
				if (catalog) {
					// Use the catalog name directly from index.json (e.g., "Camel Main 4.14.7" or "Citrus 4.10.1")
					// Check runtime to determine if it's a testing catalog (Citrus) or runtime catalog
					const isCitrusCatalog = catalog.runtime.toLowerCase() === RuntimeType.CITRUS;

					if (isCitrusCatalog) {
						testingCatalogName = catalog.name;
					} else {
						runtimeCatalogName = catalog.name;
					}
				}
			} catch (error) {
				KaotoOutputChannel.logError('Failed to get selected catalog from KaotoCatalogService', error);
			}
		}

		const nodeLabel = vscode.workspace.getConfiguration().get<NodeLabelType | null>(KAOTO_NODE_LABEL_SETTING_ID);
		const nodeToolbarTrigger = vscode.workspace.getConfiguration().get<NodeToolbarTrigger | null>(KAOTO_NODE_TOOLBAR_TRIGGER_SETTING_ID);
		const colorThemeSetting = vscode.workspace.getConfiguration().get<ColorScheme | null>(KAOTO_COLOR_THEME_SETTING_ID);
		const canvasLayoutDirection = vscode.workspace.getConfiguration().get<CanvasLayoutDirection | null>(KAOTO_CANVAS_LAYOUT_DIRECTION_SETTING_ID);
		const customMediaTypes = vscode.workspace.getConfiguration().get<string[] | null>(KAOTO_REST_CUSTOM_MEDIA_TYPES_SETTING_ID);
		const apicurioRegistryUrl = vscode.workspace.getConfiguration().get<string | null>(KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID);
		const colorTheme = this.getColorSchemeFromVSCode(colorThemeSetting, vscode.window.activeColorTheme);

		const settingsModel: Partial<ISettingsModel> = {
			catalogUrl: catalogUrl ?? '',
			runtimeCatalogName: runtimeCatalogName,
			testingCatalogName: testingCatalogName,
			nodeLabel: nodeLabel ?? NodeLabelType.Description,
			nodeToolbarTrigger: nodeToolbarTrigger ?? NodeToolbarTrigger.onHover,
			colorScheme: colorTheme,
			canvasLayoutDirection: canvasLayoutDirection ?? CanvasLayoutDirection.SelectInCanvas,
			rest: {
				apicurioRegistryUrl: apicurioRegistryUrl ?? '',
				customMediaTypes: customMediaTypes ?? [],
			},
		};

		return new SettingsModel(settingsModel);
	}

	/**
	 * Provide metadata stored in the nearest .kaoto file found
	 * If none found, undefined is returned
	 */
	async getMetadata<T>(key: string): Promise<T | undefined> {
		const kaotoMetadatafile: vscode.Uri | undefined = await this.findExistingKaotoMetadataFile(this.currentEditedDocument.uri);
		if (kaotoMetadatafile !== undefined) {
			try {
				const kaotoMetadataFileContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(kaotoMetadatafile));
				const result = JSON.parse(kaotoMetadataFileContent)[key]; // in case the key i snot present, should we look to other potential .kaoto files that could contain the information?
				return this.normalizeMetadataFilePaths(result) as T;
			} catch (ex) {
				KaotoOutputChannel.logError(`Error when trying to get Metadata for key: ${key}`, ex);
				// Should we look to other potential .kaoto files and ignore one which is invalid?
				return undefined; // or should we throw a specific exception?
			}
		}
		return undefined;
	}

	/**
	 * Store metadata in the nearest .kaoto file found.
	 * If none found, create the file at workspace root if available, otherwise to the side of the Camel route
	 */
	async setMetadata<T>(key: string, value: T | undefined): Promise<void> {
		let kaotoMetadatafile: vscode.Uri | undefined = await this.findExistingKaotoMetadataFile(this.currentEditedDocument.uri);
		let kaotoMetadataFileContent;
		if (kaotoMetadatafile === undefined) {
			kaotoMetadataFileContent = '{}';
			kaotoMetadatafile = await this.findKaotoMetadataToCreate();
		} else {
			kaotoMetadataFileContent = new TextDecoder().decode(await vscode.workspace.fs.readFile(kaotoMetadatafile));
		}
		const jsonContent = JSON.parse(kaotoMetadataFileContent);
		if (value !== undefined && value !== null) {
			jsonContent[key] = value;
		} else {
			delete jsonContent[key];
		}
		await vscode.workspace.fs.writeFile(kaotoMetadatafile, new TextEncoder().encode(JSON.stringify(jsonContent, null, '\t')));
	}

	async getResourcesContentByType(fileType: FileTypes): Promise<FileTypesResponse[]> {
		if (fileType !== FileTypes.Kamelets) {
			return [];
		}

		const kameletsFolder = vscode.workspace.getConfiguration().get<string[]>(KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID);
		if (!Array.isArray(kameletsFolder) || kameletsFolder.length === 0) {
			return [];
		}

		const cwd = path.dirname(this.currentEditedDocument.uri.fsPath);
		const resolvedDirs = resolvePaths(kameletsFolder, cwd);
		const resources: FileTypesResponse[] = [];

		for (const dir of resolvedDirs) {
			const dirResources = await readKameletsFromDirectory(dir);
			resources.push(...dirResources);
		}

		return resources;
	}

	async getResourceContent(relativePath: string): Promise<string | undefined> {
		const classpathRoot: string = findClasspathRoot(this.currentEditedDocument.uri);
		try {
			const targetFile = path.resolve(classpathRoot, relativePath);
			return new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.file(targetFile)));
		} catch (ex) {
			// TODO: this is an ugly workaround that could lead to path clashes. 2 different APIs must be provided to retrieve content, one relative to classpath and the other relative to .kaoto metadata file
			const errorMessage = `Cannot retrieve content of ${relativePath} relatively to the classpath root ${classpathRoot}. Will attempt to use the relative path to .kaoto metadata file.`;
			KaotoOutputChannel.logError(errorMessage, ex);
			let kaotoMetadataFile = await this.findExistingKaotoMetadataFile(this.currentEditedDocument.uri);
			try {
				if (kaotoMetadataFile !== undefined) {
					const targetFile = path.resolve(path.dirname(kaotoMetadataFile.fsPath), relativePath);
					return new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.file(targetFile)));
				}
			} catch (ex2) {
				const errorMessage = `Cannot retrieve content of ${relativePath} relatively to the classpath root ${classpathRoot} neither the .kaoto metadata file ${kaotoMetadataFile}`;
				vscode.window.showErrorMessage(errorMessage);
				KaotoOutputChannel.logError(errorMessage, ex);
				return undefined;
			}
		}
	}

	async saveResourceContent(relativePath: string, content: string): Promise<void> {
		const classpathRoot: string = findClasspathRoot(this.currentEditedDocument.uri);
		try {
			const targetFile = path.resolve(classpathRoot, relativePath);
			await vscode.workspace.fs.writeFile(vscode.Uri.file(targetFile), new TextEncoder().encode(content));
		} catch (ex) {
			const errorMessage = `Cannot write content of ${relativePath} relatively to ${classpathRoot}`;
			vscode.window.showErrorMessage(errorMessage);
			KaotoOutputChannel.logError(errorMessage, ex);
			return undefined;
		}
	}

	async deleteResource(relativePath: string): Promise<boolean> {
		const classpathRoot: string = findClasspathRoot(this.currentEditedDocument.uri);
		try {
			const targetFile = path.resolve(classpathRoot, relativePath);
			await vscode.workspace.fs.delete(vscode.Uri.file(targetFile));
			return true;
		} catch (ex) {
			const errorMessage = `Cannot delete ${relativePath} relatively to ${classpathRoot}`;
			vscode.window.showErrorMessage(errorMessage);
			KaotoOutputChannel.logError(errorMessage, ex);
			return false;
		}
	}

	/**
	 * Check if a file exists at the specified relative path from the classpath root directory
	 * @param relativePath - The relative path (including filename) from the classpath root
	 * @returns Promise<boolean> - true if the file exists, false otherwise
	 */
	async isResourceExist(relativePath: string): Promise<boolean> {
		const classpathRoot: string = findClasspathRoot(this.currentEditedDocument.uri);
		try {
			const targetFile = path.resolve(classpathRoot, relativePath);
			await vscode.workspace.fs.stat(vscode.Uri.file(targetFile));
			return true;
		} catch (ex) {
			return false;
		}
	}

	async askUserForFileSelection(include: string, exclude?: string, options?: Record<string, unknown>): Promise<string[] | string | undefined> {
		try {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(this.currentEditedDocument.uri);
			if (!workspaceFolder) {
				vscode.window.showErrorMessage(
					`No associated workspace folder was found. Setup the workspace and place the file under the same workspace folder with ${this.currentEditedDocument.uri.fsPath}`,
				);
				return;
			}
			const includePattern = new vscode.RelativePattern(workspaceFolder, include);
			const files = await vscode.workspace.findFiles(includePattern, exclude);
			if (files.length === 0) {
				vscode.window.showErrorMessage(
					`No candidate file was found in the workspace folder. Place the file under the same workspace folder with  ${this.currentEditedDocument.uri.fsPath}`,
				);
				return;
			}
			let kaotoMetadataFile = await this.findExistingKaotoMetadataFile(this.currentEditedDocument.uri);
			kaotoMetadataFile ??= await this.findKaotoMetadataToCreate();
			return await vscode.window.showQuickPick(
				files.map((f) => {
					return this.toForwardSlash(path.relative(path.dirname(kaotoMetadataFile.fsPath), f.fsPath));
				}),
				options as vscode.QuickPickOptions,
			);
		} catch (ex) {
			const errorMessage = `Cannot get a user selection: ${(ex as Error).message}`;
			vscode.window.showErrorMessage(errorMessage);
			KaotoOutputChannel.logError(errorMessage, ex);
			return undefined;
		}
	}

	async getSuggestions(topic: string, word: string, context: SuggestionRequestContext): Promise<Suggestion[]> {
		return await getSuggestions(topic, word, context, this.currentEditedDocument.uri.fsPath);
	}

	async getRuntimeInfoFromMavenContext(): Promise<RuntimeMavenInformation | undefined> {
		return MavenRuntimeDetector.getRuntimeInfoFromMavenContext(this.currentEditedDocument.uri.fsPath);
	}

	async onStepUpdated(action: StepUpdateAction, stepType: CatalogKind, stepName: string): Promise<void> {
		KaotoOutputChannel.logInfo(`Step ${stepName} of type ${stepType} - Action: ${action}`);
		const docUri = this.currentEditedDocument.uri;
		switch (action) {
			case StepUpdateAction.Add:
			case StepUpdateAction.Replace:
				StepsOnSaveManager.instance.markStepsAdded(docUri); // mark that steps have been added or replaced in the Kaoto UI to trigger the update of the Camel dependencies in pom.xml on save
				break;
			default:
				break;
		}
	}

	private async findExistingKaotoMetadataFile(fileUri: vscode.Uri): Promise<vscode.Uri | undefined> {
		const parentFolder = path.dirname(fileUri.fsPath);
		if (parentFolder === fileUri.fsPath || parentFolder === '' || parentFolder === undefined) {
			return undefined;
		}
		try {
			const kaotoMetadataFileCandidate = vscode.Uri.file(path.join(parentFolder, '.kaoto'));
			await vscode.workspace.fs.stat(kaotoMetadataFileCandidate);
			return kaotoMetadataFileCandidate;
		} catch {
			return this.findExistingKaotoMetadataFile(vscode.Uri.file(parentFolder));
		}
	}

	private async findKaotoMetadataToCreate(): Promise<vscode.Uri> {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(this.currentEditedDocument.uri);
		if (workspaceFolder !== undefined) {
			return vscode.Uri.file(path.join(workspaceFolder?.uri.fsPath, '.kaoto'));
		} else {
			const parentFolder = path.basename(path.dirname(this.currentEditedDocument.uri.fsPath));
			return vscode.Uri.file(path.join(parentFolder, '.kaoto'));
		}
	}

	/**
	 * Forward slashes are the standard path separator in URIs and XSD schemaLocation references.
	 * On Windows, Node.js path APIs (e.g. path.relative()) return backslash separators instead,
	 * which breaks schema resolution for xs:include/xs:import. This normalizes Windows paths
	 * to the standard separator at the API boundary. On Linux/macOS this is a no-op.
	 *
	 * Applied to {@link askUserForFileSelection} output and {@link getMetadata} filePath arrays.
	 * Not needed for {@link getResourceContent} / {@link saveResourceContent} / {@link deleteResource}
	 * because `path.resolve()` accepts both separator styles on all platforms.
	 */
	private toForwardSlash(filePath: string): string {
		return filePath.replaceAll('\\', '/');
	}

	/**
	 * Existing .kaoto metadata files on Windows may have backslash paths persisted in filePath arrays.
	 * This normalizes them on read so that previously saved projects work after the forward-slash fix
	 * without requiring users to re-attach their schema files.
	 */
	private normalizeMetadataFilePaths(value: unknown): unknown {
		if (value === null || value === undefined || typeof value !== 'object') {
			return value;
		}
		if (Array.isArray(value)) {
			return value.map((v) => this.normalizeMetadataFilePaths(v));
		}
		const obj = value as Record<string, unknown>;
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(obj)) {
			if (k === 'filePath' && Array.isArray(v)) {
				result[k] = v.map((p) => (typeof p === 'string' ? this.toForwardSlash(p) : p));
			} else {
				result[k] = this.normalizeMetadataFilePaths(v);
			}
		}
		return result;
	}

	private getColorSchemeFromVSCode(colorSchemaSetting: ColorScheme | null | undefined, activeColorTheme: vscode.ColorTheme): ColorScheme {
		if (colorSchemaSetting === ColorScheme.Light || colorSchemaSetting === ColorScheme.Dark) {
			return colorSchemaSetting;
		}

		if (colorSchemaSetting === ColorScheme.Auto) {
			switch (activeColorTheme.kind) {
				case vscode.ColorThemeKind.Dark:
				case vscode.ColorThemeKind.HighContrast:
					return ColorScheme.Dark;
				case vscode.ColorThemeKind.Light:
				case vscode.ColorThemeKind.HighContrastLight:
					return ColorScheme.Light;
			}
		}

		return ColorScheme.Light;
	}
}
