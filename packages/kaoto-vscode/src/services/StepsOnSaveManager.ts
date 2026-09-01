import * as vscode from 'vscode';
import * as path from 'path'; // NOSONAR
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { findFolderOfPomXml } from '../utils/Path';
import { normalizeVersionForSemver } from '../utils/Version';
import { satisfies } from 'compare-versions';
import { CamelTaskFactory } from '../tasks/CamelTaskFactory';
import { CamelCommandAPI } from '../executors/api/CamelCommandAPI';
import { KaotoCatalogService } from './KaotoCatalogService';
import { DEFAULT_CAMEL_VERSION_FALLBACK, KAOTO_EXECUTOR_TYPE_SETTING_ID, KAOTO_MAVEN_DEPENDENCIES_UPDATE_ON_SAVE_SETTING_ID } from '../constants';
import { ExecutorType } from '../executors/types/ExecutorTypes';

export class StepsOnSaveManager {
	private static _instance: StepsOnSaveManager | undefined;
	public static get instance(): StepsOnSaveManager {
		this._instance ??= new StepsOnSaveManager();
		return this._instance;
	}

	private readonly hasStepsByDocPath: Map<string, boolean> = new Map();
	private readonly watcherByDocPath: Map<string, vscode.FileSystemWatcher> = new Map();
	private readonly debounceByDocPath: Map<string, NodeJS.Timeout> = new Map();

	public markStepsAdded(docUri: vscode.Uri): void {
		const docPath = docUri.fsPath;
		if (this.hasStepsByDocPath.get(docPath) === true) {
			return; // steps already added
		}
		this.hasStepsByDocPath.set(docPath, true); // flag to indicate that steps have been added to the Kaoto UI
		this.ensureWatcher(docUri);
	}

	public disposeFor(docUri: vscode.Uri): void {
		const docPath = docUri.fsPath;
		this.hasStepsByDocPath.delete(docPath);
		const watcher = this.watcherByDocPath.get(docPath);
		if (watcher) {
			watcher.dispose();
			this.watcherByDocPath.delete(docPath);
		}
	}

	public async updateDependencies(docPath: string, pomPath: string, message?: string): Promise<void> {
		// Get executor type from VS Code settings to avoid circular dependency
		const vscodeConfig = vscode.workspace.getConfiguration();
		const executorType = vscodeConfig.get<ExecutorType>(KAOTO_EXECUTOR_TYPE_SETTING_ID);

		// Get version from catalog service - use selected catalog
		const catalogService = KaotoCatalogService.getInstance();
		const catalog = await catalogService.getSelectedIntegrationCatalog();
		const camelVersion = catalogService.getCamelVersionForCLI(catalog, executorType) || DEFAULT_CAMEL_VERSION_FALLBACK;

		if (satisfies(normalizeVersionForSemver(camelVersion), '<4.14')) {
			KaotoOutputChannel.logWarning('Camel version is <4.14. Skipping update on save for Camel dependencies in pom.xml.');
			vscode.window.setStatusBarMessage('Kaoto: Camel version is <4.14. Skipping update on save for Camel dependencies in pom.xml.', 5_000);
			return; // skip update on save for Camel <4.14
		}

		KaotoOutputChannel.logInfo(message ?? 'Updating Camel dependencies...');
		try {
			const result = await CamelCommandAPI.dependencyUpdate(pomPath, docPath, path.dirname(pomPath));
			const task = CamelTaskFactory.createSilent('Update Camel dependencies in pom.xml', result);
			await task.executeAndWaitWithProgress('Updating Camel dependencies in pom.xml');
			vscode.window.setStatusBarMessage(`Kaoto: Camel dependencies in '${pomPath}' successfully updated.`, 5_000);
			KaotoOutputChannel.logInfo('Camel dependencies update completed successfully.');
			this.hasStepsByDocPath.set(docPath, false);
		} catch (error) {
			KaotoOutputChannel.logError('Error updating Camel dependencies in pom.xml', error);
			await vscode.window.showErrorMessage('Camel dependencies could not be updated due to an unexpected error. Fix errors and save again to retry.');
		}
	}

	private ensureWatcher(docUri: vscode.Uri): void {
		const docPath = docUri.fsPath;
		if (this.watcherByDocPath.has(docPath)) {
			return; // watcher already exists
		}

		const workspaceFolder = vscode.workspace.getWorkspaceFolder(docUri);
		const pattern = workspaceFolder
			? new vscode.RelativePattern(workspaceFolder, path.relative(workspaceFolder.uri.fsPath, docUri.fsPath))
			: new vscode.RelativePattern(path.dirname(docUri.fsPath), path.basename(docUri.fsPath));

		const fsWatcher = vscode.workspace.createFileSystemWatcher(pattern);
		const onFsChange = () => {
			const existingTimeout = this.debounceByDocPath.get(docPath);
			if (existingTimeout) {
				clearTimeout(existingTimeout);
			}
			const timeout = setTimeout(() => {
				this.debounceByDocPath.delete(docPath);
				void this.onSaved(docPath); // debounce to avoid multiple calls to onSaved
			}, 300);
			this.debounceByDocPath.set(docPath, timeout);
		};
		fsWatcher.onDidChange(onFsChange);
		fsWatcher.onDidCreate(onFsChange);
		this.watcherByDocPath.set(docPath, fsWatcher); // store watcher for the document
	}

	private async onSaved(docPath: string): Promise<void> {
		const hadSteps = this.hasStepsByDocPath.get(docPath) === true;
		if (!hadSteps) {
			return;
		}

		const pomFolder = findFolderOfPomXml(docPath);
		if (!pomFolder) {
			return; // standalone project
		}
		const pomPath = path.join(pomFolder, 'pom.xml');

		const updateOnSave = vscode.workspace.getConfiguration().get<boolean>(KAOTO_MAVEN_DEPENDENCIES_UPDATE_ON_SAVE_SETTING_ID);
		if (!updateOnSave) {
			return;
		}

		// Check if affected pom.xml is open and dirty in any editor
		const pomDoc = vscode.workspace.textDocuments.find((doc) => doc.fileName === pomPath);
		if (pomDoc?.isDirty) {
			const selection = await vscode.window.showWarningMessage(
				'The pom.xml file has unsaved changes. Please save it before updating Camel dependencies.',
				'Save and Continue',
				'Cancel',
			);
			if (selection === 'Save and Continue') {
				await pomDoc.save();
			} else {
				KaotoOutputChannel.logInfo('Camel dependencies update cancelled because pom.xml was not saved.');
				return;
			}
		}

		await this.updateDependencies(docPath, pomPath, 'Detected added steps on save. Updating Camel dependencies...');
	}
}
