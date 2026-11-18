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
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import {
	COMMAND_INTEGRATIONS_DELETE,
	COMMAND_INTEGRATIONS_SHOW_SOURCE,
	COMMAND_OPENAPI_DELETE,
	COMMAND_OPENAPI_SHOW_SOURCE,
	COMMAND_TESTS_DELETE,
	COMMAND_TESTS_SHOW_SOURCE,
} from '../../../constants';
import { IntegrationsRegistrar } from '../../../extension/registrars/IntegrationsRegistrar';
import { OpenApiRegistrar } from '../../../extension/registrars/OpenApiRegistrar';
import { TestsRegistrar } from '../../../extension/registrars/TestsRegistrar';
import { registerViewItemContextMenu, ViewItemContextMenuProvider } from '../../../extension/registrars/ViewItemContextMenu';
import { PortManager } from '../../../services/PortManager';

type CommandHandler = (...args: any[]) => unknown;

const SHOW_SOURCE_COMMAND_ID = 'kaoto.test.viewItem.showSource';
const DELETE_COMMAND_ID = 'kaoto.test.viewItem.delete';

suite('ViewItemContextMenu', function () {
	const restoreFns: Array<() => void> = [];
	let handlers: Map<string, CommandHandler>;
	let openedDocuments: string[];
	let warnings: string[];
	let deleteAnswer: string | undefined;
	let telemetryEvents: TelemetryEvent[];
	let telemetryService: TelemetryService;
	let refreshCount: number;
	let context: vscode.ExtensionContext;
	let tempDir: string;

	function stub(target: object, key: string, value: unknown): void {
		const original = Object.getOwnPropertyDescriptor(target, key) ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key);
		Object.defineProperty(target, key, { value, configurable: true, writable: true });
		restoreFns.push(() => {
			if (original) {
				Object.defineProperty(target, key, original);
			} else {
				delete (target as Record<string, unknown>)[key];
			}
		});
	}

	setup(async function () {
		handlers = new Map();
		openedDocuments = [];
		warnings = [];
		deleteAnswer = undefined;
		telemetryEvents = [];
		telemetryService = { send: async (event: TelemetryEvent) => void telemetryEvents.push(event) } as unknown as TelemetryService;
		refreshCount = 0;
		tempDir = await mkdtemp(path.join(os.tmpdir(), 'kaoto-view-item-menu-'));
		context = { subscriptions: [] as vscode.Disposable[], extensionUri: vscode.Uri.file(tempDir) } as unknown as vscode.ExtensionContext;

		// The extension under test is already activated, so its commands are registered: capture the handlers instead.
		stub(vscode.commands, 'registerCommand', (command: string, handler: CommandHandler) => {
			handlers.set(command, handler);
			return new vscode.Disposable(() => {});
		});
		stub(vscode.window, 'showTextDocument', async (uri: vscode.Uri) => {
			openedDocuments.push(uri.toString());
		});
		// The Delete confirmation is a modal warning, answered here by deleteAnswer.
		stub(vscode.window, 'showWarningMessage', async (message: string) => {
			warnings.push(message);
			return deleteAnswer;
		});
	});

	teardown(async function () {
		context.subscriptions.forEach((disposable) => disposable.dispose());
		restoreFns
			.splice(0)
			.reverse()
			.forEach((restore) => restore());
		await rm(tempDir, { recursive: true, force: true });
	});

	function register(withTelemetry = true): void {
		const provider: ViewItemContextMenuProvider = {
			VIEW_ITEM_SHOW_SOURCE_COMMAND_ID: SHOW_SOURCE_COMMAND_ID,
			VIEW_ITEM_DELETE_COMMAND_ID: DELETE_COMMAND_ID,
			refresh: () => void refreshCount++,
		};
		registerViewItemContextMenu(context, withTelemetry ? telemetryService : undefined, provider);
	}

	async function run(commandId: string, item: vscode.TreeItem): Promise<void> {
		const handler = handlers.get(commandId);
		assert.isDefined(handler, `the ${commandId} command is not registered`);
		await handler(item);
	}

	async function createFile(...segments: string[]): Promise<vscode.Uri> {
		const filePath = path.join(tempDir, ...segments);
		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, '- route:\n');
		return vscode.Uri.file(filePath);
	}

	function trackedCommands(): unknown[] {
		return telemetryEvents.map((event) => event.properties?.identifier);
	}

	test('registers Show Source and Delete under the command IDs of the provider', function () {
		register();

		assert.sameMembers([...handlers.keys()], [SHOW_SOURCE_COMMAND_ID, DELETE_COMMAND_ID]);
		assert.lengthOf(context.subscriptions, 2, 'the extension context has to keep both commands');
	});

	suite('Show Source', function () {
		test('opens the file of the item and sends telemetry', async function () {
			register();
			const file = await createFile('route.camel.yaml');

			await run(SHOW_SOURCE_COMMAND_ID, new vscode.TreeItem(file));

			assert.deepEqual(openedDocuments, [file.toString()]);
			assert.deepEqual(trackedCommands(), [SHOW_SOURCE_COMMAND_ID]);
		});

		test('ignores an item without a file', async function () {
			register();

			await run(SHOW_SOURCE_COMMAND_ID, new vscode.TreeItem('route-alpha'));

			assert.deepEqual(openedDocuments, []);
			assert.deepEqual(trackedCommands(), []);
		});
	});

	suite('Delete', function () {
		test('deletes the file once confirmed, refreshes the view and sends telemetry', async function () {
			register();
			deleteAnswer = 'Delete';
			const file = await createFile('route.camel.yaml');

			await run(DELETE_COMMAND_ID, new vscode.TreeItem(file));

			assert.isFalse(existsSync(file.fsPath), 'the file has to be deleted');
			assert.deepEqual(warnings, [`Are you sure you want to delete '${file.fsPath}'?`]);
			assert.equal(refreshCount, 1);
			assert.deepEqual(trackedCommands(), [DELETE_COMMAND_ID]);
		});

		test('deletes a folder with its content', async function () {
			register();
			deleteAnswer = 'Delete';
			await createFile('folder', 'nested', 'route.camel.yaml');
			const folder = vscode.Uri.file(path.join(tempDir, 'folder'));

			await run(DELETE_COMMAND_ID, new vscode.TreeItem(folder));

			assert.isFalse(existsSync(folder.fsPath), 'the folder has to be deleted');
			assert.equal(refreshCount, 1);
		});

		test('keeps the file when the deletion is cancelled', async function () {
			register();
			const file = await createFile('route.camel.yaml');

			await run(DELETE_COMMAND_ID, new vscode.TreeItem(file));

			assert.isTrue(existsSync(file.fsPath), 'the file has to be kept');
			assert.lengthOf(warnings, 1);
			assert.equal(refreshCount, 0);
			assert.deepEqual(trackedCommands(), [DELETE_COMMAND_ID], 'a cancelled deletion is still tracked');
		});

		test('ignores an item without a file', async function () {
			register();
			deleteAnswer = 'Delete';

			await run(DELETE_COMMAND_ID, new vscode.TreeItem('route-alpha'));

			assert.deepEqual(warnings, []);
			assert.equal(refreshCount, 0);
			assert.deepEqual(trackedCommands(), []);
		});
	});

	test('runs without a telemetry service', async function () {
		register(false);
		deleteAnswer = 'Delete';
		const file = await createFile('route.camel.yaml');

		await run(SHOW_SOURCE_COMMAND_ID, new vscode.TreeItem(file));
		await run(DELETE_COMMAND_ID, new vscode.TreeItem(file));

		assert.deepEqual(openedDocuments, [file.toString()]);
		assert.isFalse(existsSync(file.fsPath), 'the file has to be deleted');
	});

	suite('file views', function () {
		const views: Array<{ name: string; registerView: () => void; commandIds: string[] }> = [
			{
				name: 'Integrations',
				registerView: () => new IntegrationsRegistrar(context, telemetryService, new PortManager()).registerIntegrationsView(),
				commandIds: [COMMAND_INTEGRATIONS_SHOW_SOURCE, COMMAND_INTEGRATIONS_DELETE],
			},
			{
				name: 'Tests',
				registerView: () => new TestsRegistrar(context, telemetryService).registerTestsView(),
				commandIds: [COMMAND_TESTS_SHOW_SOURCE, COMMAND_TESTS_DELETE],
			},
			{
				name: 'OpenAPI',
				registerView: () => new OpenApiRegistrar(context, telemetryService).registerOpenApiView(),
				commandIds: [COMMAND_OPENAPI_SHOW_SOURCE, COMMAND_OPENAPI_DELETE],
			},
		];

		setup(function () {
			stub(vscode.window, 'createTreeView', () => ({
				onDidChangeVisibility: () => new vscode.Disposable(() => {}),
				dispose: () => {},
			}));
		});

		for (const view of views) {
			test(`the ${view.name} view registers Show Source and Delete under its own commands`, function () {
				view.registerView();

				assert.includeMembers([...handlers.keys()], view.commandIds);
			});
		}
	});
});
