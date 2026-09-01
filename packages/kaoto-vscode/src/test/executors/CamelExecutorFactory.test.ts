import { assert } from 'chai';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CamelExecutorFactory } from '../../executors/CamelExecutorFactory';
import { JBangExecutor } from '../../executors/JBangExecutor';
import { CamelLauncherExecutor } from '../../executors/CamelLauncherExecutor';
import { CamelLauncherDownloader } from '../../services/CamelLauncherDownloader';
import { initializeKaotoCatalogService } from '../utils/TestSetup';

suite('CamelExecutorFactory Tests', () => {
	let testStoragePath: string;

	suiteSetup(async () => {
		await initializeKaotoCatalogService();

		testStoragePath = path.join(__dirname, '..', '..', '..', 'test-factory-storage');
		if (!fs.existsSync(testStoragePath)) {
			fs.mkdirSync(testStoragePath, { recursive: true });
		}
	});

	setup(() => {
		CamelExecutorFactory.resetExecutor();
	});

	suiteTeardown(async () => {
		CamelExecutorFactory.resetExecutor();
		(CamelExecutorFactory as any).downloader = undefined;
		await vscode.workspace.getConfiguration().update('kaoto.executor.type', undefined, vscode.ConfigurationTarget.Global);
		if (fs.existsSync(testStoragePath)) {
			fs.rmSync(testStoragePath, { recursive: true, force: true });
		}
	});

	test('Should create JBangExecutor when type is jbang', async () => {
		await vscode.workspace.getConfiguration().update('kaoto.executor.type', 'jbang', vscode.ConfigurationTarget.Global);

		const executor = await CamelExecutorFactory.createExecutor();

		assert.instanceOf(executor, JBangExecutor);
	});

	test('Should create CamelLauncherExecutor when type is camel-launcher', async () => {
		await vscode.workspace.getConfiguration().update('kaoto.executor.type', 'camel-launcher', vscode.ConfigurationTarget.Global);

		// Inject a mock downloader that returns a fake JAR path without network access
		const fakeJarPath = path.join(testStoragePath, 'camel-launcher-fake.jar');
		fs.writeFileSync(fakeJarPath, 'fake jar content');
		const mockDownloader = new CamelLauncherDownloader(undefined, testStoragePath);
		mockDownloader.ensureLauncher = async () => fakeJarPath;
		(CamelExecutorFactory as any).downloader = mockDownloader;

		const executor = await CamelExecutorFactory.createExecutor();

		assert.instanceOf(executor, CamelLauncherExecutor);
	});

	test('Should use jbang as default when no type specified', async () => {
		await vscode.workspace.getConfiguration().update('kaoto.executor.type', undefined, vscode.ConfigurationTarget.Global);

		const executor = await CamelExecutorFactory.createExecutor();

		assert.instanceOf(executor, JBangExecutor);
	});

	test('Should check if executor is available', async () => {
		await vscode.workspace.getConfiguration().update('kaoto.executor.type', 'jbang', vscode.ConfigurationTarget.Global);

		const executor = await CamelExecutorFactory.createExecutor();
		const isAvailable = await executor.isAvailable();

		assert.isBoolean(isAvailable);
	});
});
