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
import { commands, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { AbstractCamelCommand } from './AbstractCamelCommand';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { CamelTaskFactory } from '../tasks/CamelTaskFactory';
import { CommandResult } from '../executors/types/ExecutorTypes';
import { COMMAND_OPEN_WITH_KAOTO } from '../constants';

export abstract class AbstractNewCamelRouteCommand extends AbstractCamelCommand {
	protected fileNameInputPrompt = 'Please provide a name for the new file (without extension).';

	protected async showInputBoxForFileName(targetFolder?: string): Promise<string> {
		const input = await window.showInputBox({
			prompt: this.fileNameInputPrompt,
			placeHolder: this.camelDSL?.placeHolder ?? '',
			validateInput: (fileName) => {
				return this.validateCamelFileName(fileName ?? '', targetFolder);
			},
		});
		return input ?? '';
	}

	protected async showDialogToPickFolder(defUri?: Uri): Promise<Uri | undefined> {
		const selectedFolders = await window.showOpenDialog({
			canSelectMany: false,
			canSelectFolders: true,
			canSelectFiles: false,
			openLabel: 'Select',
			title: 'Select a folder to create the file in. ESC to cancel a file creation.',
			defaultUri: defUri || this.singleWorkspaceFolder?.uri,
		});
		return selectedFolders ? selectedFolders[0] : undefined;
	}

	protected async showWorkspaceFolderPick(): Promise<WorkspaceFolder | undefined> {
		if (!workspace.workspaceFolders) {
			return undefined;
		}
		if (workspace.workspaceFolders.length > 1) {
			return await window.showWorkspaceFolderPick();
		}
		return this.singleWorkspaceFolder;
	}

	protected async showNoWorkspaceNotification(): Promise<void> {
		const warningMessage = 'Missing workspace context! This action requires an open workspace. Please add a folder or reopen a project.';
		KaotoOutputChannel.logWarning(warningMessage);
		const selection = await window.showWarningMessage(warningMessage, 'Open Folder');
		if (selection !== undefined) {
			await commands.executeCommand('vscode.openFolder');
		}
	}

	protected async executeInitAndOpen(
		result: CommandResult,
		fileName: string,
		filePath: string,
		wsFolderTarget: WorkspaceFolder,
		progressMessage: string,
	): Promise<void> {
		const task = CamelTaskFactory.createSilent(`Init: ${fileName}`, result, wsFolderTarget);
		await task.executeAndWaitWithProgress(progressMessage);
		const targetFileURI = Uri.file(filePath);
		await this.waitForFileExists(targetFileURI);
		await commands.executeCommand(COMMAND_OPEN_WITH_KAOTO, targetFileURI);
	}

	protected async waitForFileExists(fileUri: Uri, maxWaitMs: number = 5_000, delayMs: number = 100): Promise<void> {
		const startTime = Date.now();

		while (true) {
			try {
				await workspace.fs.stat(fileUri);
				return;
			} catch {
				if (Date.now() - startTime >= maxWaitMs) {
					throw new Error(`File did not appear within ${maxWaitMs / 1000} seconds: ${fileUri.fsPath}`);
				}
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}
	}
}
