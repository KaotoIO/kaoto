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
import * as vscode from 'vscode';
import { TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import {
	COMMAND_INFRASTRUCTURE_COPY_PORT,
	COMMAND_INFRASTRUCTURE_COPY_URL,
	COMMAND_INFRASTRUCTURE_LOGS,
	COMMAND_INFRASTRUCTURE_OPEN_UI,
	COMMAND_INFRASTRUCTURE_OPEN_UI_IN_VSCODE,
	COMMAND_INFRASTRUCTURE_REFRESH,
	COMMAND_INFRASTRUCTURE_START,
	COMMAND_INFRASTRUCTURE_STOP,
} from '../../../constants';
import { InfrastructureRegistrar } from '../../../extension/registrars/InfrastructureRegistrar';
import { InfrastructureItem, RunningInfrastructureService } from '../../../views/infrastructure/InfrastructureItem';

type CommandHandler = (...args: any[]) => unknown;

function makeItem(overrides: Partial<RunningInfrastructureService> = {}): InfrastructureItem {
	return new InfrastructureItem({
		name: 'kafka',
		args: [],
		terminalName: 'Infrastructure - kafka',
		status: 'running',
		...overrides,
	});
}

suite('InfrastructureRegistrar', function () {
	const restoreFns: Array<() => void> = [];
	let handlers: Map<string, CommandHandler>;
	let executedCommands: Array<{ command: string; args: unknown[] }>;
	let openedExternal: vscode.Uri[];
	let warnings: string[];
	let telemetryEvents: TelemetryEvent[];
	let context: vscode.ExtensionContext;

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

	setup(function () {
		handlers = new Map();
		executedCommands = [];
		openedExternal = [];
		warnings = [];
		telemetryEvents = [];
		context = { subscriptions: [] as vscode.Disposable[] } as unknown as vscode.ExtensionContext;

		// The extension under test is already activated, so its commands are registered: capture the handlers instead.
		stub(vscode.commands, 'registerCommand', (command: string, handler: CommandHandler) => {
			handlers.set(command, handler);
			return new vscode.Disposable(() => {});
		});
		stub(vscode.commands, 'executeCommand', async (command: string, ...args: unknown[]) => {
			executedCommands.push({ command, args });
		});
		stub(vscode.window, 'createTreeView', () => ({
			onDidChangeVisibility: () => new vscode.Disposable(() => {}),
			dispose: () => {},
		}));
		stub(vscode.window, 'showWarningMessage', async (message: string) => {
			warnings.push(message);
			return undefined;
		});
		stub(vscode.env, 'openExternal', async (uri: vscode.Uri) => {
			openedExternal.push(uri);
			return true;
		});
	});

	teardown(function () {
		context.subscriptions.forEach((disposable) => disposable.dispose());
		restoreFns
			.splice(0)
			.reverse()
			.forEach((restore) => restore());
	});

	function register(): void {
		const telemetryService = { send: async (event: TelemetryEvent) => void telemetryEvents.push(event) } as unknown as TelemetryService;
		new InfrastructureRegistrar(context, telemetryService).register();
	}

	test('registers all the infrastructure commands', function () {
		register();

		assert.sameMembers(
			[...handlers.keys()],
			[
				COMMAND_INFRASTRUCTURE_REFRESH,
				COMMAND_INFRASTRUCTURE_START,
				COMMAND_INFRASTRUCTURE_STOP,
				COMMAND_INFRASTRUCTURE_LOGS,
				COMMAND_INFRASTRUCTURE_COPY_URL,
				COMMAND_INFRASTRUCTURE_COPY_PORT,
				COMMAND_INFRASTRUCTURE_OPEN_UI,
				COMMAND_INFRASTRUCTURE_OPEN_UI_IN_VSCODE,
			],
		);
	});

	suite('Open UI in Browser', function () {
		test('opens the UI URL in the external browser and sends telemetry', async function () {
			register();

			await handlers.get(COMMAND_INFRASTRUCTURE_OPEN_UI)!(makeItem({ uiUrl: 'http://localhost:8080/ui' }));

			assert.deepEqual(
				openedExternal.map((uri) => uri.toString()),
				['http://localhost:8080/ui'],
			);
			assert.deepEqual(warnings, []);
			assert.deepEqual(
				telemetryEvents.map((event) => event.properties?.identifier),
				[COMMAND_INFRASTRUCTURE_OPEN_UI],
			);
		});

		test('warns when the service has no UI URL', async function () {
			register();

			await handlers.get(COMMAND_INFRASTRUCTURE_OPEN_UI)!(makeItem());

			assert.deepEqual(openedExternal, []);
			assert.deepEqual(warnings, ['No UI URL available for service "kafka"']);
			assert.deepEqual(telemetryEvents, []);
		});
	});

	suite('Open UI in VS Code', function () {
		test('opens the UI URL in the Simple Browser and sends telemetry', async function () {
			register();

			await handlers.get(COMMAND_INFRASTRUCTURE_OPEN_UI_IN_VSCODE)!(makeItem({ uiUrl: 'http://localhost:8080/ui' }));

			assert.deepEqual(executedCommands, [{ command: 'simpleBrowser.show', args: ['http://localhost:8080/ui'] }]);
			assert.deepEqual(openedExternal, []);
			assert.deepEqual(warnings, []);
			assert.deepEqual(
				telemetryEvents.map((event) => event.properties?.identifier),
				[COMMAND_INFRASTRUCTURE_OPEN_UI_IN_VSCODE],
			);
		});

		test('warns when the service has no UI URL', async function () {
			register();

			await handlers.get(COMMAND_INFRASTRUCTURE_OPEN_UI_IN_VSCODE)!(makeItem());

			assert.deepEqual(executedCommands, []);
			assert.deepEqual(warnings, ['No UI URL available for service "kafka"']);
			assert.deepEqual(telemetryEvents, []);
		});
	});
});
