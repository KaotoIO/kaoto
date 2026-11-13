/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
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
import { assert } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { NewCamelProjectCommand } from '../../commands/NewCamelProjectCommand';
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';
import { CommandResult, RuntimeType } from '../../executors/types/ExecutorTypes';
import { KaotoMetadataExportService } from '../../services/KaotoMetadataExportService';
import { CamelTaskFactory } from '../../tasks/CamelTaskFactory';
import { getExtensionUri, getTestWorkspaceFolder } from '../utils/TestSetup';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GAV = 'com.acme:demo:1.0.0';
const FAKE_RESULT = {} as CommandResult;

interface Copy {
	source: vscode.Uri;
	target: vscode.Uri;
}

/**
 * The given file system, recording every copy before it runs.
 * The command resolves its templates from the folder of the bundle it runs from. In the test bundle that is not
 * the folder of the extension bundle, so the tests check the paths the command asks for, not the copied files.
 */
function recordCopies(fileSystem: vscode.FileSystem, copies: Copy[]): vscode.FileSystem {
	return {
		stat: (uri) => fileSystem.stat(uri),
		readDirectory: (uri) => fileSystem.readDirectory(uri),
		createDirectory: (uri) => fileSystem.createDirectory(uri),
		readFile: (uri) => fileSystem.readFile(uri),
		writeFile: (uri, content) => fileSystem.writeFile(uri, content),
		delete: (uri, options) => fileSystem.delete(uri, options),
		rename: (source, target, options) => fileSystem.rename(source, target, options),
		copy: (source, target, options) => {
			copies.push({ source, target });
			return fileSystem.copy(source, target, options);
		},
		isWritableFileSystem: (scheme) => fileSystem.isWritableFileSystem(scheme),
	};
}

// ─── Tests ────────────────────────────────────────────────────────────────────

suite('NewCamelProjectCommand', function () {
	const originalWindow = {
		showQuickPick: vscode.window.showQuickPick,
		showInputBox: vscode.window.showInputBox,
		showOpenDialog: vscode.window.showOpenDialog,
		showWarningMessage: vscode.window.showWarningMessage,
		showErrorMessage: vscode.window.showErrorMessage,
	};
	const originalCommands = {
		executeCommand: vscode.commands.executeCommand,
	};
	const originalFileSystem = Object.getOwnPropertyDescriptor(vscode.workspace, 'fs') as PropertyDescriptor;
	const originalExport = CamelCommandAPI.export;
	const originalCreateSilent = CamelTaskFactory.createSilent;
	const originalCopyMetadataAndResources = KaotoMetadataExportService.copyMetadataAndResources;

	let routeUri: vscode.Uri;
	let outputFolder: vscode.Uri;
	let runtimeChoice: RuntimeType;
	let warningChoice: string | undefined;
	let warnings: string[];
	let errors: string[];
	let exportCalls: { gav: string; runtime: RuntimeType; outputPath: string }[];
	let exportTasksExecuted: number;
	let metadataCopyError: Error | undefined;
	let copies: Copy[];
	let openedFolders: vscode.Uri[];

	setup(function () {
		routeUri = vscode.Uri.file(path.join(getTestWorkspaceFolder(), 'demo.camel.yaml'));
		// A folder outside the workspace folder, so the command asks before it uses it.
		outputFolder = vscode.Uri.file(fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-new-project-')));
		runtimeChoice = RuntimeType.QUARKUS;
		warningChoice = 'Continue';
		warnings = [];
		errors = [];
		exportCalls = [];
		exportTasksExecuted = 0;
		metadataCopyError = undefined;
		copies = [];
		openedFolders = [];

		const window = vscode.window as unknown as Record<string, unknown>;
		window.showQuickPick = async (items: readonly vscode.QuickPickItem[]) => items.find((item) => item.label === runtimeChoice);
		window.showInputBox = async () => GAV;
		window.showOpenDialog = async () => [outputFolder];
		window.showWarningMessage = async (message: string) => {
			warnings.push(message);
			return warningChoice;
		};
		window.showErrorMessage = async (message: string) => {
			errors.push(message);
			return undefined;
		};
		// The command opens the new project in a new VS Code window.
		(vscode.commands as unknown as Record<string, unknown>).executeCommand = async (command: string, ...args: unknown[]) => {
			if (command === 'vscode.openFolder') {
				openedFolders.push(args[0] as vscode.Uri);
				return undefined;
			}
			return originalCommands.executeCommand(command, ...args);
		};
		Object.defineProperty(vscode.workspace, 'fs', { value: recordCopies(vscode.workspace.fs, copies), configurable: true });

		CamelCommandAPI.export = async (_filePath, gav, runtime, outputPath) => {
			exportCalls.push({ gav, runtime, outputPath });
			return FAKE_RESULT;
		};
		CamelTaskFactory.createSilent = (() => ({
			executeAndWaitWithProgress: async () => {
				exportTasksExecuted++;
			},
		})) as unknown as typeof CamelTaskFactory.createSilent;
		KaotoMetadataExportService.copyMetadataAndResources = async () => {
			if (metadataCopyError) {
				throw metadataCopyError;
			}
		};
	});

	teardown(function () {
		Object.assign(vscode.window, originalWindow);
		Object.assign(vscode.commands, originalCommands);
		Object.defineProperty(vscode.workspace, 'fs', originalFileSystem);
		CamelCommandAPI.export = originalExport;
		CamelTaskFactory.createSilent = originalCreateSilent;
		KaotoMetadataExportService.copyMetadataAndResources = originalCopyMetadataAndResources;
		fs.rmSync(outputFolder.fsPath, { recursive: true, force: true });
	});

	for (const runtime of [RuntimeType.QUARKUS, RuntimeType.SPRING_BOOT]) {
		test(`exports a ${runtime} project with the .vscode files of that runtime`, async function () {
			runtimeChoice = runtime;

			await new NewCamelProjectCommand().create(routeUri, getTestWorkspaceFolder());

			assert.deepEqual(exportCalls, [{ gav: GAV, runtime, outputPath: outputFolder.fsPath }]);
			assert.strictEqual(exportTasksExecuted, 1);
			const templates = ['tasks.json', 'launch.json'].map((file) => `assets/resources/maven-export/${runtime}/${file}`);
			assert.deepEqual(
				copies.map(({ source }) => source.path.slice(source.path.lastIndexOf('/assets/') + 1)),
				templates,
			);
			assert.deepEqual(
				copies.map(({ target }) => target.toString()),
				['tasks.json', 'launch.json'].map((file) => vscode.Uri.joinPath(outputFolder, '.vscode', file).toString()),
			);
			for (const template of templates) {
				assert.isTrue(fs.existsSync(path.join(getExtensionUri().fsPath, template)), `${template} is missing in the extension`);
			}
			assert.deepEqual(openedFolders.map(String), [outputFolder.toString()]);
		});
	}

	test('does not export when the warning about the selected folder is cancelled', async function () {
		warningChoice = undefined;

		await new NewCamelProjectCommand().create(routeUri, getTestWorkspaceFolder());

		assert.lengthOf(warnings, 1);
		assert.include(warnings[0], outputFolder.fsPath);
		assert.isEmpty(exportCalls);
		assert.isEmpty(copies);
		assert.isEmpty(openedFolders);
	});

	test('still opens the project when the Kaoto metadata cannot be copied', async function () {
		metadataCopyError = new Error('disk full');

		await new NewCamelProjectCommand().create(routeUri, getTestWorkspaceFolder());

		assert.deepEqual(errors, ['Failed to export Kaoto DataMapper metadata: disk full']);
		assert.deepEqual(openedFolders.map(String), [outputFolder.toString()]);
	});
});
