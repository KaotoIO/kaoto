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
import { StartInfrastructureServiceCommand } from '../../commands/StartInfrastructureServiceCommand';
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';
import { CommandResult, InfraRunningServiceDetails, InfraServiceDefinition } from '../../executors/types/ExecutorTypes';
import { CamelTaskFactory } from '../../tasks/CamelTaskFactory';
import { RunningInfrastructureService } from '../../views/infrastructure/InfrastructureItem';
import { InfrastructureProvider } from '../../views/infrastructure/InfrastructureProvider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOCKER_ERROR = 'Could not find a valid Docker environment';
const FAKE_RESULT = {} as CommandResult;

interface FakeProviderState {
	starting: boolean;
	startingFlagHistory: boolean[];
	services: InfraServiceDefinition[];
	running: Map<string, RunningInfrastructureService>;
	cliRunning: InfraRunningServiceDetails[];
	cliLookups: number;
	registered: RunningInfrastructureService[];
	unregistered: string[];
}

function createFakeProvider(overrides: Partial<FakeProviderState> = {}): { provider: InfrastructureProvider; state: FakeProviderState } {
	const state: FakeProviderState = {
		starting: false,
		startingFlagHistory: [],
		services: [{ name: 'kafka', description: 'Kafka broker' }],
		running: new Map(),
		cliRunning: [],
		cliLookups: 0,
		registered: [],
		unregistered: [],
		...overrides,
	};

	const fake = {
		isServiceStarting: () => state.starting,
		setStartingService: (value: boolean) => {
			state.starting = value;
			state.startingFlagHistory.push(value);
		},
		ensureAvailableServicesLoaded: async () => state.services,
		getRunningService: (name: string) => state.running.get(name),
		getCliRunningService: async (name: string) => {
			state.cliLookups++;
			return state.cliRunning.find((service) => service.name === name);
		},
		registerRunningService: (service: RunningInfrastructureService) => {
			state.registered.push(service);
			state.running.set(service.name, service);
		},
		unregisterRunningService: (name: string) => {
			state.unregistered.push(name);
			state.running.delete(name);
		},
	};

	return { provider: fake as unknown as InfrastructureProvider, state };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

suite('StartInfrastructureServiceCommand', function () {
	const originalWindow = {
		showInformationMessage: vscode.window.showInformationMessage,
		showWarningMessage: vscode.window.showWarningMessage,
		showErrorMessage: vscode.window.showErrorMessage,
		showQuickPick: vscode.window.showQuickPick,
		showInputBox: vscode.window.showInputBox,
		withProgress: vscode.window.withProgress,
	};
	const originalInfraRun = CamelCommandAPI.infraRun;
	const originalInfraStop = CamelCommandAPI.infraStop;
	const originalGetInfraDefaultArgs = CamelCommandAPI.getInfraDefaultArgs;
	const originalCreateSilent = CamelTaskFactory.createSilent;
	const originalCreateBackgroundSilent = CamelTaskFactory.createBackgroundSilent;

	let infoMessages: string[];
	let warningMessages: string[];
	let errorMessages: string[];
	let warningChoice: string | undefined;
	let quickPickChoice: ((items: readonly vscode.QuickPickItem[]) => vscode.QuickPickItem | undefined) | undefined;
	let inputBoxValue: string | undefined;
	let validateInput: vscode.InputBoxOptions['validateInput'];
	let infraRunCalls: { service: string; port?: number; args: unknown; cwd?: string }[];
	let infraStopCalls: string[];
	let infraStopError: Error | undefined;
	let stopTasksExecuted: number;
	let runTasksExecuted: number;
	let runTaskError: Error | undefined;

	setup(function () {
		infoMessages = [];
		warningMessages = [];
		errorMessages = [];
		warningChoice = undefined;
		quickPickChoice = (items) => items[0];
		inputBoxValue = '';
		validateInput = undefined;
		infraRunCalls = [];
		infraStopCalls = [];
		infraStopError = undefined;
		stopTasksExecuted = 0;
		runTasksExecuted = 0;
		runTaskError = undefined;

		const window = vscode.window as unknown as Record<string, unknown>;
		window.showInformationMessage = async (message: string) => {
			infoMessages.push(message);
			return undefined;
		};
		window.showWarningMessage = async (message: string) => {
			warningMessages.push(message);
			return warningChoice;
		};
		window.showErrorMessage = async (message: string) => {
			errorMessages.push(message);
			return undefined;
		};
		window.showQuickPick = async (items: readonly vscode.QuickPickItem[]) => quickPickChoice?.(items);
		window.showInputBox = async (options?: vscode.InputBoxOptions) => {
			validateInput = options?.validateInput;
			return inputBoxValue;
		};
		window.withProgress = async (_options: unknown, task: () => Thenable<unknown>) => task();

		CamelCommandAPI.getInfraDefaultArgs = () => ['--default-arg'];
		CamelCommandAPI.infraRun = async (service, port, args, cwd) => {
			infraRunCalls.push({ service, port, args, cwd });
			return FAKE_RESULT;
		};
		CamelCommandAPI.infraStop = async (service) => {
			infraStopCalls.push(service);
			if (infraStopError) {
				throw infraStopError;
			}
			return FAKE_RESULT;
		};
		CamelTaskFactory.createSilent = (() => ({
			executeAndWait: async () => {
				stopTasksExecuted++;
			},
		})) as unknown as typeof CamelTaskFactory.createSilent;
		CamelTaskFactory.createBackgroundSilent = ((label: string) => ({
			name: label,
			execute: async () => {
				if (runTaskError) {
					throw runTaskError;
				}
				runTasksExecuted++;
			},
		})) as unknown as typeof CamelTaskFactory.createBackgroundSilent;
	});

	teardown(function () {
		Object.assign(vscode.window, originalWindow);
		CamelCommandAPI.infraRun = originalInfraRun;
		CamelCommandAPI.infraStop = originalInfraStop;
		CamelCommandAPI.getInfraDefaultArgs = originalGetInfraDefaultArgs;
		CamelTaskFactory.createSilent = originalCreateSilent;
		CamelTaskFactory.createBackgroundSilent = originalCreateBackgroundSilent;
	});

	test('has the registered command ID', function () {
		assert.isString(StartInfrastructureServiceCommand.ID_COMMAND);
		assert.isNotEmpty(StartInfrastructureServiceCommand.ID_COMMAND);
	});

	test('does nothing when a service is already starting', async function () {
		const { provider, state } = createFakeProvider({ starting: true });

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.deepEqual(state.startingFlagHistory, [], 'must not touch the starting flag');
		assert.isEmpty(infraRunCalls);
	});

	test('informs the user when no services are available', async function () {
		const { provider, state } = createFakeProvider({ services: [] });

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.deepEqual(infoMessages, ['No infrastructure services are available from Camel JBang infra.']);
		assert.isEmpty(infraRunCalls);
		assert.deepEqual(state.startingFlagHistory, [true, false]);
	});

	test('offers the available services in the quick pick', async function () {
		const { provider } = createFakeProvider({ services: [{ name: 'kafka', description: 'Kafka broker' }, { name: 'ftp' }] });
		let offered: readonly vscode.QuickPickItem[] = [];
		quickPickChoice = (items) => {
			offered = items;
			return undefined;
		};

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.deepEqual(
			offered.map((item) => [item.label, item.description]),
			[
				['kafka', 'Kafka broker'],
				['ftp', ''],
			],
		);
	});

	test('does nothing when the quick pick is cancelled', async function () {
		const { provider, state } = createFakeProvider();
		quickPickChoice = () => undefined;

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.isEmpty(infraRunCalls);
		assert.deepEqual(state.startingFlagHistory, [true, false]);
	});

	test('reports an already running managed service with its URL', async function () {
		const { provider, state } = createFakeProvider();
		state.running.set('kafka', { name: 'kafka', args: [], terminalName: 't', status: 'running', url: 'localhost:9092' });

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.deepEqual(infoMessages, ['Infrastructure service "kafka" is already running at localhost:9092.']);
		assert.isEmpty(infraRunCalls);
	});

	test('reports an already running managed service using its port when there is no URL', async function () {
		const { provider, state } = createFakeProvider();
		state.running.set('kafka', { name: 'kafka', args: [], terminalName: 't', status: 'running', port: 1234 });

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.deepEqual(infoMessages, ['Infrastructure service "kafka" is already running at localhost:1234.']);
	});

	test('reports an already running managed service without location when unknown', async function () {
		const { provider, state } = createFakeProvider();
		state.running.set('kafka', { name: 'kafka', args: [], terminalName: 't', status: 'running' });

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.deepEqual(infoMessages, ['Infrastructure service "kafka" is already running.']);
	});

	test('does not start when the user cancels the external service conflict', async function () {
		const { provider, state } = createFakeProvider();
		state.running.set('kafka', { name: 'kafka', args: [], terminalName: 't', status: 'running', isExternal: true, port: 9092 });
		warningChoice = 'Cancel';

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.lengthOf(warningMessages, 1);
		assert.include(warningMessages[0], 'already running externally at localhost:9092');
		assert.isEmpty(infraStopCalls);
		assert.isEmpty(infraRunCalls);
	});

	test('does not start when the external service conflict prompt is dismissed', async function () {
		const { provider, state } = createFakeProvider();
		state.running.set('kafka', { name: 'kafka', args: [], terminalName: 't', status: 'running', isExternal: true });
		warningChoice = undefined;

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.include(warningMessages[0], 'unknown location');
		assert.isEmpty(infraRunCalls);
	});

	test('does not start when the user chooses to use the existing external service', async function () {
		const { provider, state } = createFakeProvider();
		state.running.set('kafka', { name: 'kafka', args: [], terminalName: 't', status: 'running', isExternal: true, url: 'host:1' });
		warningChoice = 'Use Existing';

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.isEmpty(infraStopCalls);
		assert.isEmpty(infraRunCalls);
	});

	test('stops the external service and starts a new one on "Stop and Restart"', async function () {
		const { provider, state } = createFakeProvider();
		state.running.set('kafka', { name: 'kafka', args: [], terminalName: 't', status: 'running', isExternal: true, port: 9092 });
		warningChoice = 'Stop and Restart';

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.deepEqual(infraStopCalls, ['kafka']);
		assert.strictEqual(stopTasksExecuted, 1);
		assert.deepEqual(state.unregistered, ['kafka']);
		assert.lengthOf(infraRunCalls, 1);
		assert.strictEqual(runTasksExecuted, 1);
	});

	test('registers and handles a service only found by the CLI as external', async function () {
		const { provider, state } = createFakeProvider({ cliRunning: [{ name: 'kafka', port: 9092 }] });
		warningChoice = 'Cancel';

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.lengthOf(state.registered, 1);
		assert.isTrue(state.registered[0].isExternal);
		assert.include(warningMessages[0], 'localhost:9092');
		assert.isEmpty(infraRunCalls);
	});

	test('polls the CLI until the stopped external service disappears', async function () {
		const { provider, state } = createFakeProvider({ cliRunning: [{ name: 'kafka', port: 9092 }] });
		warningChoice = 'Stop and Restart';
		const lookup = provider.getCliRunningService.bind(provider);
		let calls = 0;
		(provider as unknown as Record<string, unknown>).getCliRunningService = async (name: string) => {
			calls++;
			// 1st call: running-check in handleExistingService, 2nd: still running after stop, 3rd: gone
			if (calls >= 3) {
				state.cliRunning = [];
			}
			return lookup(name);
		};
		const originalSetTimeout = global.setTimeout;
		(global as unknown as Record<string, unknown>).setTimeout = (fn: () => void) => originalSetTimeout(fn, 0);

		try {
			await new StartInfrastructureServiceCommand(provider).execute();
		} finally {
			global.setTimeout = originalSetTimeout;
		}

		assert.isAtLeast(calls, 3);
		assert.deepEqual(state.unregistered, ['kafka']);
		assert.lengthOf(infraRunCalls, 1);
	});

	test('shows an error and does not start when stopping the external service fails', async function () {
		const { provider, state } = createFakeProvider();
		state.running.set('kafka', { name: 'kafka', args: [], terminalName: 't', status: 'running', isExternal: true });
		warningChoice = 'Stop and Restart';
		infraStopError = new Error('stop failed');

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.lengthOf(errorMessages, 1);
		assert.include(errorMessages[0], 'Failed to stop external service');
		assert.include(errorMessages[0], 'stop failed');
		assert.isEmpty(infraRunCalls);
		assert.isEmpty(state.unregistered);
	});

	test('does not start when the port input box is cancelled', async function () {
		const { provider, state } = createFakeProvider();
		inputBoxValue = undefined;

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.isEmpty(infraRunCalls);
		assert.isEmpty(state.registered);
	});

	test('starts the service with the default port when the input is empty', async function () {
		const { provider, state } = createFakeProvider();
		inputBoxValue = '';

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.lengthOf(infraRunCalls, 1);
		assert.strictEqual(infraRunCalls[0].service, 'kafka');
		assert.isUndefined(infraRunCalls[0].port);
		assert.deepEqual(infraRunCalls[0].args, ['--default-arg']);
		assert.strictEqual(runTasksExecuted, 1);
		assert.lengthOf(state.registered, 1);
		assert.deepEqual(state.registered[0], {
			name: 'kafka',
			description: 'Kafka broker',
			port: undefined,
			url: undefined,
			args: ['--default-arg'],
			terminalName: 'Infrastructure - kafka',
			status: 'starting',
		});
		assert.deepEqual(state.startingFlagHistory, [true, false]);
	});

	test('starts the service with the custom port', async function () {
		const { provider, state } = createFakeProvider();
		inputBoxValue = '9999';

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.strictEqual(infraRunCalls[0].port, 9999);
		assert.strictEqual(state.registered[0].port, 9999);
		assert.strictEqual(state.registered[0].url, 'localhost:9999');
	});

	test('validates the port input', async function () {
		const { provider } = createFakeProvider();

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.isDefined(validateInput);
		assert.isUndefined((validateInput as (v: string) => string | undefined)(''));
		assert.isUndefined((validateInput as (v: string) => string | undefined)('1'));
		assert.isUndefined((validateInput as (v: string) => string | undefined)('65535'));
		const message = 'Port must be between 1 and 65535.';
		assert.strictEqual((validateInput as (v: string) => string | undefined)('0'), message);
		assert.strictEqual((validateInput as (v: string) => string | undefined)('65536'), message);
		assert.strictEqual((validateInput as (v: string) => string | undefined)('1.5'), message);
		assert.strictEqual((validateInput as (v: string) => string | undefined)('abc'), message);
	});

	test('shows a Docker specific error when starting fails because of Docker', async function () {
		const { provider, state } = createFakeProvider();
		runTaskError = new Error(DOCKER_ERROR);

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.lengthOf(errorMessages, 1);
		assert.include(errorMessages[0], 'Docker environment not found');
		assert.isEmpty(warningMessages);
		assert.isEmpty(state.registered);
		assert.deepEqual(state.startingFlagHistory, [true, false]);
	});

	test('shows a warning when starting fails for another reason', async function () {
		const { provider, state } = createFakeProvider();
		runTaskError = new Error('boom');

		await new StartInfrastructureServiceCommand(provider).execute();

		assert.lengthOf(warningMessages, 1);
		assert.include(warningMessages[0], 'Unable to start infrastructure service');
		assert.include(warningMessages[0], 'boom');
		assert.isEmpty(errorMessages);
		assert.deepEqual(state.startingFlagHistory, [true, false]);
	});
});
