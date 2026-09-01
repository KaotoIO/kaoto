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
import { commands, Uri, window, workspace } from 'vscode';
import { AbstractNewCamelRouteCommand } from './AbstractNewCamelRouteCommand';
import { CamelTaskFactory } from '../tasks/CamelTaskFactory';
import { CamelCommandAPI } from '../executors/api/CamelCommandAPI';
import path from 'path';
import { CamelRouteDSL } from './AbstractCamelCommand';
import isValidFilename from 'valid-filename';

export class NewCamelTestCommand extends AbstractNewCamelRouteCommand {
	public static readonly ID_COMMAND_CITRUS_INIT = 'kaoto.citrus.jbang.init.test';
	protected static readonly PROGRESS_NOTIFICATION_MESSAGE = 'Creating a new Citrus Test file...';

	public async create(): Promise<void> {
		const wsFolder = await this.showWorkspaceFolderPick();
		if (wsFolder) {
			const selectedTargetFolder = await this.showDialogToPickFolder(wsFolder?.uri);
			const targetFolderPath = this.handleTestFolderChaining(selectedTargetFolder?.fsPath);
			if (targetFolderPath) {
				const name = await this.showInputBoxForFileName(targetFolderPath);
				const wsFolderTarget = wsFolder ?? this.singleWorkspaceFolder;
				if (name && wsFolderTarget) {
					const fileName = this.getFullName(name, this.getDSL().extension);
					const filePath = this.computeFullPath(targetFolderPath, fileName);

					const result = await CamelCommandAPI.testInit(fileName, targetFolderPath);
					const task = CamelTaskFactory.createSilent(`Init: ${fileName}`, result, wsFolderTarget);
					await task.executeAndWaitWithProgress(NewCamelTestCommand.PROGRESS_NOTIFICATION_MESSAGE);
					const targetFileURI = Uri.file(filePath);
					await this.waitForFileExists(targetFileURI);
					await commands.executeCommand('vscode.open', targetFileURI);
				}
			}
		}
	}

	protected async showInputBoxForFileName(targetFolder?: string): Promise<string> {
		const input = await window.showInputBox({
			prompt: this.fileNameInputPrompt,
			placeHolder: this.getDSL().placeHolder,
			validateInput: (fileName) => {
				return this.validateCitrusFileName(fileName ?? '', targetFolder);
			},
		});
		return input ?? '';
	}

	protected async validateCitrusFileName(name: string, folderPath?: string): Promise<string | undefined> {
		if (!name) {
			return 'Please provide a name for the new file (without extension).';
		}
		if (name.includes('.')) {
			return 'Please provide a name without the extension.';
		}
		if (!this.singleWorkspaceFolder && !folderPath) {
			return 'Please open a workspace folder first.';
		}
		const newFilePotentialFullPath: string = this.computeFullPath(
			folderPath ?? this.singleWorkspaceFolder!.uri.fsPath,
			this.getFullName(name, this.getDSL().extension),
		);
		let newFilePotentialPathExist = false;
		try {
			await workspace.fs.stat(Uri.file(newFilePotentialFullPath));
			newFilePotentialPathExist = true;
		} catch (error) {
			// do nothing, file does not exist
		}
		if (newFilePotentialPathExist) {
			return 'The file already exists. Please choose a different file name.';
		}

		if (!isValidFilename(name)) {
			return 'The filename is invalid.';
		}
		return undefined;
	}

	protected computeFullPath(folderPath: string, fileName: string): string {
		return path.join(folderPath, 'test', fileName);
	}

	protected getFullName(name: string, suffix: string): string {
		return `${name}.${suffix}`;
	}

	protected getDSL(): CamelRouteDSL {
		return {
			language: 'YAML',
			extension: 'citrus.yaml',
			placeHolder: 'sample-test',
		};
	}

	/**
	 * If the current working directory is a test folder, return the parent directory.
	 * @param targetFolder - The target folder path.
	 * @returns The parent directory.
	 */
	private handleTestFolderChaining(targetFolder?: string): string | undefined {
		if (!targetFolder) {
			return undefined;
		}
		const testFolderEnd = path.basename(targetFolder);
		if (testFolderEnd === 'test') {
			return path.dirname(targetFolder);
		}
		return targetFolder;
	}
}
