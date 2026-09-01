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
	COMMAND_TESTS_CLEAR_RESULTS,
	COMMAND_TESTS_DELETE,
	COMMAND_TESTS_REFRESH,
	COMMAND_TESTS_RUN,
	COMMAND_TESTS_RUN_FOLDER,
	COMMAND_TESTS_SHOW_SOURCE,
	VIEW_TESTS,
} from '../../constants';
import { TestsProvider } from '../../views/tests/TestsProvider';
import { TestFolder } from '../../views/tests/TestFolder';
import { Test } from '../../views/tests/Test';
import { AbstractFolderTreeProvider } from '../../views/shared/AbstractFolderTreeProvider';
import { NewCamelTestCommand } from '../../commands/NewCamelTestCommand';
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';
import { CamelTaskFactory } from '../../tasks/CamelTaskFactory';
import { CamelTask } from '../../tasks/CamelTask';
import { confirmFileDeleteDialog } from '../../utils/Modals';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { sendCommandTrackingEvent } from './TrackingEvent';
import { IRegistrar } from './IRegistrar';

export class TestsRegistrar implements IRegistrar {
	private testsProvider!: TestsProvider;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly telemetryService: TelemetryService | undefined,
	) {}

	register(): void {
		this.registerTestsView();
		this.registerTestsInitCommands();
		this.registerTestsRunCommands();
	}

	public registerTestsView() {
		this.testsProvider = new TestsProvider();
		const testsTreeView = vscode.window.createTreeView(VIEW_TESTS, {
			treeDataProvider: this.testsProvider,
			showCollapseAll: true,
		});
		const dispose = {
			dispose: () => this.testsProvider.dispose(),
		};

		const refreshOnVisibilityChange = testsTreeView.onDidChangeVisibility((event) => {
			if (event.visible) {
				this.testsProvider.refresh();
			}
		});
		const refreshCommand = vscode.commands.registerCommand(COMMAND_TESTS_REFRESH, () => this.testsProvider.refresh());
		const clearResultsCommand = vscode.commands.registerCommand(COMMAND_TESTS_CLEAR_RESULTS, () => this.testsProvider.clearAllResults());
		this.context.subscriptions.push(testsTreeView, dispose, refreshCommand, clearResultsCommand, refreshOnVisibilityChange);

		this.registerViewItemContextMenu(this.testsProvider, COMMAND_TESTS_SHOW_SOURCE, COMMAND_TESTS_DELETE);
	}

	public registerTestsInitCommands() {
		this.context.subscriptions.push(
			vscode.commands.registerCommand(NewCamelTestCommand.ID_COMMAND_CITRUS_INIT, async () => {
				await new NewCamelTestCommand().create();
				await sendCommandTrackingEvent(this.telemetryService, NewCamelTestCommand.ID_COMMAND_CITRUS_INIT);
			}),
		);
	}

	public registerTestsRunCommands() {
		const runCommand = vscode.commands.registerCommand(COMMAND_TESTS_RUN, async (test: Test) => {
			const filePath = test.resourceUri?.fsPath as string;
			const fileName = path.basename(filePath) || 'test';

			await this.executeTestRun(
				[filePath],
				async () => {
					const result = await CamelCommandAPI.testRun(path.basename(filePath), path.dirname(filePath));
					return CamelTaskFactory.createBackground(`Running - ${path.basename(filePath)}`, result);
				},
				`Running test: ${fileName}`,
			);
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_TESTS_RUN);
		});

		const runFolderCommand = vscode.commands.registerCommand(COMMAND_TESTS_RUN_FOLDER, async (folder: TestFolder) => {
			const folderPath = folder.folderUri.fsPath;
			const folderName = path.basename(folderPath) || 'tests';

			const testFilePaths = await this.testsProvider.getTestFilesInFolder(folderPath);
			if (testFilePaths.length === 0) {
				vscode.window.showInformationMessage(`No test files found in folder: ${folderName}`);
				return;
			}

			await this.executeTestRun(
				testFilePaths,
				async () => {
					const result = await CamelCommandAPI.testRunFolder(folderPath);
					return CamelTaskFactory.createBackground(`Running - ${folderPath}`, result);
				},
				`Running tests in: ${folderName}`,
			);
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_TESTS_RUN_FOLDER);
		});

		this.context.subscriptions.push(runCommand, runFolderCommand);
	}

	private async executeTestRun(testFilePaths: string[], createTask: () => Promise<CamelTask>, progressMessage: string): Promise<void> {
		for (const testPath of testFilePaths) {
			this.testsProvider.setTestRunning(testPath, true);
		}

		try {
			const runTask = await createTask();
			await runTask.executeAndWaitWithProgress(progressMessage);

			for (const testPath of testFilePaths) {
				const testResult = await this.testsProvider.readTestResult(testPath);
				this.testsProvider.setTestResult(testPath, testResult);
			}
		} catch {
			for (const testPath of testFilePaths) {
				this.testsProvider.setTestResult(testPath, 'failure');
			}
		} finally {
			for (const testPath of testFilePaths) {
				this.testsProvider.setTestRunning(testPath, false);
			}
		}
	}

	private registerViewItemContextMenu(provider: AbstractFolderTreeProvider<any>, showSourceCommandId: string, deleteCommandId: string) {
		const showSourceCommand = vscode.commands.registerCommand(showSourceCommandId, async (item: vscode.TreeItem) => {
			if (!item.resourceUri) {
				return;
			}
			await vscode.window.showTextDocument(item.resourceUri);
			await sendCommandTrackingEvent(this.telemetryService, showSourceCommandId);
		});

		const deleteCommand = vscode.commands.registerCommand(deleteCommandId, async (item: vscode.TreeItem) => {
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
			await sendCommandTrackingEvent(this.telemetryService, deleteCommandId);
		});

		this.context.subscriptions.push(showSourceCommand, deleteCommand);
	}
}
