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
import { commands, QuickPickItem, Uri, window, workspace } from 'vscode';
import { arePathsEqual } from '../utils/Path';
import { CamelTaskFactory } from '../tasks/CamelTaskFactory';
import { CamelCommandAPI } from '../executors/api/CamelCommandAPI';
import { confirmDestructiveActionInSelectedFolder } from '../utils/Modals';
import path from 'path';
import { RuntimeType } from '../executors/types/ExecutorTypes';

export class NewCamelProjectCommand {
	public static readonly ID_COMMAND_CAMEL_NEW_PROJECT = 'kaoto.camel.jbang.export';
	public static readonly ID_COMMAND_CAMEL_NEW_PROJECT_FOLDER = 'kaoto.camel.jbang.export.folder';
	public static readonly ID_COMMAND_CAMEL_NEW_PROJECT_WORKSPACE = 'kaoto.camel.jbang.export.workspace';

	public async create(uri: Uri, cwd: string) {
		const runtime = await this.askForRuntime();
		if (!runtime) {
			return;
		}
		const input = await this.askForGAV();
		if (input) {
			const outputFolder = await this.showDialogToPickFolder();
			if (!outputFolder) {
				return;
			}

			// if the chosen output folder is different from the first folder from the current workspace warns the user about potentially deleting files in the selected folder.
			// executing the command from the same folder does not delete files.
			const currentWorkspace = workspace.getWorkspaceFolder(uri);
			if (currentWorkspace) {
				if (!arePathsEqual(currentWorkspace.uri.fsPath, outputFolder.fsPath)) {
					const userChoice = await confirmDestructiveActionInSelectedFolder(outputFolder.fsPath);
					if (userChoice === undefined) {
						// project creation canceled
						return;
					}
				}
				const result = await CamelCommandAPI.export(uri.fsPath, input, runtime, outputFolder.fsPath, cwd, true);
				const camelExportTask = CamelTaskFactory.createSilent('Create a Camel project', result, currentWorkspace);
				await camelExportTask.executeAndWaitWithProgress('Creating a new Camel project...');

				// if not exist, init .vscode with tasks.json and launch.json config files
				await workspace.fs.createDirectory(Uri.file(path.join(outputFolder.fsPath, '.vscode')));
				for (const filename of ['tasks', 'launch']) {
					await this.copyFile(`../../resources/maven-export/${runtime}/${filename}.json`, path.join(outputFolder.fsPath, `.vscode/${filename}.json`));
				}

				// open the newly created project in a new vscode instance
				await commands.executeCommand('vscode.openFolder', outputFolder, true);
			}
		}
	}

	private async askForRuntime(): Promise<RuntimeType | undefined> {
		const selection = await this.showQuickPickForCamelRuntime();
		return selection?.label as RuntimeType | undefined;
	}

	private async askForGAV() {
		return await window.showInputBox({
			prompt: 'Please provide repository coordinate',
			placeHolder: 'com.acme:myproject:1.0-SNAPSHOT',
			value: 'com.acme:myproject:1.0-SNAPSHOT',
			validateInput: (gav) => {
				return this.validateGAV(gav);
			},
		});
	}

	/**
	 * Maven GAV validation
	 * 	- no empty name
	 *  - Have 2 double-dots (similar check than Camel)
	 *  - following mostly recommendations from Maven Central for name rules
	 *
	 * @param name
	 * @returns string | undefined
	 */
	public validateGAV(name: string): string | undefined {
		if (!name) {
			return 'Please provide a GAV for the new project following groupId:artifactId:version pattern.';
		}
		if (name.includes(' ')) {
			return 'The GAV cannot contain a space. It must constituted from groupId, artifactId and version following groupId:artifactId:version pattern.';
		}
		const gavs = name.split(':');
		if (gavs.length !== 3) {
			return 'The GAV needs to have double-dot `:` separator and constituted from groupId, artifactId and version';
		}
		const groupIdSplit = gavs[0].split('.');
		if (groupIdSplit[0].length === 0) {
			return 'The groupId cannot start with a .';
		}
		for (const groupIdSubPart of groupIdSplit) {
			const regExpSearch = /^(?!\.)[a-z0-9]+(\.[a-z0-9]+)*$/.exec(groupIdSubPart);
			if (regExpSearch === null || regExpSearch.length === 0) {
				return `Invalid subpart of groupId: '${groupIdSubPart}'. The groupId is expected to follow the Java package naming conventions.`;
			}
		}

		const artifactId = gavs[1];
		const regExpSearchArtifactId = /^(?!-)[a-z0-9]+(-[a-z0-9]+)*$/.exec(artifactId);
		if (regExpSearchArtifactId === null || regExpSearchArtifactId.length === 0) {
			return `Invalid artifactId: '${artifactId}'. The identifiers should only consist of lowercase letters, digits, and hyphens.`;
		}

		const version = gavs[2];
		const regExpSearch = /^(\d+\.\d+(\.\d+)?(-[A-Za-z0-9]+(-\d+)?)?(\+[A-Za-z0-9]+)?)$/.exec(version);
		if (regExpSearch === null || regExpSearch.length === 0) {
			return `Invalid version: '${version}'. The version is expected be compliant with Semantic Versioning 1.0.0.`;
		}
		return undefined;
	}

	/**
	 * Open a dialog to select a folder to create the project in.
	 *
	 * @returns Uri of the selected folder or undefined if canceled by the user.
	 */
	private async showDialogToPickFolder(): Promise<Uri | undefined> {
		const selectedFolders = await window.showOpenDialog({
			canSelectMany: false,
			canSelectFolders: true,
			canSelectFiles: false,
			openLabel: 'Select',
			title: 'Select a folder to create the project in. ESC to cancel the project creation',
			defaultUri: workspace.workspaceFolders?.[0]?.uri,
		});
		if (selectedFolders !== undefined) {
			return selectedFolders[0];
		}
		return undefined;
	}

	/**
	 * Open a quick pick dialog for a Camel Runtime selection
	 *
	 * @returns label of a selected Camel runtime: `quarkus` or `spring-boot`
	 */
	private async showQuickPickForCamelRuntime(): Promise<QuickPickItem | undefined> {
		const items: QuickPickItem[] = [
			{ label: RuntimeType.QUARKUS, description: 'Camel Quarkus' },
			{ label: RuntimeType.SPRING_BOOT, description: 'Camel on Spring Boot' },
		];
		return await window.showQuickPick(items, {
			placeHolder: 'Please select a Camel Runtime.',
			title: 'Runtime selection...',
		});
	}

	/**
	 * Handles copy of the resources from the extension to the vscode workspace
	 *
	 * @param sourcePath Path of source
	 * @param destPath Path of destination
	 */
	private async copyFile(sourcePath: string, destPath: string): Promise<void> {
		const sourcePathUri = Uri.file(path.resolve(__dirname, sourcePath));
		const destPathUri = Uri.file(path.resolve(__dirname, destPath));
		try {
			await workspace.fs.copy(sourcePathUri, destPathUri, { overwrite: false });
		} catch (error) {
			// Do nothing in case there already exists tasks.json and launch.json files
		}
	}
}
