import { expect } from 'chai';
import * as vscode from 'vscode';
import { CamelCommandAPI } from '../../../executors/api/CamelCommandAPI';
import { InfrastructureProvider } from '../../../views/infrastructure/InfrastructureProvider';
import { InfrastructureItem, RunningInfrastructureService } from '../../../views/infrastructure/InfrastructureItem';

suite('InfrastructureProvider view state', () => {
	const restores: (() => void)[] = [];
	let provider: InfrastructureProvider;
	let contexts: Map<string, unknown>;
	let treeChanges: number;
	let cliServices: object[];

	const stub = (target: object, key: string, value: unknown) => {
		const original = (target as Record<string, unknown>)[key];
		Object.defineProperty(target, key, { value, configurable: true });
		restores.push(() => Object.defineProperty(target, key, { value: original, configurable: true }));
	};

	const service = (name: string, overrides: Partial<RunningInfrastructureService> = {}): RunningInfrastructureService => ({
		name,
		args: [],
		terminalName: `Infrastructure - ${name}`,
		status: 'running',
		...overrides,
	});

	const isAutoRefreshActive = () => provider['refreshManager'].isAutoRefreshActive();

	setup(() => {
		contexts = new Map();
		treeChanges = 0;
		cliServices = [];
		const executeCommand = vscode.commands.executeCommand;
		stub(vscode.commands, 'executeCommand', async (command: string, ...args: unknown[]) => {
			if (command === 'setContext') {
				contexts.set(args[0] as string, args[1]);
				return undefined;
			}
			return executeCommand(command, ...args);
		});
		stub(CamelCommandAPI, 'captureInfraPs', async () => JSON.stringify(cliServices));
		stub(CamelCommandAPI, 'captureInfraList', async () => JSON.stringify([{ alias: 'kafka' }, { alias: 'artemis' }]));
		provider = new InfrastructureProvider();
		provider.onDidChangeTreeData(() => treeChanges++);
	});

	teardown(() => {
		provider.dispose();
		while (restores.length > 0) {
			restores.pop()!();
		}
	});

	test('tells the view once the available services are loaded', async () => {
		const services = await provider.ensureAvailableServicesLoaded();

		expect(services.map(({ name }) => name)).to.deep.equal(['artemis', 'kafka']);
		expect(provider.getAvailableServices()).to.deep.equal(services);
		expect(contexts.get('kaoto.infrastructureCatalogLoaded')).to.equal(true);
	});

	test('tells the view while a service is starting', () => {
		provider.setStartingService(true);

		expect(provider.isServiceStarting()).to.equal(true);
		expect(contexts.get('kaoto.infrastructureStarting')).to.equal(true);

		provider.setStartingService(false);

		expect(contexts.get('kaoto.infrastructureStarting')).to.equal(false);
	});

	test('refreshes automatically while services are running', () => {
		provider.registerRunningService(service('kafka'));

		expect(isAutoRefreshActive()).to.equal(true);
		expect(contexts.get('kaoto.infrastructureRunning')).to.equal(true);

		provider.unregisterRunningService('kafka');

		expect(isAutoRefreshActive()).to.equal(false);
		expect(contexts.get('kaoto.infrastructureRunning')).to.equal(false);
	});

	test('shows services the Camel CLI runs on a refresh', async () => {
		cliServices = [{ name: 'artemis', serviceData: { port: 61616 } }];

		await provider.refresh();

		const [item] = provider.getChildren() as InfrastructureItem[];
		expect(provider.getTreeItem(item)).to.equal(item);
		expect(provider.getRunningService('artemis')?.isExternal).to.equal(true);
		expect(isAutoRefreshActive()).to.equal(true);
	});

	test('updates the view on a refresh, also when nothing changed', async () => {
		await provider.refresh();

		expect(treeChanges).to.equal(1);
	});

	test('updates the view on an automatic refresh only when something changed', async () => {
		await provider['handleAutoRefresh']();
		expect(treeChanges).to.equal(0);

		cliServices = [{ name: 'artemis' }];
		await provider['handleAutoRefresh']();

		expect(treeChanges).to.equal(1);
	});

	test('does not refresh from the Camel CLI during a manual operation', async () => {
		provider.setManualOperationInProgress(true);
		cliServices = [{ name: 'artemis' }];

		await provider.refresh();

		expect(provider.getRunningService('artemis')).to.be.undefined;
	});

	test('looks up a running service in the Camel CLI', async () => {
		cliServices = [{ name: 'kafka', serviceData: { port: 9092 } }];

		expect((await provider.getCliRunningService('kafka'))?.port).to.equal(9092);
	});
});
