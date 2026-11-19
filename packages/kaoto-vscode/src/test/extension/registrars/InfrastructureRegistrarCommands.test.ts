import { expect } from 'chai';
import * as vscode from 'vscode';
import { TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import {
	COMMAND_INFRASTRUCTURE_COPY_PORT,
	COMMAND_INFRASTRUCTURE_COPY_URL,
	COMMAND_INFRASTRUCTURE_LOGS,
	COMMAND_INFRASTRUCTURE_REFRESH,
	COMMAND_INFRASTRUCTURE_START,
	COMMAND_INFRASTRUCTURE_STOP,
} from '../../../constants';
import { CamelCommandAPI } from '../../../executors/api/CamelCommandAPI';
import { InfrastructureRegistrar } from '../../../extension/registrars/InfrastructureRegistrar';
import { InfrastructureItem, RunningInfrastructureService } from '../../../views/infrastructure/InfrastructureItem';
import { InfrastructureProvider } from '../../../views/infrastructure/InfrastructureProvider';

type CommandHandler = (...args: unknown[]) => Promise<void>;

suite('InfrastructureRegistrar commands', () => {
	const restores: (() => void)[] = [];
	let handlers: Map<string, CommandHandler>;
	let visibilityListener: ((event: { visible: boolean }) => Promise<void>) | undefined;
	let warnings: string[];
	let infos: string[];
	let errors: string[];
	let confirmation: string | undefined;
	let telemetryEvents: TelemetryEvent[];
	let cliServices: object[] | Error;
	let context: vscode.ExtensionContext;
	let provider: InfrastructureProvider;

	const stub = (target: object, key: string, value: unknown) => {
		const original = Object.getOwnPropertyDescriptor(target, key) ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key);
		Object.defineProperty(target, key, { value, configurable: true, writable: true });
		restores.push(() => {
			if (original) {
				Object.defineProperty(target, key, original);
			} else {
				delete (target as Record<string, unknown>)[key];
			}
		});
	};

	const service = (overrides: Partial<RunningInfrastructureService> = {}): RunningInfrastructureService => ({
		name: 'kafka',
		args: [],
		terminalName: 'Infrastructure - kafka',
		status: 'running',
		...overrides,
	});

	/** A task execution that runs the Node.js of VS Code and ends with the exit code */
	const nodeExecution = (exitCode: number) =>
		new vscode.ShellExecution(process.execPath, ['-e', { value: `process.exit(${exitCode})`, quoting: vscode.ShellQuoting.Strong }], {
			env: { ELECTRON_RUN_AS_NODE: '1' },
		});

	const trackedCommands = () => telemetryEvents.map((event) => event.properties?.identifier);

	setup(() => {
		handlers = new Map();
		visibilityListener = undefined;
		warnings = [];
		infos = [];
		errors = [];
		confirmation = undefined;
		telemetryEvents = [];
		cliServices = [];
		context = { subscriptions: [] as vscode.Disposable[] } as unknown as vscode.ExtensionContext;

		// The extension under test is already activated, so its commands are registered: capture the handlers instead.
		stub(vscode.commands, 'registerCommand', (command: string, handler: CommandHandler) => {
			handlers.set(command, handler);
			return new vscode.Disposable(() => {});
		});
		stub(vscode.window, 'createTreeView', () => ({
			onDidChangeVisibility: (listener: typeof visibilityListener) => {
				visibilityListener = listener;
				return new vscode.Disposable(() => {});
			},
			dispose: () => {},
		}));
		stub(vscode.window, 'showWarningMessage', async (message: string, options?: vscode.MessageOptions) => {
			if (options?.modal) {
				return confirmation;
			}
			warnings.push(message);
			return undefined;
		});
		stub(vscode.window, 'showInformationMessage', async (message: string) => {
			infos.push(message);
			return undefined;
		});
		stub(vscode.window, 'showErrorMessage', async (message: string) => {
			errors.push(message);
			return undefined;
		});
		stub(CamelCommandAPI, 'captureInfraPs', async () => {
			if (cliServices instanceof Error) {
				throw cliServices;
			}
			return JSON.stringify(cliServices);
		});
		stub(CamelCommandAPI, 'captureInfraList', async () => JSON.stringify([{ alias: 'kafka' }]));

		const telemetryService = { send: async (event: TelemetryEvent) => void telemetryEvents.push(event) } as unknown as TelemetryService;
		const registrar = new InfrastructureRegistrar(context, telemetryService);
		registrar.register();
		provider = registrar['infrastructureProvider'];
	});

	teardown(() => {
		context.subscriptions.forEach((disposable) => disposable.dispose());
		while (restores.length > 0) {
			restores.pop()!();
		}
	});

	suite('view', () => {
		test('loads the available services and the running ones once it is shown', async () => {
			cliServices = [{ name: 'artemis' }];

			await visibilityListener!({ visible: true });

			expect(provider.getAvailableServices().map(({ name }) => name)).to.deep.equal(['kafka']);
			expect(provider.getRunningService('artemis')).to.not.be.undefined;
		});

		test('warns when the available services cannot be loaded and still shows the running ones', async () => {
			stub(CamelCommandAPI, 'captureInfraList', async () => {
				throw new Error('camel not found');
			});
			cliServices = [{ name: 'artemis' }];

			await visibilityListener!({ visible: true });

			expect(warnings).to.deep.equal(['Unable to load infrastructure services: Error: camel not found']);
			expect(provider.getRunningService('artemis')).to.not.be.undefined;
		});

		test('loads nothing while it is hidden', async () => {
			cliServices = [{ name: 'artemis' }];

			await visibilityListener!({ visible: false });

			expect(provider.getRunningService('artemis')).to.be.undefined;
		});

		test('shows the running services on a refresh', async () => {
			cliServices = [{ name: 'artemis' }];

			await handlers.get(COMMAND_INFRASTRUCTURE_REFRESH)!();

			expect(provider.getRunningService('artemis')).to.not.be.undefined;
		});
	});

	test('tracks the start command', async () => {
		stub(vscode.window, 'showQuickPick', async () => undefined);

		await handlers.get(COMMAND_INFRASTRUCTURE_START)!();

		expect(trackedCommands()).to.deep.equal([COMMAND_INFRASTRUCTURE_START]);
		expect(provider.isServiceStarting()).to.equal(false);
	});

	suite('stop', () => {
		test('stops a service once confirmed and removes it', async () => {
			provider.registerRunningService(service());
			confirmation = 'Stop';
			let stoppedService: string | undefined;
			stub(CamelCommandAPI, 'infraStop', async (name: string) => {
				stoppedService = name;
				expect(provider.getRunningService(name)?.status).to.equal('stopping');
				return { execution: nodeExecution(0) };
			});

			await handlers.get(COMMAND_INFRASTRUCTURE_STOP)!(new InfrastructureItem(service()));

			expect(stoppedService).to.equal('kafka');
			expect(provider.getRunningService('kafka')).to.be.undefined;
			expect(trackedCommands()).to.deep.equal([COMMAND_INFRASTRUCTURE_STOP]);
			expect(provider['serviceManager'].isManualOperation()).to.equal(false);
		});

		test('keeps a service that could not be stopped and reports it', async () => {
			provider.registerRunningService(service());
			confirmation = 'Stop';
			stub(CamelCommandAPI, 'infraStop', async () => ({ execution: nodeExecution(1) }));

			await handlers.get(COMMAND_INFRASTRUCTURE_STOP)!(new InfrastructureItem(service()));

			expect(provider.getRunningService('kafka')).to.not.be.undefined;
			expect(errors).to.have.lengthOf(1);
			expect(errors[0]).to.match(/^Failed to stop kafka: Error: Task "Infrastructure Stop - kafka" failed with exit code 1/);
			expect(trackedCommands()).to.deep.equal([]);
			expect(provider['serviceManager'].isManualOperation()).to.equal(false);
		});

		test('does nothing when the stop is not confirmed', async () => {
			provider.registerRunningService(service());
			let stopped = false;
			stub(CamelCommandAPI, 'infraStop', async () => {
				stopped = true;
				return { execution: nodeExecution(0) };
			});

			await handlers.get(COMMAND_INFRASTRUCTURE_STOP)!(new InfrastructureItem(service()));

			expect(stopped).to.equal(false);
			expect(provider.getRunningService('kafka')?.status).to.equal('running');
		});

		test('does nothing without a service', async () => {
			confirmation = 'Stop';
			let stopped = false;
			stub(CamelCommandAPI, 'infraStop', async () => {
				stopped = true;
				return { execution: nodeExecution(0) };
			});

			await handlers.get(COMMAND_INFRASTRUCTURE_STOP)!(undefined);

			expect(stopped).to.equal(false);
		});
	});

	suite('logs', () => {
		test('shows the terminal of the service', async () => {
			let shown = false;
			stub(vscode.window, 'terminals', [{ name: 'Infrastructure - kafka', show: () => (shown = true) }]);

			await handlers.get(COMMAND_INFRASTRUCTURE_LOGS)!(new InfrastructureItem(service()));

			expect(shown).to.equal(true);
			expect(trackedCommands()).to.deep.equal([COMMAND_INFRASTRUCTURE_LOGS]);
		});

		test('warns when the terminal of the service is gone', async () => {
			stub(vscode.window, 'terminals', []);

			await handlers.get(COMMAND_INFRASTRUCTURE_LOGS)!(new InfrastructureItem(service()));

			expect(warnings).to.deep.equal(['Terminal for "kafka" was not found.']);
		});
	});

	suite('copy', () => {
		let clipboard: string[];

		setup(() => {
			clipboard = [];
			// Leave the clipboard of whoever runs the tests alone
			stub(vscode.env, 'clipboard', { writeText: async (text: string) => void clipboard.push(text) });
		});

		for (const [command, overrides, copied, message] of [
			[COMMAND_INFRASTRUCTURE_COPY_URL, { url: 'localhost:9092' }, 'localhost:9092', 'URL copied to clipboard: localhost:9092'],
			[COMMAND_INFRASTRUCTURE_COPY_PORT, { port: 9092 }, '9092', 'Port copied to clipboard: 9092'],
		] as const) {
			test(`${command} copies the value of the service`, async () => {
				await handlers.get(command)!(new InfrastructureItem(service(overrides)));

				expect(clipboard).to.deep.equal([copied]);
				expect(infos).to.deep.equal([message]);
				expect(trackedCommands()).to.deep.equal([command]);
			});
		}

		for (const [command, message] of [
			[COMMAND_INFRASTRUCTURE_COPY_URL, 'No URL available for service "kafka"'],
			[COMMAND_INFRASTRUCTURE_COPY_PORT, 'No port available for service "kafka"'],
		] as const) {
			test(`${command} warns when the service has no value to copy`, async () => {
				await handlers.get(command)!(new InfrastructureItem(service()));

				expect(warnings).to.deep.equal([message]);
				expect(clipboard).to.deep.equal([]);
				expect(trackedCommands()).to.deep.equal([]);
			});
		}
	});
});
