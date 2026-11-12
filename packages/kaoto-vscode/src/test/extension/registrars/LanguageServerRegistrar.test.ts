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
import { expect } from 'chai';
import * as os from 'os';
import * as vscode from 'vscode';
import {
	KAOTO_CATALOG_URL_SETTING_ID,
	KAOTO_LSP_ENABLED_SETTING_ID,
	KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID,
	KAOTO_LSP_SERVER_JAR_SETTING_ID,
	KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID,
} from '../../../constants';
import { LanguageServerRegistrar } from '../../../extension/registrars/LanguageServerRegistrar';
import { CamelLanguageServerManager } from '../../../lsp/CamelLanguageServerManager';
import { KaotoCatalogService } from '../../../services/KaotoCatalogService';

suite('LanguageServerRegistrar', () => {
	const originalOnDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration;
	const originalStart = CamelLanguageServerManager.prototype.start;
	const originalUpdateSettings = CamelLanguageServerManager.prototype.updateSettings;
	let context: vscode.ExtensionContext;
	let registrar: LanguageServerRegistrar;
	let changeConfiguration: (event: vscode.ConfigurationChangeEvent) => Promise<void>;
	let reloadCatalogs: () => void;
	let updates: number;

	/** One configuration change event that affects these settings. */
	const changeOf = (...settingIds: string[]) => ({ affectsConfiguration: (id: string) => settingIds.includes(id) }) as vscode.ConfigurationChangeEvent;

	setup(() => {
		updates = 0;
		CamelLanguageServerManager.prototype.start = () => Promise.resolve();
		CamelLanguageServerManager.prototype.updateSettings = () => {
			updates++;
			return Promise.resolve();
		};
		Object.defineProperty(vscode.workspace, 'onDidChangeConfiguration', {
			value: (listener: typeof changeConfiguration) => {
				changeConfiguration = listener;
				return new vscode.Disposable(() => undefined);
			},
			configurable: true,
		});
		context = {
			subscriptions: [],
			globalStorageUri: vscode.Uri.file(os.tmpdir()),
			extension: { packageJSON: { camelLanguageServer: { version: '1.2.3', sha256: '0'.repeat(64) } } },
		} as unknown as vscode.ExtensionContext;
		const catalogService = {
			onDidReloadCatalogs: (listener: () => void) => {
				reloadCatalogs = listener;
				return new vscode.Disposable(() => undefined);
			},
		} as unknown as KaotoCatalogService;

		registrar = new LanguageServerRegistrar(context, catalogService);
		registrar.register();
	});

	teardown(async () => {
		// disposes the listener that waits for a Camel file when the server is enabled, which is not in the subscriptions
		await registrar.stop();
		CamelLanguageServerManager.prototype.start = originalStart;
		CamelLanguageServerManager.prototype.updateSettings = originalUpdateSettings;
		Object.defineProperty(vscode.workspace, 'onDidChangeConfiguration', { value: originalOnDidChangeConfiguration, configurable: true });
		context.subscriptions.forEach((subscription) => subscription.dispose());
	});

	test('sends the settings to the server when the selected catalog changes', async () => {
		await changeConfiguration(changeOf(KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID));

		expect(updates).to.equal(1);
	});

	test('sends the settings to the server when kaoto.lsp.extraComponents changes', async () => {
		await changeConfiguration(changeOf(KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID));

		expect(updates).to.equal(1);
	});

	test('sends the settings to the server when the same change also affects kaoto.lsp.enabled', async () => {
		await changeConfiguration(changeOf(KAOTO_LSP_ENABLED_SETTING_ID, KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID));

		expect(updates).to.equal(1);
	});

	test('sends the settings to the server when the catalogs are loaded again', () => {
		reloadCatalogs();

		expect(updates).to.equal(1);
	});

	test('leaves a catalog selected with a new kaoto.catalog.url to the reload of its catalogs', async () => {
		await changeConfiguration(changeOf(KAOTO_CATALOG_URL_SETTING_ID, KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID));

		expect(updates).to.equal(0);
	});

	suite('open Camel files', () => {
		const IDLE_STOP_DELAY_MS = 40;
		const originalStop = CamelLanguageServerManager.prototype.stop;
		const originalSetStatusBarVisible = CamelLanguageServerManager.prototype.setStatusBarVisible;
		const originalGetConfiguration = vscode.workspace.getConfiguration;
		const originalTextDocuments = Object.getOwnPropertyDescriptor(vscode.workspace, 'textDocuments');
		const originalOnDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument;
		const originalOnDidCloseTextDocument = vscode.workspace.onDidCloseTextDocument;
		const originalTabGroups = Object.getOwnPropertyDescriptor(vscode.window, 'tabGroups');
		let idleRegistrar: LanguageServerRegistrar;
		let enabled: boolean;
		let openDocuments: vscode.TextDocument[];
		let openListeners: ((document: vscode.TextDocument) => void)[];
		let closeListeners: ((document: vscode.TextDocument) => void)[];
		let tabListeners: (() => void)[];
		let activeTabInput: unknown;
		let starts: number;
		let stops: number;
		let running: boolean;
		let startFails: boolean;
		let statusBarVisible: boolean | undefined;
		let resolveStop: (() => void) | undefined;

		const documentOf = (filePath: string) => ({ uri: vscode.Uri.file(filePath), languageId: 'yaml' }) as unknown as vscode.TextDocument;
		const route = documentOf('/project/route.camel.yaml');
		const otherRoute = documentOf('/project/other.camel.yaml');
		const readme = documentOf('/project/README.md');

		const open = (document: vscode.TextDocument) => {
			openDocuments.push(document);
			openListeners.forEach((listener) => listener(document));
		};
		const close = (document: vscode.TextDocument) => {
			openDocuments = openDocuments.filter((openDocument) => openDocument !== document);
			closeListeners.forEach((listener) => listener(document));
		};
		const activate = (input: unknown) => {
			activeTabInput = input;
			tabListeners.forEach((listener) => listener());
		};
		const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
		// the server starts once a stop in progress ended, and stops when its timer fires
		const settle = () => sleep(5);
		const pastGracePeriod = () => sleep(IDLE_STOP_DELAY_MS * 3);
		const listenTo =
			<T>(listeners: T[]) =>
			(listener: T) => {
				listeners.push(listener);
				return new vscode.Disposable(() => listeners.splice(listeners.indexOf(listener), 1));
			};

		setup(async () => {
			// the registrar of the outer suite follows the real documents
			await registrar.stop();
			enabled = true;
			openDocuments = [];
			openListeners = [];
			closeListeners = [];
			tabListeners = [];
			activeTabInput = undefined;
			starts = 0;
			stops = 0;
			running = false;
			startFails = false;
			statusBarVisible = undefined;
			resolveStop = undefined;
			// like the manager, a start does nothing to a running server, and a stop of a stopped server ends at once
			CamelLanguageServerManager.prototype.start = () => {
				if (!running) {
					starts++;
					running = !startFails;
				}
				return Promise.resolve();
			};
			CamelLanguageServerManager.prototype.stop = () => {
				stops++;
				if (!running || resolveStop === undefined) {
					running = false;
					return Promise.resolve();
				}
				running = false;
				return new Promise<void>((resolve) => (resolveStop = resolve));
			};
			CamelLanguageServerManager.prototype.setStatusBarVisible = (visible: boolean) => {
				statusBarVisible = visible;
			};
			Object.defineProperty(vscode.workspace, 'getConfiguration', {
				value: (section?: string, scope?: vscode.ConfigurationScope | null) => {
					const config = originalGetConfiguration(section, scope);
					return {
						...config,
						get: (key: string, defaultValue?: unknown) => (key === KAOTO_LSP_ENABLED_SETTING_ID ? enabled : config.get(key, defaultValue)),
					};
				},
				configurable: true,
			});
			Object.defineProperty(vscode.workspace, 'textDocuments', { get: () => openDocuments, configurable: true });
			Object.defineProperty(vscode.workspace, 'onDidOpenTextDocument', { value: listenTo(openListeners), configurable: true });
			Object.defineProperty(vscode.workspace, 'onDidCloseTextDocument', { value: listenTo(closeListeners), configurable: true });
			Object.defineProperty(vscode.window, 'tabGroups', {
				value: {
					get activeTabGroup() {
						return { activeTab: activeTabInput === undefined ? undefined : { input: activeTabInput } };
					},
					onDidChangeTabs: listenTo(tabListeners),
					onDidChangeTabGroups: listenTo(tabListeners),
				},
				configurable: true,
			});
		});

		const requestRetry = () => (idleRegistrar as unknown as { lspManager: { retryRequested: vscode.EventEmitter<void> } }).lspManager.retryRequested.fire();

		const register = () => {
			idleRegistrar = new LanguageServerRegistrar(
				context,
				{ onDidReloadCatalogs: () => new vscode.Disposable(() => undefined) } as unknown as KaotoCatalogService,
				IDLE_STOP_DELAY_MS,
			);
			idleRegistrar.register();
		};

		teardown(async () => {
			resolveStop?.();
			resolveStop = undefined;
			await idleRegistrar.stop();
			CamelLanguageServerManager.prototype.stop = originalStop;
			CamelLanguageServerManager.prototype.setStatusBarVisible = originalSetStatusBarVisible;
			Object.defineProperty(vscode.workspace, 'getConfiguration', { value: originalGetConfiguration, configurable: true });
			Object.defineProperty(vscode.workspace, 'textDocuments', originalTextDocuments!);
			Object.defineProperty(vscode.workspace, 'onDidOpenTextDocument', { value: originalOnDidOpenTextDocument, configurable: true });
			Object.defineProperty(vscode.workspace, 'onDidCloseTextDocument', { value: originalOnDidCloseTextDocument, configurable: true });
			Object.defineProperty(vscode.window, 'tabGroups', originalTabGroups!);
		});

		test('starts the server for a Camel file that is already open', async () => {
			openDocuments = [route];
			register();
			await settle();

			expect(starts).to.equal(1);
		});

		test('starts the server when the first Camel file opens, not for other files', async () => {
			register();
			open(readme);
			await settle();
			expect(starts).to.equal(0);

			open(route);
			await settle();

			expect(starts).to.equal(1);
		});

		test('starts the server once for the Camel files open at the same time', async () => {
			register();
			open(route);
			open(otherRoute);
			await settle();

			expect(starts).to.equal(1);
		});

		test('stops the server after the grace period when the last Camel file closes', async () => {
			register();
			open(route);
			open(otherRoute);
			await settle();

			close(route);
			await pastGracePeriod();
			expect(stops).to.equal(0);

			close(otherRoute);
			expect(stops).to.equal(0);
			await pastGracePeriod();

			expect(stops).to.equal(1);
			expect(running).to.be.false;
		});

		test('keeps the server running when other files close', async () => {
			register();
			open(route);
			open(readme);
			await settle();

			close(readme);
			await pastGracePeriod();

			expect(stops).to.equal(0);
		});

		test('keeps the running server when a Camel file opens within the grace period', async () => {
			register();
			open(route);
			await settle();

			close(route);
			open(otherRoute);
			await pastGracePeriod();

			expect(starts).to.equal(1);
			expect(stops).to.equal(0);
			expect(running).to.be.true;
		});

		test('starts the server again when a Camel file opens after the grace period', async () => {
			register();
			open(route);
			await settle();
			close(route);
			await pastGracePeriod();

			open(route);
			await settle();

			expect(starts).to.equal(2);
			expect(stops).to.equal(1);
			expect(running).to.be.true;
		});

		test('starts the server for a Camel file opened during the stop, once the server stopped', async () => {
			register();
			open(route);
			await settle();
			resolveStop = () => undefined;
			close(route);
			await pastGracePeriod();
			expect(stops).to.equal(1);

			open(route);
			await settle();
			expect(starts).to.equal(1);

			resolveStop();
			resolveStop = undefined;
			await settle();

			expect(starts).to.equal(2);
			expect(running).to.be.true;
		});

		test('starts the server after the stops in progress, not after the latest one only', async () => {
			register();
			open(route);
			await settle();
			resolveStop = () => undefined;

			// the server is stopping when the JAR changes again: that stop has nothing left to stop
			const firstChange = changeConfiguration(changeOf(KAOTO_LSP_SERVER_JAR_SETTING_ID));
			const endFirstStop = resolveStop;
			const secondChange = changeConfiguration(changeOf(KAOTO_LSP_SERVER_JAR_SETTING_ID));
			await settle();
			expect(stops).to.equal(2);
			expect(starts, 'while the server stops').to.equal(1);

			endFirstStop();
			resolveStop = undefined;
			await Promise.all([firstChange, secondChange]);
			await settle();

			expect(starts).to.equal(2);
			expect(running).to.be.true;
		});

		test('tries again a start that failed when the next Camel file opens', async () => {
			startFails = true;
			register();
			open(route);
			await settle();
			expect(running).to.be.false;

			startFails = false;
			open(otherRoute);
			await settle();

			expect(starts).to.equal(2);
			expect(running).to.be.true;
		});

		test('starts the server on a retry with no Camel file left, and stops it after the grace period', async () => {
			startFails = true;
			register();
			open(route);
			await settle();
			close(route);
			await pastGracePeriod();
			const stopsBeforeRetry = stops;

			startFails = false;
			requestRetry();
			await settle();
			expect(starts).to.equal(2);
			expect(running).to.be.true;

			await pastGracePeriod();

			expect(stops).to.equal(stopsBeforeRetry + 1);
			expect(running).to.be.false;
		});

		test('keeps the server of a retry running while a Camel file is open', async () => {
			startFails = true;
			register();
			open(route);
			await settle();

			startFails = false;
			requestRetry();
			await pastGracePeriod();

			expect(running).to.be.true;
			expect(stops).to.equal(0);
		});

		test('does not start a disabled server on a retry', async () => {
			register();
			enabled = false;

			requestRetry();
			await pastGracePeriod();

			expect(starts).to.equal(0);
		});

		test('does not start a disabled server, and no longer stops it for closed files', async () => {
			enabled = false;
			register();
			open(route);
			await settle();
			close(route);
			await pastGracePeriod();

			expect(starts).to.equal(0);
			expect(stops).to.equal(0);
		});

		test('starts the server for the open Camel files again after a new kaoto.lsp.serverJarPath', async () => {
			register();
			open(route);
			await settle();

			await changeConfiguration(changeOf(KAOTO_LSP_SERVER_JAR_SETTING_ID));
			await settle();

			expect(stops).to.equal(1);
			expect(starts).to.equal(2);
		});

		test('does not stop the server at the end of a grace period that started before it was disabled', async () => {
			register();
			open(route);
			await settle();
			close(route);

			enabled = false;
			await changeConfiguration(changeOf(KAOTO_LSP_ENABLED_SETTING_ID));
			await pastGracePeriod();

			expect(stops).to.equal(1);
		});

		test('shows the status bar item only while the active tab is a Camel file', () => {
			openDocuments = [route, readme];
			register();
			expect(statusBarVisible).to.be.false;

			activate(new vscode.TabInputText(route.uri));
			expect(statusBarVisible).to.be.true;

			activate(new vscode.TabInputText(readme.uri));
			expect(statusBarVisible).to.be.false;

			activate(undefined);
			expect(statusBarVisible).to.be.false;
		});

		test('shows the status bar item on the active Camel file when the server is enabled later', async () => {
			enabled = false;
			openDocuments = [route];
			activeTabInput = new vscode.TabInputText(route.uri);
			register();
			expect(statusBarVisible).to.be.undefined;

			enabled = true;
			await changeConfiguration(changeOf(KAOTO_LSP_ENABLED_SETTING_ID));

			expect(statusBarVisible).to.be.true;
		});

		test('does not follow the tabs while the server is disabled', () => {
			enabled = false;
			openDocuments = [route];
			register();

			activate(new vscode.TabInputText(route.uri));

			expect(statusBarVisible).to.be.undefined;
		});

		test('shows the status bar item on a diff with a Camel file on either side', () => {
			openDocuments = [route, readme];
			register();

			activate(new vscode.TabInputTextDiff(route.uri, readme.uri));
			expect(statusBarVisible).to.be.true;

			activate(new vscode.TabInputTextDiff(readme.uri, route.uri));
			expect(statusBarVisible).to.be.true;

			activate(new vscode.TabInputTextDiff(readme.uri, readme.uri));
			expect(statusBarVisible).to.be.false;
		});

		test('shows the status bar item on a Camel file in the Kaoto editor', () => {
			openDocuments = [route];
			register();

			activate(new vscode.TabInputCustom(route.uri, 'kaoto'));

			expect(statusBarVisible).to.be.true;
		});

		test('shows the status bar item once the document of the active tab is open', () => {
			register();
			activate(new vscode.TabInputText(route.uri));
			expect(statusBarVisible).to.be.false;

			open(route);

			expect(statusBarVisible).to.be.true;
		});
	});
});
