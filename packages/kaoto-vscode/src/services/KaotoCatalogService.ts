import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CatalogLibrary, CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { RedHatMavenNotificationService } from './RedHatMavenNotificationService';
import { RuntimeType, ExecutorType } from '../executors/types/ExecutorTypes';
import { isRedHatBuild } from '../utils/Version';
import {
	COMMAND_SELECT_CAMEL_CATALOG,
	KAOTO_CATALOG_URL_SETTING_ID,
	KAOTO_EXECUTOR_TYPE_SETTING_ID,
	KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID,
	KAOTO_TESTING_CATALOG_NAME_SETTING_ID,
} from '../constants';

/**
 * Grouped catalogs by runtime type
 */
interface GroupedCatalogs {
	[runtime: string]: CatalogLibraryEntry[];
}

/**
 * Extended QuickPickItem with catalog data
 */
interface CatalogQuickPickItem extends vscode.QuickPickItem {
	catalog?: CatalogLibraryEntry;
}

/**
 * Service for managing Kaoto catalog selection and operations (Camel and Citrus)
 */
export class KaotoCatalogService {
	private static instance: KaotoCatalogService;
	private catalogs: CatalogLibraryEntry[] = [];
	private statusBarItem: vscode.StatusBarItem | undefined;
	private readonly catalogBasePath: string;
	private readonly catalogIndexPath: string;
	private readonly redHatNotificationService: RedHatMavenNotificationService;
	private lastNotifiedRedHatVersion: string | undefined;

	constructor(private readonly context: vscode.ExtensionContext) {
		// Path to the catalog directory copied by webpack during build
		this.catalogBasePath = path.join(context.extensionPath, 'dist', 'webview', 'editors', 'kaoto', 'camel-catalog');
		this.catalogIndexPath = path.join(this.catalogBasePath, 'index.json');
		this.redHatNotificationService = new RedHatMavenNotificationService(context);
		KaotoCatalogService.instance = this;
	}

	/**
	 * Get the singleton instance
	 */
	public static getInstance(): KaotoCatalogService {
		if (!KaotoCatalogService.instance) {
			throw new Error('KaotoCatalogService not initialized. Call initialize() first.');
		}
		return KaotoCatalogService.instance;
	}

	/**
	 * Initialize the catalog service by loading available catalogs
	 */
	public async initialize(): Promise<void> {
		try {
			await this.loadCatalogs();
			KaotoOutputChannel.logInfo(`Loaded ${this.catalogs.length} Camel catalog definitions`);

			const defaultCatalog = this.getDefaultCatalog();
			if (defaultCatalog) {
				KaotoOutputChannel.logInfo(`Default catalog: ${defaultCatalog.name}`);
			} else {
				KaotoOutputChannel.logWarning('No default catalog found');
			}
		} catch (error) {
			KaotoOutputChannel.logError('Failed to initialize KaotoCatalogService', error);
			vscode.window.showErrorMessage('Failed to load Camel catalogs. Some features may not work correctly.');
		}
	}

	/**
	 * Load catalogs from custom URL when configured, otherwise from local index.json
	 */
	private getCustomCatalogUrl(): string | undefined {
		return vscode.workspace.getConfiguration().get<string | null>(KAOTO_CATALOG_URL_SETTING_ID)?.trim() || undefined;
	}

	private async loadCatalogs(): Promise<void> {
		const customCatalogUrl = this.getCustomCatalogUrl();

		if (customCatalogUrl) {
			try {
				const response = await fetch(customCatalogUrl);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
				}

				const catalogIndex = (await response.json()) as CatalogLibrary;
				this.catalogs = catalogIndex.definitions || [];
				KaotoOutputChannel.logInfo(`Loaded catalog index from custom URL: ${customCatalogUrl}`);
				return;
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				KaotoOutputChannel.logWarning(`Failed to load catalog index from custom URL ${customCatalogUrl}: ${errorMessage}`);
				void vscode.window.showWarningMessage(
					`Failed to fetch Kaoto catalog from setting "kaoto.catalog.url". Falling back to local node_modules catalog. ${errorMessage}`,
				);
			}
		}

		try {
			const indexContent = await fs.promises.readFile(this.catalogIndexPath, 'utf-8');
			const catalogIndex: CatalogLibrary = JSON.parse(indexContent);
			this.catalogs = catalogIndex.definitions || [];
		} catch (error) {
			KaotoOutputChannel.logError(`Failed to load catalog index from ${this.catalogIndexPath}`, error);
			throw error;
		}
	}

	/**
	 * Get all available catalogs
	 */
	public getCatalogs(): CatalogLibraryEntry[] {
		return [...this.catalogs];
	}

	/**
	 * Group catalogs by runtime type
	 */
	public getCatalogsByRuntime(): GroupedCatalogs {
		const grouped: GroupedCatalogs = {};

		for (const catalog of this.catalogs) {
			const runtime = catalog.runtime;
			if (!grouped[runtime]) {
				grouped[runtime] = [];
			}
			grouped[runtime].push(catalog);
		}

		return grouped;
	}

	/**
	 * Normalize runtime name from index.json to simplified format
	 */
	private normalizeRuntime(runtime: string): RuntimeType {
		const normalized = runtime.toLowerCase().replaceAll(/\s+/g, '-');
		if (normalized.includes('citrus')) {
			return RuntimeType.CITRUS;
		} else if (normalized.includes('spring')) {
			return RuntimeType.SPRING_BOOT;
		} else if (normalized.includes('quarkus')) {
			return RuntimeType.QUARKUS;
		}
		return RuntimeType.MAIN;
	}

	/**
	 * Build display label from catalog definition
	 */
	public static buildDisplayLabel(catalog: CatalogLibraryEntry): string {
		return `Camel ${catalog.runtime} ${catalog.version}`;
	}

	/**
	 * Find catalog definition by name (e.g., "Camel Main 4.14.7" or "Citrus 4.10.1")
	 */
	private findCatalogByName(name: string): CatalogLibraryEntry | undefined {
		return this.catalogs.find((c) => c.name === name);
	}

	/**
	 * Get the selected catalog for a workspace, or default if none selected
	 * Automatically determines whether to use integration or test catalog based on file type
	 */
	public async getSelectedCatalog(resourceUri?: vscode.Uri): Promise<CatalogLibraryEntry | undefined> {
		// Determine file type and delegate to appropriate method
		if (resourceUri && this.isKaotoCitrusTestFile(resourceUri)) {
			return this.getSelectedTestCatalog(resourceUri);
		} else {
			return this.getSelectedIntegrationCatalog(resourceUri);
		}
	}

	private async getSelectedCatalogByKey(
		settingKey: string,
		catalogTypeLabel: string,
		getDefault: () => CatalogLibraryEntry | undefined,
		resourceUri?: vscode.Uri,
	): Promise<CatalogLibraryEntry | undefined> {
		const config = vscode.workspace.getConfiguration('kaoto', resourceUri);
		const catalogName = config.get<string>(settingKey);

		if (catalogName) {
			const catalog = this.findCatalogByName(catalogName);
			if (catalog) {
				return catalog;
			}
			KaotoOutputChannel.logWarning(
				`Invalid ${catalogTypeLabel} catalog name in settings: "${catalogName}". ` +
					`This catalog is not available. Using default catalog instead. ` +
					`Use the status bar or command palette to select a valid catalog.`,
			);
			vscode.window
				.showWarningMessage(`Kaoto: Invalid ${catalogTypeLabel} catalog name "${catalogName}". Using default instead.`, 'Select Valid Catalog')
				.then((choice) => {
					if (choice === 'Select Valid Catalog') {
						vscode.commands.executeCommand(COMMAND_SELECT_CAMEL_CATALOG);
					}
				});
		}

		return getDefault();
	}

	/**
	 * Get the selected integration catalog for a workspace, or default if none selected
	 */
	public async getSelectedIntegrationCatalog(resourceUri?: vscode.Uri): Promise<CatalogLibraryEntry | undefined> {
		return this.getSelectedCatalogByKey('runtimeCatalogName', 'runtime', () => this.getDefaultIntegrationCatalog(), resourceUri);
	}

	/**
	 * Get the selected test catalog for a workspace, or default if none selected
	 */
	public async getSelectedTestCatalog(resourceUri?: vscode.Uri): Promise<CatalogLibraryEntry | undefined> {
		return this.getSelectedCatalogByKey('testingCatalogName', 'testing', () => this.getDefaultTestCatalog(), resourceUri);
	}

	/**
	 * Set the selected catalog for a workspace
	 * Automatically determines whether to store as integration or test catalog based on catalog runtime
	 */
	public async setSelectedCatalog(catalog: CatalogLibraryEntry, resourceUri?: vscode.Uri): Promise<void> {
		// Determine if this is a Citrus catalog
		const isCitrusCatalog = this.normalizeRuntime(catalog.runtime) === RuntimeType.CITRUS;

		if (isCitrusCatalog) {
			await this.setSelectedTestCatalog(catalog, resourceUri);
		} else {
			await this.setSelectedIntegrationCatalog(catalog, resourceUri);
		}
	}

	private applyStatusBarLabel(displayLabel: string): void {
		if (this.statusBarItem) {
			this.statusBarItem.text = `$(package) ${displayLabel}`;
			this.statusBarItem.tooltip = 'Select Camel Catalog Version';
			this.statusBarItem.command = COMMAND_SELECT_CAMEL_CATALOG;
			this.statusBarItem.show();
		}
	}

	private async setSelectedCatalogByType(
		catalog: CatalogLibraryEntry,
		resourceUri: vscode.Uri | undefined,
		options: {
			settingKey: string;
			logLabel: string;
			getPrevious: (uri?: vscode.Uri) => Promise<CatalogLibraryEntry | undefined>;
			isActiveFileMatch: (uri: vscode.Uri) => boolean;
			reopenMessage: string;
		},
	): Promise<void> {
		const previousCatalog = await options.getPrevious(resourceUri);

		const isCatalogChanging =
			previousCatalog?.version !== catalog.version || this.normalizeRuntime(previousCatalog.runtime) !== this.normalizeRuntime(catalog.runtime);

		const config = vscode.workspace.getConfiguration('kaoto', resourceUri);
		await config.update(options.settingKey, catalog.name, vscode.ConfigurationTarget.Workspace);

		const displayLabel = KaotoCatalogService.buildDisplayLabel(catalog);
		KaotoOutputChannel.logInfo(`Selected ${options.logLabel} catalog: ${displayLabel}`);

		this.applyStatusBarLabel(displayLabel);

		const activeKaotoUri = this.getActiveKaotoDocumentUri();
		if (isCatalogChanging && activeKaotoUri && options.isActiveFileMatch(activeKaotoUri)) {
			const action = await vscode.window.showInformationMessage(options.reopenMessage, 'Reopen');
			if (action === 'Reopen') {
				await this.reopenCurrentEditor(activeKaotoUri);
			}
		}
	}

	/**
	 * Set the selected integration catalog for a workspace
	 */
	public async setSelectedIntegrationCatalog(catalog: CatalogLibraryEntry, resourceUri?: vscode.Uri): Promise<void> {
		return this.setSelectedCatalogByType(catalog, resourceUri, {
			settingKey: 'runtimeCatalogName',
			logLabel: 'integration',
			getPrevious: (uri) => this.getSelectedIntegrationCatalog(uri),
			isActiveFileMatch: (uri) => this.isKaotoIntegrationFile(uri),
			reopenMessage: 'Integration catalog version changed. Reopen editor to apply changes.',
		});
	}

	/**
	 * Set the selected test catalog for a workspace
	 */
	public async setSelectedTestCatalog(catalog: CatalogLibraryEntry, resourceUri?: vscode.Uri): Promise<void> {
		return this.setSelectedCatalogByType(catalog, resourceUri, {
			settingKey: 'testingCatalogName',
			logLabel: 'test',
			getPrevious: (uri) => this.getSelectedTestCatalog(uri),
			isActiveFileMatch: (uri) => this.isKaotoCitrusTestFile(uri),
			reopenMessage: 'Test catalog version changed. Reopen editor to apply changes.',
		});
	}

	/**
	 * Get the default catalog based on file type
	 * - For test files: latest Citrus catalog
	 * - For integration files: latest Camel Main RedHat version (or latest Main if no RedHat version available)
	 */
	public getDefaultCatalog(resourceUri?: vscode.Uri): CatalogLibraryEntry | undefined {
		// Check if this is a Citrus test file
		const isCitrusTest = resourceUri ? this.isKaotoCitrusTestFile(resourceUri) : false;

		if (isCitrusTest) {
			return this.getDefaultTestCatalog();
		} else {
			return this.getDefaultIntegrationCatalog();
		}
	}

	private static getLatestByVersion(catalogs: CatalogLibraryEntry[]): CatalogLibraryEntry | undefined {
		if (catalogs.length === 0) {
			return undefined;
		}
		return catalogs.toSorted((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
	}

	/**
	 * Get the default integration catalog (latest Camel Main RedHat version, or latest Main if no RedHat version available)
	 */
	public getDefaultIntegrationCatalog(): CatalogLibraryEntry | undefined {
		const mainCatalogs = this.catalogs.filter((c) => c.runtime === 'Main');

		if (mainCatalogs.length === 0) {
			return this.catalogs[0];
		}

		const redhatCatalogs = mainCatalogs.filter((c) => isRedHatBuild(c.version));
		return KaotoCatalogService.getLatestByVersion(redhatCatalogs) ?? KaotoCatalogService.getLatestByVersion(mainCatalogs);
	}

	/**
	 * Get the default test catalog (latest Citrus catalog)
	 */
	public getDefaultTestCatalog(): CatalogLibraryEntry | undefined {
		const citrusCatalogs = this.catalogs.filter((c) => c.runtime.toLowerCase() === RuntimeType.CITRUS);
		return KaotoCatalogService.getLatestByVersion(citrusCatalogs);
	}
	/**
	 * Get the CLI version (JBang version) from catalog selection
	 * This is used for the -Dcamel.jbang.version system property in JBang executor
	 *
	 * @param catalog The catalog definition to get CLI version for
	 * @returns The CLI version to use with -Dcamel.jbang.version, or undefined if not found
	 */
	public getCliVersionForJBang(catalog: CatalogLibraryEntry | undefined): string | undefined {
		if (!catalog) {
			return undefined;
		}

		return catalog.cliVersion;
	}

	/**
	 * Get the Camel version for CLI from catalog selection
	 * For Camel Launcher: Uses the executorVersion field (JAR version)
	 * For JBang: Uses the catalog version directly (for --camel-version flag)
	 * (handles cases where catalog version != Camel version, e.g., Quarkus platform BOM versions, RedHat build numbers)
	 *
	 * @param catalog The catalog definition to get Camel version for
	 * @param executorType The type of executor being used (optional, defaults to current executor)
	 * @returns The Camel version to use with --camel-version parameter, or undefined if not found
	 */
	public getCamelVersionForCLI(catalog: CatalogLibraryEntry | undefined, executorType?: ExecutorType): string | undefined {
		if (!catalog) {
			return undefined;
		}

		// For Camel Launcher, use executorVersion if available (JAR is version-specific)
		// For JBang, always use catalog version (--camel-version flag needs catalog version)
		if (executorType === 'camel-launcher' && catalog.executorVersion) {
			return catalog.executorVersion;
		}

		// For JBang with Quarkus runtime, use frameworkVersion (Quarkus platform version)
		const runtime = this.getRuntimeForCLI(catalog);
		if (executorType === 'jbang' && runtime === RuntimeType.QUARKUS && catalog.frameworkVersion) {
			return catalog.frameworkVersion;
		}

		// For JBang or when executorVersion is not available, use Camel catalog version
		return catalog.camelCatalogVersion ? catalog.camelCatalogVersion : catalog.version;
	}

	/**
	 * Get the runtime parameter for CLI from catalog selection
	 * Normalizes the runtime name to the format expected by Camel CLI
	 *
	 * @param catalog The catalog definition to get runtime for
	 * @returns The runtime to use with --runtime parameter, or undefined if not found
	 */
	public getRuntimeForCLI(catalog: CatalogLibraryEntry | undefined): RuntimeType | undefined {
		if (!catalog) {
			return undefined;
		}

		// Use normalized runtime
		return this.normalizeRuntime(catalog.runtime);
	}

	/**
	 * Get both Camel version and runtime for CLI from catalog selection
	 * Convenience method that combines getCamelVersionForCLI and getRuntimeForCLI
	 *
	 * @param catalog The catalog definition to get CLI parameters for
	 * @param executorType The type of executor being used (optional)
	 * @returns Object with executorVersion and runtime, or empty object if catalog is undefined
	 */
	public getCLIParameters(catalog: CatalogLibraryEntry | undefined, executorType?: ExecutorType): { executorVersion?: string; runtime?: RuntimeType } {
		if (!catalog) {
			return {};
		}

		return {
			executorVersion: this.getCamelVersionForCLI(catalog, executorType),
			runtime: this.getRuntimeForCLI(catalog),
		};
	}

	/**
	 * Check if a workspace is a Maven project
	 */
	public static async isMavenProject(resourceUri: vscode.Uri): Promise<boolean> {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(resourceUri);
		if (!workspaceFolder) {
			return false;
		}

		const pomPath = path.join(workspaceFolder.uri.fsPath, 'pom.xml');
		try {
			await fs.promises.access(pomPath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Create and show the status bar item
	 */
	public createStatusBarItem(): vscode.StatusBarItem {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

		this.statusBarItem.command = COMMAND_SELECT_CAMEL_CATALOG;
		this.statusBarItem.tooltip = 'Select Camel Catalog Version';

		// Don't show status bar initially - wait for Kaoto editor to be active
		KaotoOutputChannel.logInfo('Status bar created (hidden until Kaoto editor is active)');

		// Update status bar based on current editor
		void this.updateStatusBar();

		// Listen for workspace folder changes
		this.context.subscriptions.push(
			vscode.workspace.onDidChangeWorkspaceFolders(() => {
				void this.updateStatusBar();
			}),
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration(KAOTO_CATALOG_URL_SETTING_ID)) {
					void this.loadCatalogs().then(() => this.updateStatusBar());
				} else if (e.affectsConfiguration(KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID) || e.affectsConfiguration(KAOTO_TESTING_CATALOG_NAME_SETTING_ID)) {
					void this.updateStatusBar();
				}
				if (e.affectsConfiguration(KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID)) {
					void this.checkAndShowRedHatNotification();
				}
			}),
			vscode.window.onDidChangeActiveTextEditor(() => {
				void this.updateStatusBar();
			}),
			vscode.window.tabGroups.onDidChangeTabGroups(() => {
				void this.updateStatusBar();
			}),
			vscode.window.tabGroups.onDidChangeTabs(() => {
				void this.updateStatusBar();
			}),
		);

		return this.statusBarItem;
	}

	/**
	 * Update the status bar item text and visibility
	 * Status bar is visible when:
	 * - A Kaoto editor is actively open/focused
	 * - The workspace is not a Maven project
	 */
	private async updateStatusBar(): Promise<void> {
		if (!this.statusBarItem) {
			return;
		}

		const documentUri = this.getActiveKaotoDocumentUri();

		// If no active Kaoto editor found, hide status bar
		if (!documentUri) {
			this.statusBarItem.hide();
			return;
		}

		// Check if Maven project
		const isMaven = await KaotoCatalogService.isMavenProject(documentUri);
		if (isMaven) {
			KaotoOutputChannel.logInfo('Status bar: Maven project detected, hiding status bar');
			this.statusBarItem.hide();
			return;
		}

		const selected = await this.getSelectedCatalog(documentUri);
		const catalog = selected ?? this.getDefaultCatalog(documentUri);
		if (!catalog) {
			KaotoOutputChannel.logWarning('Status bar: No catalog available, hiding');
			this.statusBarItem.hide();
			return;
		}

		if (!selected) {
			KaotoOutputChannel.logWarning('No catalog found for Kaoto file, using default');
		}

		this.applyStatusBarLabel(KaotoCatalogService.buildDisplayLabel(catalog));
		await this.checkAndShowRedHatNotification();
	}

	/**
	 * Get the active Kaoto document URI from either the focused webview tab or text editor
	 */
	private getActiveKaotoDocumentUri(): vscode.Uri | undefined {
		const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
		if (activeTab?.input && typeof activeTab.input === 'object' && activeTab.input !== null && 'uri' in activeTab.input) {
			const tabUri = (activeTab.input as { uri: vscode.Uri }).uri;
			if (this.isKaotoFile(tabUri)) {
				return tabUri;
			}
		}

		const activeEditor = vscode.window.activeTextEditor;
		if (activeEditor && this.isKaotoFile(activeEditor.document.uri)) {
			return activeEditor.document.uri;
		}

		return undefined;
	}

	/**
	 * Check if a file is a Kaoto-supported file (integration or test)
	 */
	private isKaotoFile(uri: vscode.Uri): boolean {
		return this.isKaotoIntegrationFile(uri) || this.isKaotoCitrusTestFile(uri);
	}

	/**
	 * Check if a file is a Kaoto integration file (camel, kamelet, pipe)
	 */
	private isKaotoIntegrationFile(uri: vscode.Uri): boolean {
		const fileName = path.basename(uri.fsPath);
		return /\.(camel|kamelet|pipe)\.(yaml|yml)$/.test(fileName) || /-pipe\.(yaml|yml)$/.test(fileName) || fileName.endsWith('.camel.xml');
	}

	/**
	 * Check if a file is a Kaoto Citrus test file
	 */
	private isKaotoCitrusTestFile(uri: vscode.Uri): boolean {
		const fileName = path.basename(uri.fsPath);
		return /\.citrus\.(yaml|yml)$/.test(fileName) || /\.citrus[.-](test|it)\.(yaml|yml)$/.test(fileName);
	}

	/**
	 * Show the catalog picker QuickPick
	 * @returns true if a catalog was selected, false if cancelled or no selection made
	 */
	public async showCatalogPicker(): Promise<boolean> {
		const resourceUri = this.getActiveKaotoDocumentUri();

		// Check if Maven project
		if (resourceUri && (await KaotoCatalogService.isMavenProject(resourceUri))) {
			vscode.window.showInformationMessage('Catalog version is managed by pom.xml in Maven projects.');
			return false;
		}

		if (this.getCustomCatalogUrl()) {
			await this.loadCatalogs();
		}

		// Determine if current file is a Citrus test file
		const isCitrusTestFile = resourceUri ? this.isKaotoCitrusTestFile(resourceUri) : false;

		const groupedCatalogs = this.getCatalogsByRuntime();
		const currentCatalog = await this.getSelectedCatalog(resourceUri);

		// Create QuickPick items grouped by runtime
		const items: CatalogQuickPickItem[] = [];

		for (const [runtime, catalogs] of Object.entries(groupedCatalogs)) {
			// Filter catalogs based on file type:
			// - For Citrus test files: show ONLY Citrus catalogs
			// - For integration files: show all catalogs EXCEPT Citrus
			const filteredCatalogs = catalogs.filter((catalog) => {
				const isCitrusCatalog = catalog.runtime.toLowerCase() === RuntimeType.CITRUS;
				if (isCitrusTestFile) {
					// For test files, only show Citrus catalogs
					return isCitrusCatalog;
				} else {
					// For integration files, exclude Citrus catalogs
					return !isCitrusCatalog;
				}
			});

			// Skip runtime group if no catalogs after filtering
			if (filteredCatalogs.length === 0) {
				continue;
			}

			// Add runtime header
			items.push({
				label: runtime,
				kind: vscode.QuickPickItemKind.Separator,
			});

			// Add catalog items for this runtime
			for (const catalog of filteredCatalogs) {
				const displayLabel = KaotoCatalogService.buildDisplayLabel(catalog);
				const isCurrent =
					currentCatalog?.version === catalog.version && this.normalizeRuntime(currentCatalog.runtime) === this.normalizeRuntime(catalog.runtime);
				items.push({
					label: isCurrent ? `$(check) ${displayLabel}` : displayLabel,
					detail: isCurrent ? 'Currently selected' : undefined,
					catalog: catalog,
				});
			}
		}

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: isCitrusTestFile ? 'Select Citrus Catalog Version' : 'Select Camel Catalog Version',
			matchOnDescription: true,
			matchOnDetail: true,
		});

		if (selected?.catalog) {
			const catalog = selected.catalog;
			await this.setSelectedCatalog(catalog, resourceUri);

			// Show Red Hat Maven notification if the selected catalog is a Red Hat version
			await this.checkAndShowRedHatNotification();

			return true; // Catalog was selected
		}

		return false; // No selection made (cancelled or closed)
	}

	/**
	 * Reopen the current editor (close and open again)
	 * This is used to apply catalog version changes to the active editor
	 */
	private async reopenCurrentEditor(uri: vscode.Uri): Promise<void> {
		try {
			// Close the current editor
			await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

			// Small delay to ensure the editor is fully closed
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Reopen the editor
			await vscode.commands.executeCommand('vscode.open', uri);

			KaotoOutputChannel.logInfo(`Reopened editor for ${uri.fsPath}`);
		} catch (error) {
			KaotoOutputChannel.logError(`Failed to reopen editor for ${uri.fsPath}`, error);
			vscode.window.showErrorMessage('Failed to reopen editor. Please close and reopen manually.');
		}
	}

	/**
	 * Show Red Hat Maven notification once per catalog version change.
	 * Only shown when a runtime integration file is active (not test files).
	 */
	private async checkAndShowRedHatNotification(): Promise<void> {
		try {
			const activeUri = this.getActiveKaotoDocumentUri();
			if (!activeUri || !this.isKaotoIntegrationFile(activeUri)) {
				return;
			}

			const catalog = await this.getSelectedIntegrationCatalog();

			if (!catalog || !this.redHatNotificationService.isRedHatCatalog(catalog.version)) {
				return;
			}

			if (this.lastNotifiedRedHatVersion === catalog.version) {
				return;
			}

			this.lastNotifiedRedHatVersion = catalog.version;
			const executorType = vscode.workspace.getConfiguration().get<ExecutorType>(KAOTO_EXECUTOR_TYPE_SETTING_ID) || 'jbang';
			await this.redHatNotificationService.showRedHatMavenNotification(catalog.version, executorType);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			KaotoOutputChannel.logWarning(`Failed to check Red Hat catalog notification: ${errorMsg}`);
		}
	}

	/**
	 * Dispose of resources
	 */
	public dispose(): void {
		this.statusBarItem?.dispose();
	}
}
