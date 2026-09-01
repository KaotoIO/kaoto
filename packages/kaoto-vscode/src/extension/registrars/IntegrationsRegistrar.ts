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
import * as vscode from 'vscode';
import path from 'path'; // NOSONAR
import { TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import {
	COMMAND_CAMEL_NEW_FILE,
	COMMAND_INTEGRATIONS_DELETE,
	COMMAND_INTEGRATIONS_KUBERNETES_RUN,
	COMMAND_INTEGRATIONS_REFRESH,
	COMMAND_INTEGRATIONS_RUN,
	COMMAND_INTEGRATIONS_RUN_ALL_WORKSPACES,
	COMMAND_INTEGRATIONS_RUN_FOLDER,
	COMMAND_INTEGRATIONS_RUN_WORKSPACE,
	COMMAND_INTEGRATIONS_SHOW_SOURCE,
	COMMAND_INTEGRATIONS_UPDATE_DEPENDENCIES,
	CONTEXT_WORKSPACE_HAS_POM_XML,
	STATE_SHOW_RUN_ALL_FOLDERS_MESSAGE,
	VIEW_INTEGRATIONS,
} from '../../constants';
import { NewCamelRouteCommand } from '../../commands/NewCamelRouteCommand';
import { NewCamelKameletCommand } from '../../commands/NewCamelKameletCommand';
import { NewCamelPipeCommand } from '../../commands/NewCamelPipeCommand';
import { NewCamelFileCommand } from '../../commands/NewCamelFileCommand';
import { NewCamelProjectCommand } from '../../commands/NewCamelProjectCommand';
import { IntegrationsProvider } from '../../views/integrations/IntegrationsProvider';
import { Integration } from '../../views/integrations/Integration';
import { Folder } from '../../views/integrations/Folder';
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';
import { CamelTaskFactory } from '../../tasks/CamelTaskFactory';
import { CamelTask, CamelTaskDefinition } from '../../tasks/CamelTask';
import { PortManager } from '../../services/PortManager';
import { StepsOnSaveManager } from '../../services/StepsOnSaveManager';
import { findFolderOfPomXml } from '../../utils/Path';
import { confirmFileDeleteDialog } from '../../utils/Modals';
import { safeGlobalStateGet, safeGlobalStateUpdate } from '../../utils/Vscode';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { sendCommandTrackingEvent } from './TrackingEvent';
import { IRegistrar } from './IRegistrar';

export class IntegrationsRegistrar implements IRegistrar {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly telemetryService: TelemetryService | undefined,
		private readonly portManager: PortManager,
	) {}

	async register(): Promise<void> {
		this.registerIntegrationsView();
		await this.hideIntegrationsViewButtonsForMavenProjects();
		this.registerNewCamelFilesCommands();
		this.registerNewCamelProjectCommands();
		this.registerKubernetesRunCommands();
		this.registerRunIntegrationCommands(this.portManager);
		this.registerRunSourceDirCommands(this.portManager);
	}

	public registerIntegrationsView() {
		const integrationsProvider = new IntegrationsProvider(this.context.extensionUri.path);
		const integrationsTreeView = vscode.window.createTreeView(VIEW_INTEGRATIONS, {
			treeDataProvider: integrationsProvider,
			showCollapseAll: true,
		});
		const dispose = {
			dispose: () => integrationsProvider.dispose(),
		};
		const refreshCommand = vscode.commands.registerCommand(COMMAND_INTEGRATIONS_REFRESH, () => integrationsProvider.refresh());
		this.context.subscriptions.push(integrationsTreeView, dispose, refreshCommand);

		this.registerIntegrationsItemsContextMenu(integrationsProvider);
	}

	public registerNewCamelFilesCommands() {
		// register custom command for a Camel YAML or XML file creation (eg. used in Integrations view Welcome Content)
		const newFileCommand = vscode.commands.registerCommand(COMMAND_CAMEL_NEW_FILE, async () => {
			await new NewCamelFileCommand().create();
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_CAMEL_NEW_FILE);
		});
		// register commands for new Camel files creation using YAML or XML DSL - Camel Routes, Kamelets, Pipes
		const newRouteCommand = vscode.commands.registerCommand(NewCamelRouteCommand.ID_COMMAND_CAMEL_ROUTE, async () => {
			await new NewCamelRouteCommand().create();
			await sendCommandTrackingEvent(this.telemetryService, NewCamelRouteCommand.ID_COMMAND_CAMEL_ROUTE);
		});
		const newKameletCommand = vscode.commands.registerCommand(NewCamelKameletCommand.ID_COMMAND_CAMEL_KAMELET_YAML, async () => {
			await new NewCamelKameletCommand('YAML').create();
			await sendCommandTrackingEvent(this.telemetryService, NewCamelKameletCommand.ID_COMMAND_CAMEL_KAMELET_YAML);
		});
		const newPipeCommand = vscode.commands.registerCommand(NewCamelPipeCommand.ID_COMMAND_CAMEL_PIPE_YAML, async () => {
			await new NewCamelPipeCommand('YAML').create();
			await sendCommandTrackingEvent(this.telemetryService, NewCamelPipeCommand.ID_COMMAND_CAMEL_PIPE_YAML);
		});
		this.context.subscriptions.push(newFileCommand, newRouteCommand, newKameletCommand, newPipeCommand);
	}

	public registerNewCamelProjectCommands() {
		const exportSingleFileCommand = vscode.commands.registerCommand(
			NewCamelProjectCommand.ID_COMMAND_CAMEL_NEW_PROJECT,
			async (integration: Integration) => {
				await new NewCamelProjectCommand().create(integration.filepath, path.dirname(integration.filepath.fsPath));
				await sendCommandTrackingEvent(this.telemetryService, NewCamelProjectCommand.ID_COMMAND_CAMEL_NEW_PROJECT);
			},
		);
		const exportFolderCommand = vscode.commands.registerCommand(NewCamelProjectCommand.ID_COMMAND_CAMEL_NEW_PROJECT_FOLDER, async (folder: Folder) => {
			await new NewCamelProjectCommand().create(folder.folderUri, folder.folderUri.fsPath);
			await sendCommandTrackingEvent(this.telemetryService, NewCamelProjectCommand.ID_COMMAND_CAMEL_NEW_PROJECT_FOLDER);
		});
		const exportWorkspaceCommand = vscode.commands.registerCommand(NewCamelProjectCommand.ID_COMMAND_CAMEL_NEW_PROJECT_WORKSPACE, async () => {
			if (!vscode.workspace.workspaceFolders?.[0]) {
				return;
			}
			const workspaceFolder = vscode.workspace.workspaceFolders[0];
			await new NewCamelProjectCommand().create(workspaceFolder.uri, workspaceFolder.uri.fsPath);
			await sendCommandTrackingEvent(this.telemetryService, NewCamelProjectCommand.ID_COMMAND_CAMEL_NEW_PROJECT_WORKSPACE);
		});
		this.context.subscriptions.push(exportSingleFileCommand, exportFolderCommand, exportWorkspaceCommand);
	}

	public registerRunIntegrationCommands(portManager: PortManager) {
		this.context.subscriptions.push(
			vscode.commands.registerCommand(COMMAND_INTEGRATIONS_RUN, async (integration: Integration) => {
				const allocatedPort = await portManager.allocatePort();
				let runTask: CamelTask | undefined;

				try {
					const result = await CamelCommandAPI.run(integration.filepath.fsPath, path.dirname(integration.filepath.fsPath), allocatedPort);
					runTask = CamelTaskFactory.createBackground(`Running - ${path.basename(integration.filepath.fsPath)}::${result.resolvedPort}`, result);

					this.synchronizePortTracking(portManager, runTask, allocatedPort);

					await runTask.execute();
					await sendCommandTrackingEvent(this.telemetryService, COMMAND_INTEGRATIONS_RUN);
				} catch (error) {
					const portToRelease = runTask ? (runTask.definition as CamelTaskDefinition).port : allocatedPort;
					portManager.releasePort(portToRelease);
					throw error;
				}
			}),
		);
	}

	public registerRunSourceDirCommands(portManager: PortManager) {
		const runFolderCommand = vscode.commands.registerCommand(COMMAND_INTEGRATIONS_RUN_FOLDER, async (folder: Folder) => {
			await this.executeRunSourceDirTask(folder.folderUri.fsPath, portManager);
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_INTEGRATIONS_RUN_FOLDER);
		});

		const runWorkspaceHandler = async (commandId: string, showMultiWorkspaceMessage: boolean): Promise<void> => {
			const folders = vscode.workspace.workspaceFolders;
			if (!folders?.length) {
				return;
			}

			const isMultiWorkspace = folders.length > 1;
			for (const folder of folders) {
				await this.executeRunSourceDirTask(folder.uri.fsPath, portManager);
			}

			if (showMultiWorkspaceMessage && isMultiWorkspace) {
				await this.showMultiWorkspaceInfoMessage();
			}

			await sendCommandTrackingEvent(this.telemetryService, commandId);
		};

		const runWorkspaceCommand = vscode.commands.registerCommand(COMMAND_INTEGRATIONS_RUN_WORKSPACE, async () =>
			runWorkspaceHandler(COMMAND_INTEGRATIONS_RUN_WORKSPACE, false),
		);

		const runAllCommand = vscode.commands.registerCommand(COMMAND_INTEGRATIONS_RUN_ALL_WORKSPACES, async () =>
			runWorkspaceHandler(COMMAND_INTEGRATIONS_RUN_ALL_WORKSPACES, true),
		);

		this.context.subscriptions.push(runFolderCommand, runWorkspaceCommand, runAllCommand);
	}

	public registerKubernetesRunCommands() {
		this.context.subscriptions.push(
			vscode.commands.registerCommand(COMMAND_INTEGRATIONS_KUBERNETES_RUN, async (integration: Integration) => {
				const deployResult = await CamelCommandAPI.kubernetesRun(integration.filepath.fsPath, path.dirname(integration.filepath.fsPath));
				const deployTask = CamelTaskFactory.create({ label: `Deploying - ${path.basename(integration.filepath.fsPath)}` }, deployResult);
				await deployTask.execute();
				await sendCommandTrackingEvent(this.telemetryService, COMMAND_INTEGRATIONS_KUBERNETES_RUN);
			}),
		);
	}

	public async hideIntegrationsViewButtonsForMavenProjects() {
		// Initial check
		await this.updatePomContext();

		// Watch for addition/removal of pom.xml in workspace root
		const pomWatcher = vscode.workspace.createFileSystemWatcher('**/pom.xml');
		pomWatcher.onDidCreate(() => this.updatePomContext());
		pomWatcher.onDidDelete(() => this.updatePomContext());
		pomWatcher.onDidChange(() => this.updatePomContext());
		this.context.subscriptions.push(pomWatcher);
	}

	private async updatePomContext() {
		const pomFile = await vscode.workspace.findFiles('pom.xml', IntegrationsProvider.EXCLUDE_PATTERN, 1);
		const hasPom = pomFile.length > 0;
		await vscode.commands.executeCommand('setContext', CONTEXT_WORKSPACE_HAS_POM_XML, hasPom);
	}

	private registerIntegrationsItemsContextMenu(provider: IntegrationsProvider) {
		// register show source menu button
		const showSourceCommand = vscode.commands.registerCommand(COMMAND_INTEGRATIONS_SHOW_SOURCE, async (item: vscode.TreeItem) => {
			if (!item.resourceUri) {
				return;
			}
			await vscode.window.showTextDocument(item.resourceUri);
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_INTEGRATIONS_SHOW_SOURCE);
		});

		// register delete menu button
		const deleteCommand = vscode.commands.registerCommand(COMMAND_INTEGRATIONS_DELETE, async (item: vscode.TreeItem) => {
			if (!item.resourceUri) {
				return;
			}
			const confirmation = await confirmFileDeleteDialog(item.resourceUri.fsPath);
			if (confirmation) {
				await vscode.workspace.fs.delete(item.resourceUri, { recursive: true });
				// ensure tree refresh (folder deletions may not trigger file-pattern watcher)
				provider.refresh();
				KaotoOutputChannel.logInfo(`Item '${item.resourceUri.fsPath}' was deleted.`);
			}
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_INTEGRATIONS_DELETE);
		});

		// register update dependencies menu button
		const updateDependenciesCommand = vscode.commands.registerCommand(COMMAND_INTEGRATIONS_UPDATE_DEPENDENCIES, async (integration: Integration) => {
			await this.updateCamelDependencies(integration.filepath.fsPath);
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_INTEGRATIONS_UPDATE_DEPENDENCIES);
		});

		this.context.subscriptions.push(showSourceCommand, deleteCommand, updateDependenciesCommand);
	}

	private async updateCamelDependencies(docPath: string): Promise<void> {
		const pomFolder = findFolderOfPomXml(docPath);
		if (!pomFolder) {
			return; // standalone project
		}
		const pomPath = path.join(pomFolder, 'pom.xml');

		await StepsOnSaveManager.instance.updateDependencies(docPath, pomPath);
	}

	/**
	 * Synchronizes the PortManager with the actual port used by a task.
	 * If the task's actual port differs from the allocated port (due to user override in settings),
	 * this method releases the allocated port and adds the actual port to the PortManager.
	 *
	 * @param portManager - The PortManager instance to synchronize
	 * @param task - The task whose port should be synchronized
	 * @param allocatedPort - The port that was originally allocated
	 */
	private synchronizePortTracking(portManager: PortManager, task: CamelTask, allocatedPort: number): void {
		const taskDef = task.definition as CamelTaskDefinition;
		const actualPort = taskDef.port;

		if (actualPort !== allocatedPort) {
			// User overrode the port in settings, update PortManager to track the actual port
			portManager.releasePort(allocatedPort);
			portManager.getUsedPorts().add(actualPort);
		}
	}

	/**
	 * Executes a run source directory task for the specified folder path.
	 * Allocates a port, creates the task, synchronizes port tracking, and executes the task.
	 *
	 * @param folderPath - The file system path of the folder to run
	 * @param portManager - The PortManager instance for port allocation
	 */
	private async executeRunSourceDirTask(folderPath: string, portManager: PortManager): Promise<void> {
		const allocatedPort = await portManager.allocatePort();
		let runTask: CamelTask | undefined;

		try {
			const result = await CamelCommandAPI.runSourceDir(folderPath, allocatedPort);
			runTask = CamelTaskFactory.createBackground(`Running - ${path.basename(folderPath)}::${result.resolvedPort}`, result);
			this.synchronizePortTracking(portManager, runTask, allocatedPort);
			await runTask.execute();
		} catch (error) {
			const portToRelease = runTask ? (runTask.definition as CamelTaskDefinition).port : allocatedPort;
			portManager.releasePort(portToRelease);
			throw error;
		}
	}

	/**
	 * Shows an informational message to the user when running multiple workspaces.
	 * The message can be dismissed permanently by the user.
	 */
	private async showMultiWorkspaceInfoMessage(): Promise<void> {
		const storageKey = STATE_SHOW_RUN_ALL_FOLDERS_MESSAGE;
		const showInfoMessage = safeGlobalStateGet<boolean>(this.context, storageKey, true);

		if (showInfoMessage) {
			const doNotShowAgain = "Don't show again";
			const ok = 'OK';
			const result = await vscode.window.showInformationMessage(
				'You are running multiple workspaces. Each workspace will be run in a separate terminal.',
				ok,
				doNotShowAgain,
			);
			if (result === doNotShowAgain) {
				await safeGlobalStateUpdate(this.context, storageKey, false);
			}
		}
	}
}
