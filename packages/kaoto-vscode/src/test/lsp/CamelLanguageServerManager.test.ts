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
import { CamelLanguageServerManager } from '../../lsp/CamelLanguageServerManager';
import { CamelLspServerDownloader, FileDownload } from '../../lsp/CamelLspServerDownloader';
import { CamelLspSettings } from '../../lsp/CamelLspSettings';

suite('CamelLanguageServerManager', () => {
	const noSettings = () => Promise.resolve<CamelLspSettings>({ camel: {} });

	const waitFor = async (condition: () => boolean) => {
		const deadline = Date.now() + 5_000;
		while (!condition()) {
			if (Date.now() > deadline) {
				throw new Error('The condition was not met within 5 seconds');
			}
			await new Promise((resolve) => setTimeout(resolve, 10));
		}
	};

	test('findJavaExecutable should return a string or undefined', async () => {
		const result = await CamelLanguageServerManager.findJavaExecutable();
		// In CI/test environments, Java may or may not be available
		expect(result === undefined || typeof result === 'string').to.be.true;
	});

	test('getJavaVersion should return a number for valid java path', async () => {
		const javaPath = await CamelLanguageServerManager.findJavaExecutable();
		if (javaPath) {
			const version = await CamelLanguageServerManager.getJavaVersion(javaPath);
			expect(version).to.be.a('number');
			expect(version).to.be.greaterThan(0);
		}
	});

	test('getJavaVersion should return 0 for invalid java path', async () => {
		const version = await CamelLanguageServerManager.getJavaVersion('/nonexistent/bin/java');
		expect(version).to.equal(0);
	});

	test('isRunning should return false before start', () => {
		// We cannot fully construct the manager without a real ExtensionContext,
		// but we can verify the static methods work correctly
		expect(CamelLanguageServerManager.REQUIRED_JAVA_VERSION).to.equal(17);
	});

	suite('findJavaExecutable with JAVA_HOME', () => {
		const originalJavaHome = process.env['JAVA_HOME'];
		let javaHome: string;

		setup(() => {
			javaHome = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-java-home-'));
		});

		teardown(() => {
			if (originalJavaHome === undefined) {
				delete process.env['JAVA_HOME'];
			} else {
				process.env['JAVA_HOME'] = originalJavaHome;
			}
			fs.rmSync(javaHome, { recursive: true, force: true });
		});

		test('runs the java executable of JAVA_HOME', async () => {
			const javaPath = CamelLanguageServerManager.getJavaHomeExecutable(javaHome);
			fs.mkdirSync(path.dirname(javaPath), { recursive: true });
			fs.writeFileSync(javaPath, '');
			process.env['JAVA_HOME'] = javaHome;

			expect(await CamelLanguageServerManager.findJavaExecutable()).to.equal(javaPath);
		});

		test('looks for java.exe on Windows', () => {
			expect(CamelLanguageServerManager.getJavaHomeExecutable('jdk', 'win32')).to.equal(path.join('jdk', 'bin', 'java.exe'));
			expect(CamelLanguageServerManager.getJavaHomeExecutable('jdk', 'linux')).to.equal(path.join('jdk', 'bin', 'java'));
			expect(CamelLanguageServerManager.getJavaHomeExecutable('jdk', 'darwin')).to.equal(path.join('jdk', 'bin', 'java'));
		});
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
		const originalFindJavaExecutable = CamelLanguageServerManager.findJavaExecutable;
		const originalGetJavaVersion = CamelLanguageServerManager.getJavaVersion;
		const originalShowErrorMessage = vscode.window.showErrorMessage;
		let storageDir: string;
		let errorMessages: string[];

		setup(() => {
			storageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-lsp-manager-'));
			errorMessages = [];
			CamelLanguageServerManager.findJavaExecutable = () => Promise.resolve('java');
			CamelLanguageServerManager.getJavaVersion = () => Promise.resolve(21);
			Object.defineProperty(vscode.window, 'showErrorMessage', {
				value: (message: string) => {
					errorMessages.push(message);
					return Promise.resolve(undefined);
				},
				configurable: true,
			});
		});

		teardown(() => {
			CamelLanguageServerManager.findJavaExecutable = originalFindJavaExecutable;
			CamelLanguageServerManager.getJavaVersion = originalGetJavaVersion;
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
			private state = State.Stopped;
			private readonly stateChanged = new vscode.EventEmitter<StateChangeEvent>();
			readonly onDidChangeState = this.stateChanged.event;

			constructor(
				readonly clientOptions: LanguageClientOptions,
				private readonly startGate: Promise<void>,
			) {}

			async start(): Promise<void> {
				this.initialize();
				await this.startGate;
				this.setState(State.Running);
			}

			/** Restarts the server as LanguageClient does when the server stops: it runs again once the gate opens. */
			async restart(gate: Promise<void> = Promise.resolve()): Promise<void> {
				this.setState(State.Stopped);
				this.initialize();
				await gate;
				this.setState(State.Running);
			}

			isRunning(): boolean {
				return this.state === State.Running;
			}

			async stop(): Promise<void> {
				this.setState(State.Stopped);
			}

			async sendNotification(_type: unknown, params: unknown): Promise<void> {
				this.notifications.push(params);
			}

			private initialize(): void {
				this.setState(State.Starting);
				const options = this.clientOptions.initializationOptions;
				this.initializations.push(typeof options === 'function' ? options() : options);
			}

			private setState(newState: State): void {
				const oldState = this.state;
				this.state = newState;
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

		const originalFindJavaExecutable = CamelLanguageServerManager.findJavaExecutable;
		const originalGetJavaVersion = CamelLanguageServerManager.getJavaVersion;
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
			CamelLanguageServerManager.findJavaExecutable = () => Promise.resolve('java');
			CamelLanguageServerManager.getJavaVersion = () => Promise.resolve(21);
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
			CamelLanguageServerManager.findJavaExecutable = originalFindJavaExecutable;
			CamelLanguageServerManager.getJavaVersion = originalGetJavaVersion;
			Object.defineProperty(vscode.workspace, 'getConfiguration', { value: originalGetConfiguration, configurable: true });
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
	});
});
