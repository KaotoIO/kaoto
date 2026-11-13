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
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Executable, LanguageClient, LanguageClientOptions, State, StateChangeEvent } from 'vscode-languageclient/node';
import { KAOTO_LSP_SERVER_JAR_SETTING_ID } from '../../constants';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';
import { CamelLanguageServerManager } from '../../lsp/CamelLanguageServerManager';
import { CamelLspServerDownloader } from '../../lsp/CamelLspServerDownloader';
import { CamelLspSettings } from '../../lsp/CamelLspSettings';
import { FileDownload } from '../../utils/Download';
import { JavaLookup, JavaVersionChecker } from '../../utils/JavaVersionChecker';

suite('CamelLanguageServerManager', () => {
	test('createLanguageClient returns a LanguageClient instance', () => {
		class DefaultClientManager extends CamelLanguageServerManager {
			public testCreateClient(serverOptions: Executable, clientOptions: LanguageClientOptions): LanguageClient {
				return this.createLanguageClient(serverOptions, clientOptions);
			}
		}
		const mgr = new DefaultClientManager(
			{ subscriptions: [] } as unknown as vscode.ExtensionContext,
			() => Promise.resolve({ camel: {} }),
			new CamelLspServerDownloader(os.tmpdir(), { version: '1.2.3', sha256: '0'.repeat(64) }),
		);
		const client = mgr.testCreateClient({ command: 'java', args: ['-jar', 'server.jar'] }, {});
		expect(client).to.be.an.instanceOf(LanguageClient);
	});
	const noSettings = () => Promise.resolve<CamelLspSettings>({ camel: {} });
	const JAVA_21: JavaLookup = { status: 'found', executable: 'java', version: 21 };
	const JAVA_11: JavaLookup = { status: 'tooOld', executable: 'java', version: 11 };

	const waitFor = async (condition: () => boolean) => {
		while (!condition()) {
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	};

	test('isRunning should return false before start', () => {
		// We cannot fully construct the manager without a real ExtensionContext,
		// but we can verify the static methods work correctly
		expect(CamelLanguageServerManager.REQUIRED_JAVA_VERSION).to.equal(17);
	});

	suite('resolveJarPath', () => {
		const RELEASE_CONTENT = 'release jar content';
		const hash = (algorithm: string, content: string) => crypto.createHash(algorithm).update(content).digest('hex');

		const originalGetConfiguration = vscode.workspace.getConfiguration;
		let storageDir: string;
		let settings: Record<string, unknown>;
		let requestedUrls: string[];

		const downloadWriting =
			(content: string): FileDownload =>
			async (url, targetPath) => {
				requestedUrls.push(url);
				await fs.promises.writeFile(targetPath, content);
			};

		const createManager = () =>
			new CamelLanguageServerManager(
				{ subscriptions: [] } as unknown as vscode.ExtensionContext,
				noSettings,
				new CamelLspServerDownloader(storageDir, { version: '1.2.3', sha256: hash('sha256', RELEASE_CONTENT) }, downloadWriting(RELEASE_CONTENT)),
			);

		setup(() => {
			storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-lsp-manager-'));
			settings = { [KAOTO_LSP_SERVER_JAR_SETTING_ID]: '' };
			requestedUrls = [];
			Object.defineProperty(vscode.workspace, 'getConfiguration', {
				value: (section?: string, scope?: vscode.ConfigurationScope | null) => {
					const config = originalGetConfiguration(section, scope);
					return {
						...config,
						get: (key: string, defaultValue?: unknown) => (key in settings ? settings[key] : config.get(key, defaultValue)),
					};
				},
				configurable: true,
			});
		});

		teardown(() => {
			Object.defineProperty(vscode.workspace, 'getConfiguration', { value: originalGetConfiguration, configurable: true });
			fs.rmSync(storageDir, { recursive: true, force: true });
		});

		test('runs the JAR set in kaoto.lsp.serverJarPath', async () => {
			const localJar = path.join(storageDir, 'local.jar');
			fs.writeFileSync(localJar, 'local build');
			settings[KAOTO_LSP_SERVER_JAR_SETTING_ID] = localJar;

			expect(await createManager().resolveJarPath()).to.equal(localJar);
			expect(requestedUrls).to.be.empty;
		});

		test('runs the release when no JAR is set', async () => {
			const jarPath = await createManager().resolveJarPath();

			expect(jarPath).to.equal(path.join(storageDir, 'camel-lsp-server', '1.2.3', 'camel-lsp-server-1.2.3.jar'));
			expect(requestedUrls).to.deep.equal(['https://repo1.maven.org/maven2/com/github/camel-tooling/camel-lsp-server/1.2.3/camel-lsp-server-1.2.3.jar']);
		});
	});

	suite('stop', () => {
		const originalFindJava = JavaVersionChecker.findJava;
		const originalShowErrorMessage = vscode.window.showErrorMessage;
		let storageDir: string;
		let errorMessages: string[];

		setup(() => {
			storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-lsp-manager-'));
			errorMessages = [];
			JavaVersionChecker.findJava = () => Promise.resolve(JAVA_21);
			Object.defineProperty(vscode.window, 'showErrorMessage', {
				value: (message: string) => {
					errorMessages.push(message);
					return Promise.resolve(undefined);
				},
				configurable: true,
			});
		});

		teardown(() => {
			JavaVersionChecker.findJava = originalFindJava;
			Object.defineProperty(vscode.window, 'showErrorMessage', { value: originalShowErrorMessage, configurable: true });
			fs.rmSync(storageDir, { recursive: true, force: true });
		});

		test('cancels a download in progress without reporting it', async () => {
			let downloadSignal: AbortSignal | undefined;
			const pendingDownload: FileDownload = (_url, _targetPath, _onProgress, signal) =>
				new Promise((_resolve, reject) => {
					downloadSignal = signal;
					signal?.addEventListener('abort', () => reject(signal.reason));
				});
			const manager = new CamelLanguageServerManager(
				{ subscriptions: [] } as unknown as vscode.ExtensionContext,
				noSettings,
				new CamelLspServerDownloader(storageDir, { version: '1.2.3', sha256: '0'.repeat(64) }, pendingDownload),
			);

			const start = manager.start();
			await waitFor(() => downloadSignal !== undefined);
			await manager.stop();
			await start;

			expect(downloadSignal?.aborted).to.be.true;
			expect(manager.isRunning()).to.be.false;
			expect(errorMessages).to.be.empty;
			expect(fs.readdirSync(path.join(storageDir, 'camel-lsp-server', '1.2.3'))).to.be.empty;
		});

		test('tells a failed download in one notification, and again after a Retry click', async () => {
			let selection: string | undefined = 'Retry';
			Object.defineProperty(vscode.window, 'showErrorMessage', {
				value: (message: string) => {
					errorMessages.push(message);
					const clicked = selection;
					selection = undefined;
					return Promise.resolve(clicked);
				},
				configurable: true,
			});
			const failingDownload: FileDownload = () => Promise.reject(new Error('offline'));
			const manager = new CamelLanguageServerManager(
				{ subscriptions: [] } as unknown as vscode.ExtensionContext,
				noSettings,
				new CamelLspServerDownloader(storageDir, { version: '1.2.3', sha256: '0'.repeat(64) }, failingDownload),
			);
			let retries = 0;
			manager.onDidRequestRetry(() => retries++);

			await manager.start();
			await waitFor(() => retries === 1);
			await manager.start();
			await manager.start();

			expect(errorMessages, 'once before the Retry click, once after it').to.have.lengthOf(2);
			expect(errorMessages[0]).to.contain('offline');
			expect(retries).to.equal(1);
		});
	});

	suite('settings', () => {
		const MAIN_SETTINGS: CamelLspSettings = { camel: { 'Camel catalog version': '4.23.0', 'Camel catalog runtime provider': 'DEFAULT' } };
		const QUARKUS_SETTINGS: CamelLspSettings = {
			camel: {
				'Camel catalog version': '4.22.1',
				'Camel catalog runtime provider': 'QUARKUS',
				'Camel catalog runtime provider version': '3.40.0',
			},
		};

		/**
		 * A client that starts no server: it runs once its start gate opens, and records the initializationOptions of each
		 * initialize and its notifications. Like LanguageClient, it initializes again a server that it restarts.
		 */
		class FakeLanguageClient {
			readonly initializations: unknown[] = [];
			readonly notifications: unknown[] = [];
			private currentState = State.Stopped;
			private readonly stateChanged = new vscode.EventEmitter<StateChangeEvent>();
			readonly onDidChangeState = this.stateChanged.event;

			constructor(
				readonly clientOptions: LanguageClientOptions,
				private readonly startGate: Promise<void>,
			) {}

			private pendingStart: Promise<void> | undefined;

			get state(): State {
				return this.currentState;
			}

			/** Like LanguageClient, a start while the client starts joins that start. */
			start(): Promise<void> {
				return this.run(this.startGate);
			}

			/**
			 * Restarts the server as LanguageClient does when the server stops: it runs again once the gate opens, or its
			 * start fails.
			 */
			restart(gate: Promise<void> = Promise.resolve(), endState = State.Running): Promise<void> {
				this.setState(State.Stopped);
				return this.run(gate, endState);
			}

			isRunning(): boolean {
				return this.currentState === State.Running;
			}

			async stop(): Promise<void> {
				this.setState(State.Stopped);
			}

			async sendNotification(_type: unknown, params: unknown): Promise<void> {
				this.notifications.push(params);
			}

			private run(gate: Promise<void>, endState = State.Running): Promise<void> {
				this.pendingStart ??= (async () => {
					this.initialize();
					try {
						await gate;
						this.setState(endState);
					} finally {
						this.pendingStart = undefined;
					}
				})();
				return this.pendingStart;
			}

			private initialize(): void {
				this.setState(State.Starting);
				const options = this.clientOptions.initializationOptions;
				this.initializations.push((options as () => unknown)());
			}

			private setState(newState: State): void {
				const oldState = this.currentState;
				this.currentState = newState;
				this.stateChanged.fire({ oldState, newState });
			}
		}

		class TestManager extends CamelLanguageServerManager {
			readonly clients: FakeLanguageClient[] = [];
			startGate: Promise<void> = Promise.resolve();

			protected override createLanguageClient(_serverOptions: Executable, clientOptions: LanguageClientOptions): LanguageClient {
				const client = new FakeLanguageClient(clientOptions, this.startGate);
				this.clients.push(client);
				return client as unknown as LanguageClient;
			}
		}

		const originalFindJava = JavaVersionChecker.findJava;
		const originalGetConfiguration = vscode.workspace.getConfiguration;
		const context = { subscriptions: [] } as unknown as vscode.ExtensionContext;
		let storageDir: string;
		let serverJar: string;
		let manager: TestManager;
		let settings: CamelLspSettings;
		let readError: Error | undefined;
		let reads: number;

		// one manager for the suite, so one output channel; VS Code logs an error when one is disposed of before it is ready
		suiteSetup(() => {
			storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-lsp-manager-'));
			serverJar = path.join(storageDir, 'camel-lsp-server.jar');
			fs.writeFileSync(serverJar, 'local build');
			manager = new TestManager(
				context,
				() => {
					reads++;
					return readError ? Promise.reject(readError) : Promise.resolve(settings);
				},
				// never downloads: kaoto.lsp.serverJarPath is set
				new CamelLspServerDownloader(storageDir, { version: '1.2.3', sha256: '0'.repeat(64) }),
			);
		});

		suiteTeardown(() => {
			fs.rmSync(storageDir, { recursive: true, force: true });
		});

		setup(() => {
			JavaVersionChecker.findJava = () => Promise.resolve(JAVA_21);
			Object.defineProperty(vscode.workspace, 'getConfiguration', {
				value: (section?: string, scope?: vscode.ConfigurationScope | null) => {
					const config = originalGetConfiguration(section, scope);
					return {
						...config,
						get: (key: string, defaultValue?: unknown) => (key === KAOTO_LSP_SERVER_JAR_SETTING_ID ? serverJar : config.get(key, defaultValue)),
					};
				},
				configurable: true,
			});
			settings = MAIN_SETTINGS;
			readError = undefined;
			reads = 0;
			manager.clients.length = 0;
			manager.startGate = Promise.resolve();
		});

		teardown(async () => {
			await manager.stop();
			JavaVersionChecker.findJava = originalFindJava;
			Object.defineProperty(vscode.workspace, 'getConfiguration', { value: originalGetConfiguration, configurable: true });
		});

		test('shows the status bar item only when it is set visible and the server is not stopped', async () => {
			const originalCreateStatusBarItem = vscode.window.createStatusBarItem;
			let shown = false;
			Object.defineProperty(vscode.window, 'createStatusBarItem', {
				value: () => ({ show: () => (shown = true), hide: () => (shown = false), dispose: () => undefined }),
				configurable: true,
			});
			let statusManager: TestManager;
			try {
				statusManager = new TestManager(context, noSettings, new CamelLspServerDownloader(storageDir, { version: '1.2.3', sha256: '0'.repeat(64) }));
			} finally {
				Object.defineProperty(vscode.window, 'createStatusBarItem', { value: originalCreateStatusBarItem, configurable: true });
			}

			statusManager.setStatusBarVisible(true);
			expect(shown, 'stopped server').to.be.false;

			await statusManager.start();
			expect(shown, 'running server on a Camel file').to.be.true;

			statusManager.setStatusBarVisible(false);
			expect(shown, 'running server on another file').to.be.false;

			statusManager.setStatusBarVisible(true);
			await statusManager.stop();
			expect(shown, 'server stopped again').to.be.false;
		});

		test('starts no second server while the client restarts its server', async () => {
			await manager.start();
			let openRestartGate: () => void = () => undefined;
			const restart = manager.clients[0].restart(
				new Promise((resolve) => {
					openRestartGate = resolve;
				}),
			);

			await manager.start();
			openRestartGate();
			await restart;

			expect(manager.clients).to.have.lengthOf(1);
		});

		test('starts a new client when the previous one stopped for good', async () => {
			await manager.start();
			await manager.clients[0].stop();

			await manager.start();

			expect(manager.clients).to.have.lengthOf(2);
			expect(manager.isRunning()).to.be.true;
		});

		test('starts a new client when the client failed to restart its server', async () => {
			await manager.start();
			await manager.clients[0].restart(Promise.resolve(), State.StartFailed);

			await manager.start();

			expect(manager.clients).to.have.lengthOf(2);
			expect(manager.isRunning()).to.be.true;
		});

		test('stops the server that the client restarts once it runs, instead of leaving it running', async () => {
			await manager.start();
			let openRestartGate: () => void = () => undefined;
			const restart = manager.clients[0].restart(
				new Promise((resolve) => {
					openRestartGate = resolve;
				}),
			);

			const stop = manager.stop();
			openRestartGate();
			await stop;
			await restart;

			expect(manager.clients[0].isRunning()).to.be.false;
			expect(manager.isRunning()).to.be.false;
		});

		test('tells a missing Java in one notification until the server starts', async () => {
			const originalShowWarningMessage = vscode.window.showWarningMessage;
			const warnings: string[] = [];
			Object.defineProperty(vscode.window, 'showWarningMessage', {
				value: (message: string) => {
					warnings.push(message);
					return Promise.resolve(undefined);
				},
				configurable: true,
			});
			try {
				JavaVersionChecker.findJava = () => Promise.resolve({ status: 'notFound' });
				await manager.start();
				await manager.start();

				expect(warnings).to.have.lengthOf(1);
				expect(warnings[0]).to.contain('install a JDK');
			} finally {
				Object.defineProperty(vscode.window, 'showWarningMessage', { value: originalShowWarningMessage, configurable: true });
			}
		});

		suite('Java warnings', () => {
			const originalShowWarningMessage = vscode.window.showWarningMessage;
			const originalOpenExternal = vscode.env.openExternal;
			const outputChannel = KaotoOutputChannel.getInstance();
			const ownShow = Object.getOwnPropertyDescriptor(outputChannel, 'show');
			let warnings: { message: string; actions: string[] }[];
			/** the button that the user clicks in the warning */
			let selection: string | undefined;
			let openedUris: string[];
			let outputShown: boolean;

			setup(async () => {
				// a successful start forgets the problems that earlier tests notified
				await manager.start();
				await manager.stop();
				warnings = [];
				selection = undefined;
				openedUris = [];
				outputShown = false;
				Object.defineProperty(vscode.window, 'showWarningMessage', {
					value: (message: string, ...actions: string[]) => {
						warnings.push({ message, actions });
						return Promise.resolve(selection);
					},
					configurable: true,
				});
				Object.defineProperty(vscode.env, 'openExternal', {
					value: (uri: vscode.Uri) => {
						openedUris.push(uri.toString());
						return Promise.resolve(true);
					},
					configurable: true,
				});
				Object.defineProperty(outputChannel, 'show', { value: () => (outputShown = true), configurable: true, writable: true });
			});

			teardown(() => {
				Object.defineProperty(vscode.window, 'showWarningMessage', { value: originalShowWarningMessage, configurable: true });
				Object.defineProperty(vscode.env, 'openExternal', { value: originalOpenExternal, configurable: true });
				if (ownShow) {
					Object.defineProperty(outputChannel, 'show', ownShow);
				} else {
					delete (outputChannel as { show?: unknown }).show;
				}
			});

			test('offers to install a JDK when no Java is found', async () => {
				JavaVersionChecker.findJava = () => Promise.resolve({ status: 'notFound' });

				await manager.start();

				expect(manager.isRunning()).to.be.false;
				expect(warnings).to.have.lengthOf(1);
				expect(warnings[0].actions).to.deep.equal(['Install JDK']);
			});

			test('offers to install a JDK when the Java found is too old', async () => {
				JavaVersionChecker.findJava = () => Promise.resolve({ status: 'tooOld', executable: '/jdk11/bin/java', version: 11 });

				await manager.start();

				expect(manager.isRunning()).to.be.false;
				expect(warnings).to.have.lengthOf(1);
				expect(warnings[0].message).to.contain('found Java 11 at /jdk11/bin/java');
				expect(warnings[0].actions).to.deep.equal(['Install JDK']);
			});

			test('tells a Java that cannot run, instead of asking to install a JDK', async () => {
				JavaVersionChecker.findJava = () => Promise.resolve({ status: 'notRunnable', executable: '/jdk/bin/java', error: new Error('spawn EACCES') });

				await manager.start();

				expect(manager.isRunning()).to.be.false;
				expect(warnings).to.have.lengthOf(1);
				expect(warnings[0].message).to.contain('Could not run Java at /jdk/bin/java');
				expect(warnings[0].message).not.to.contain('install a JDK');
				expect(warnings[0].actions).to.deep.equal(['Show Output']);
			});

			test('opens the JDK installation guide when Install JDK is clicked', async () => {
				JavaVersionChecker.findJava = () => Promise.resolve({ status: 'tooOld', executable: '/jdk11/bin/java', version: 11 });
				selection = 'Install JDK';

				await manager.start();
				await waitFor(() => openedUris.length > 0);

				expect(openedUris).to.deep.equal(['https://adoptium.net/installation/']);
				expect(outputShown).to.be.false;
			});

			test('shows the Kaoto output when Show Output is clicked', async () => {
				JavaVersionChecker.findJava = () => Promise.resolve({ status: 'notRunnable', executable: '/jdk/bin/java', error: new Error('spawn EACCES') });
				selection = 'Show Output';

				await manager.start();
				await waitFor(() => outputShown);

				expect(openedUris).to.be.empty;
			});
		});

		test('tells a missing JAR in one notification until the server starts', async () => {
			const originalShowErrorMessage = vscode.window.showErrorMessage;
			const errors: string[] = [];
			Object.defineProperty(vscode.window, 'showErrorMessage', {
				value: (message: string) => {
					errors.push(message);
					return Promise.resolve(undefined);
				},
				configurable: true,
			});
			const existingJar = serverJar;
			try {
				serverJar = path.join(storageDir, 'missing.jar');
				await manager.start();
				await manager.start();

				expect(errors).to.have.lengthOf(1);
				expect(errors[0]).to.contain('missing.jar');
			} finally {
				serverJar = existingJar;
				Object.defineProperty(vscode.window, 'showErrorMessage', { value: originalShowErrorMessage, configurable: true });
			}
		});

		test('tells a problem in one notification until the server starts, and in the log each time', async () => {
			const originalShowWarningMessage = vscode.window.showWarningMessage;
			const warnings: string[] = [];
			Object.defineProperty(vscode.window, 'showWarningMessage', {
				value: (message: string) => {
					warnings.push(message);
					return Promise.resolve(undefined);
				},
				configurable: true,
			});
			try {
				JavaVersionChecker.findJava = () => Promise.resolve(JAVA_11);
				await manager.start();
				await manager.start();
				expect(warnings, 'same problem again').to.have.lengthOf(1);
				expect(manager.isRunning()).to.be.false;

				JavaVersionChecker.findJava = () => Promise.resolve(JAVA_21);
				await manager.start();
				expect(manager.isRunning()).to.be.true;
				await manager.stop();

				JavaVersionChecker.findJava = () => Promise.resolve(JAVA_11);
				await manager.start();
				expect(warnings, 'after a successful start').to.have.lengthOf(2);
			} finally {
				Object.defineProperty(vscode.window, 'showWarningMessage', { value: originalShowWarningMessage, configurable: true });
			}
		});

		test('starts the server with the settings in its initializationOptions', async () => {
			await manager.start();

			expect(manager.isRunning()).to.be.true;
			expect(manager.clients).to.have.lengthOf(1);
			expect(manager.clients[0].initializations).to.deep.equal([MAIN_SETTINGS]);
		});

		test('starts the server with its bundled catalog when the settings cannot be read', async () => {
			readError = new Error('the catalog index is malformed');

			await manager.start().catch(() => undefined);

			expect(manager.isRunning()).to.be.true;
			expect(manager.clients[0].initializations).to.deep.equal([{ camel: {} }]);
		});

		test('sends the changed settings to the running server, once', async () => {
			await manager.start();

			settings = QUARKUS_SETTINGS;
			await manager.updateSettings();
			await manager.updateSettings();

			expect(manager.clients[0].notifications).to.deep.equal([{ settings: QUARKUS_SETTINGS }]);
		});

		test('sends nothing when the settings did not change', async () => {
			await manager.start();

			await manager.updateSettings();

			expect(manager.clients[0].notifications).to.be.empty;
		});

		test('sends the settings changed during a start once the server runs', async () => {
			let openStartGate: () => void = () => undefined;
			manager.startGate = new Promise((resolve) => {
				openStartGate = resolve;
			});
			const start = manager.start();
			await waitFor(() => manager.clients.length === 1);

			settings = QUARKUS_SETTINGS;
			const update = manager.updateSettings();
			openStartGate();
			await Promise.all([start, update]);

			expect(manager.clients[0].initializations).to.deep.equal([MAIN_SETTINGS]);
			expect(manager.clients[0].notifications).to.deep.equal([{ settings: QUARKUS_SETTINGS }]);
		});

		test('initializes a server that the client restarts with the latest settings', async () => {
			await manager.start();
			settings = QUARKUS_SETTINGS;
			await manager.updateSettings();

			await manager.clients[0].restart();
			await manager.updateSettings();

			expect(manager.clients[0].initializations).to.deep.equal([MAIN_SETTINGS, QUARKUS_SETTINGS]);
			expect(manager.clients[0].notifications).to.deep.equal([{ settings: QUARKUS_SETTINGS }]);
		});

		test('sends the settings changed while the client restarts the server once it runs again', async () => {
			await manager.start();
			let openRestartGate: () => void = () => undefined;
			const restart = manager.clients[0].restart(
				new Promise((resolve) => {
					openRestartGate = resolve;
				}),
			);

			settings = QUARKUS_SETTINGS;
			await manager.updateSettings();
			openRestartGate();
			await restart;

			expect(manager.clients[0].initializations).to.deep.equal([MAIN_SETTINGS, MAIN_SETTINGS]);
			expect(manager.clients[0].notifications).to.deep.equal([{ settings: QUARKUS_SETTINGS }]);
		});

		test('reads no settings while the server is not running', async () => {
			await manager.updateSettings();

			expect(reads).to.equal(0);
			expect(manager.clients).to.be.empty;
		});

		test('starts again with the settings of that time', async () => {
			await manager.start();
			await manager.stop();

			settings = QUARKUS_SETTINGS;
			await manager.start();

			expect(manager.clients).to.have.lengthOf(2);
			expect(manager.clients[1].initializations).to.deep.equal([QUARKUS_SETTINGS]);
			expect(manager.clients[1].notifications).to.be.empty;
		});

		test('logs error when updateSettings fails to read settings', async () => {
			await manager.start();

			readError = new Error('failed to read settings');
			await manager.updateSettings();

			expect(manager.clients[0].notifications).to.be.empty;
		});

		test('logs error when sendNotification fails', async () => {
			await manager.start();

			manager.clients[0].sendNotification = () => Promise.reject(new Error('notification error'));
			settings = QUARKUS_SETTINGS;
			await manager.updateSettings();

			expect(manager.clients[0].notifications).to.be.empty;
		});

		test('does not start language client if start was aborted while reading settings', async () => {
			let abortResolve: () => void = () => undefined;
			const pendingRead = new Promise<CamelLspSettings>((resolve) => {
				abortResolve = () => resolve(MAIN_SETTINGS);
			});
			const abortManager = new TestManager(
				context,
				() => pendingRead,
				new CamelLspServerDownloader(storageDir, { version: '1.2.3', sha256: '0'.repeat(64) }),
			);
			const startPromise = abortManager.start();
			await abortManager.stop();
			abortResolve();
			await startPromise;

			expect(abortManager.clients).to.be.empty;
		});

		test('does not send settings if client changed while reading settings in updateSettings', async () => {
			await manager.start();
			let resolveRead: () => void = () => undefined;
			const pendingRead = new Promise<CamelLspSettings>((resolve) => {
				resolveRead = () => resolve(QUARKUS_SETTINGS);
			});
			let readCalled = false;
			(manager as unknown as { readSettings: () => Promise<CamelLspSettings> }).readSettings = () => {
				readCalled = true;
				return pendingRead;
			};
			const updatePromise = manager.updateSettings();
			await waitFor(() => readCalled);
			await manager.stop();
			resolveRead();
			await updatePromise;

			expect(manager.clients[0].notifications).to.be.empty;
		});

		test('does not send settings on state change if client is no longer the active client', async () => {
			await manager.start();
			const firstClient = manager.clients[0];
			await manager.stop();
			(firstClient as unknown as { setState: (s: State) => void }).setState(State.Running);

			expect(firstClient.notifications).to.be.empty;
		});
	});
});
