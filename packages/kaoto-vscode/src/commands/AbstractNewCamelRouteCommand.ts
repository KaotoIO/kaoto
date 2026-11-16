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
import { StarterTemplateId } from '@kaoto/camel-catalog/types';
import { AbstractCamelCommand } from './AbstractCamelCommand';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { StarterTemplateService } from '../services/StarterTemplateService';
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

	/**
	 * Writes the starter template as a new file and opens that file in the Kaoto editor.
	 * When the file cannot be created, the error is shown and logged and nothing is opened. This method never deletes or
	 * rewrites `fileUri` itself: it may already exist, and then it is the user's own file. Only the service removes a
	 * partly written file, and only one that it created in the same call.
	 *
	 * @param starterTemplates the service that renders and writes the template
	 * @param templateId the starter template to write
	 * @param fileUri the file to create
	 * @param name the name to set in the new file, for the templates that have a name field
	 */
	protected async createFromStarterTemplateAndOpen(
		starterTemplates: StarterTemplateService,
		templateId: StarterTemplateId,
		fileUri: Uri,
		name?: string,
	): Promise<void> {
		try {
			await starterTemplates.writeStarterFile(templateId, fileUri, name);
		} catch (error) {
			KaotoOutputChannel.logError(`Failed to create ${fileUri.fsPath} from the starter template "${templateId}"`, error);
			window.showErrorMessage(`Failed to create the new file: ${error instanceof Error ? error.message : String(error)}`);
			return;
		}
		await commands.executeCommand(COMMAND_OPEN_WITH_KAOTO, fileUri);
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
