import { expect } from 'chai';
import * as vscode from 'vscode';
import { CamelCommandAPI } from '../../../executors/api/CamelCommandAPI';
import { CamelTask } from '../../../tasks/CamelTask';
import { InfrastructureServiceManager } from '../../../views/infrastructure/InfrastructureServiceManager';
import { RunningInfrastructureService } from '../../../views/infrastructure/InfrastructureItem';

const DOCKER_ERROR = 'Could not find a valid Docker environment';

async function waitFor(condition: () => boolean, description: string): Promise<void> {
	const deadline = Date.now() + 10_000;
	while (!condition() && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	expect(condition(), description).to.equal(true);
}

suite('InfrastructureServiceManager service lifecycle', () => {
	const restores: (() => void)[] = [];
	let manager: InfrastructureServiceManager;
	let changes: number;
	let errorMessages: string[];
	let counter = 0;

	const stub = (target: object, key: string, value: unknown) => {
		const original = (target as Record<string, unknown>)[key];
		Object.defineProperty(target, key, { value, configurable: true });
		restores.push(() => Object.defineProperty(target, key, { value: original, configurable: true }));
	};

	/** The Camel CLI answers `infra ps` with these services, or fails with the error */
	const cliRunning = (services: object[] | Error) =>
		stub(CamelCommandAPI, 'captureInfraPs', async () => {
			if (services instanceof Error) {
				throw services;
			}
			return JSON.stringify(services);
		});

	const service = (overrides: Partial<RunningInfrastructureService> = {}): RunningInfrastructureService => ({
		name: 'kafka',
		args: [],
		terminalName: `Infrastructure - kafka ${Date.now()}-${++counter}`,
		status: 'running',
		...overrides,
	});

	/** Runs a task named like the terminal of the service, which ends with the exit code */
	const endServiceTask = async (terminalName: string, exitCode: number) => {
		const execution = new vscode.ShellExecution(process.execPath, ['-e', { value: `process.exit(${exitCode})`, quoting: vscode.ShellQuoting.Strong }], {
			env: { ELECTRON_RUN_AS_NODE: '1' },
		});
		await vscode.tasks.executeTask(new CamelTask(vscode.TaskScope.Workspace, terminalName, execution, true, vscode.TaskRevealKind.Never));
	};

	setup(() => {
		changes = 0;
		errorMessages = [];
		stub(vscode.window, 'showErrorMessage', async (message: string) => {
			errorMessages.push(message);
			return undefined;
		});
		manager = new InfrastructureServiceManager(() => changes++);
	});

	teardown(() => {
		manager.dispose();
		while (restores.length > 0) {
			restores.pop()!();
		}
	});

	suite('available services', () => {
		let listCalls: number;

		const cliAvailable = (services: object[] | Error) => {
			listCalls = 0;
			stub(CamelCommandAPI, 'captureInfraList', async () => {
				listCalls++;
				if (services instanceof Error) {
					throw services;
				}
				return JSON.stringify(services);
			});
		};

		test('are loaded from the Camel CLI once, sorted by name', async () => {
			cliAvailable([{ alias: 'kafka', description: 'Apache Kafka' }, { alias: 'artemis' }]);

			const loaded = await manager.ensureAvailableServicesLoaded();
			await manager.ensureAvailableServicesLoaded();

			expect(loaded.map(({ name }) => name)).to.deep.equal(['artemis', 'kafka']);
			expect(manager.getAvailableServices().map(({ name }) => name)).to.deep.equal(['artemis', 'kafka']);
			expect(manager.isServicesLoaded()).to.equal(true);
			expect(listCalls).to.equal(1);
		});

		test('are loaded again when asked to', async () => {
			cliAvailable([{ alias: 'kafka' }]);
			await manager.ensureAvailableServicesLoaded();

			await manager.ensureAvailableServicesLoaded(true);

			expect(listCalls).to.equal(2);
		});

		test('pass on a failure of the Camel CLI and stay unloaded', async () => {
			cliAvailable(new Error('camel not found'));

			let error: Error | undefined;
			await manager.ensureAvailableServicesLoaded().catch((e: Error) => (error = e));

			expect(error?.message).to.equal('camel not found');
			expect(manager.isServicesLoaded()).to.equal(false);
		});
	});

	suite('running service from the Camel CLI', () => {
		test('is looked up by name', async () => {
			cliRunning([{ name: 'kafka', serviceData: { host: 'localhost', port: 9092 } }]);

			expect((await manager.getCliRunningService('kafka'))?.port).to.equal(9092);
			expect(await manager.getCliRunningService('artemis')).to.be.undefined;
		});

		test('is unknown when the Camel CLI fails', async () => {
			cliRunning(new Error('camel not found'));

			expect(await manager.getCliRunningService('kafka')).to.be.undefined;
		});
	});

	suite('starting service', () => {
		test('becomes running once the Camel CLI lists it', async () => {
			let calls = 0;
			stub(CamelCommandAPI, 'captureInfraPs', async () => JSON.stringify(++calls > 1 ? [{ name: 'kafka', serviceData: { port: 9092 } }] : []));

			manager.registerRunningService(service({ status: 'starting' }));

			await waitFor(() => manager.getRunningService('kafka')?.status === 'running', 'the service becomes running');
			expect(manager.getRunningService('kafka')?.port).to.equal(9092);
		});

		test('is no longer waited for once it is unregistered', async () => {
			let calls = 0;
			stub(CamelCommandAPI, 'captureInfraPs', async () => {
				calls++;
				return JSON.stringify([]);
			});
			manager.registerRunningService(service({ status: 'starting' }));
			await waitFor(() => calls > 0, 'the Camel CLI is asked');

			manager.unregisterRunningService('kafka');
			const callsAfterUnregister = calls;
			await new Promise((resolve) => setTimeout(resolve, 1_200));

			expect(calls).to.equal(callsAfterUnregister);
		});

		test('stays starting when it does not show up in time', async () => {
			cliRunning([]);
			manager['runningServices'].set('kafka', service({ status: 'starting' }));

			await manager['waitForRunningService']('kafka', 50, 10);

			expect(manager.getRunningService('kafka')?.status).to.equal('starting');
		});
	});

	suite('when the task of a service ends', () => {
		test('a failed start is reported and the service removed', async () => {
			cliRunning([]);
			const started = service({ status: 'starting' });
			manager.registerRunningService(started);

			await endServiceTask(started.terminalName, 1);

			await waitFor(() => manager.getRunningService('kafka') === undefined, 'the service is removed');
			expect(errorMessages).to.deep.equal(['Failed to start kafka (exit code 1). See the Kaoto output channel for details.']);
		});

		test('a missing container runtime is reported as such', async () => {
			cliRunning(new Error(DOCKER_ERROR));
			const started = service({ status: 'starting' });
			manager.registerRunningService(started);

			await endServiceTask(started.terminalName, 1);

			await waitFor(() => errorMessages.length > 0, 'the failure is reported');
			expect(errorMessages[0]).to.match(/^Failed to start kafka: Docker environment not found/);
		});

		test('a service that is no longer running is removed', async () => {
			cliRunning([]);
			const running = service();
			manager.registerRunningService(running);

			await endServiceTask(running.terminalName, 0);

			await waitFor(() => manager.getRunningService('kafka') === undefined, 'the service is removed');
			expect(errorMessages).to.deep.equal([]);
		});

		test('a missing container runtime while checking the service is reported', async () => {
			const running = service();
			manager.registerRunningService(running);
			cliRunning(new Error(DOCKER_ERROR));
			const changesBefore = changes;

			await endServiceTask(running.terminalName, 0);

			await waitFor(() => errorMessages.length > 0, 'the failure is reported');
			expect(errorMessages[0]).to.match(/^Docker environment not found/);
			expect(changes).to.be.greaterThan(changesBefore);
			expect(manager.getRunningService('kafka')).to.not.be.undefined;
		});

		test('any other failure while checking the service keeps it without a message', async () => {
			const running = service();
			manager.registerRunningService(running);
			cliRunning(new Error('camel not found'));
			const changesBefore = changes;

			await endServiceTask(running.terminalName, 0);

			await waitFor(() => changes > changesBefore, 'the view is refreshed');
			expect(errorMessages).to.deep.equal([]);
			expect(manager.getRunningService('kafka')).to.not.be.undefined;
		});

		test('a task of no service is ignored', async () => {
			cliRunning([]);
			manager.registerRunningService(service());
			const changesBefore = changes;

			await endServiceTask(`Unrelated task ${Date.now()}`, 1);
			await new Promise((resolve) => setTimeout(resolve, 500));

			expect(changes).to.equal(changesBefore);
			expect(manager.getRunningService('kafka')).to.not.be.undefined;
		});
	});
});
