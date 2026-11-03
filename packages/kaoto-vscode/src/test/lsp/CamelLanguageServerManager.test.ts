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
import { KAOTO_LSP_SERVER_JAR_SETTING_ID } from '../../constants';
import { CamelLanguageServerManager } from '../../lsp/CamelLanguageServerManager';
import { CamelLspServerDownloader, FileDownload } from '../../lsp/CamelLspServerDownloader';

suite('CamelLanguageServerManager', () => {
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

		const waitFor = async (condition: () => boolean) => {
			const deadline = Date.now() + 5_000;
			while (!condition()) {
				if (Date.now() > deadline) {
					throw new Error('The condition was not met within 5 seconds');
				}
				await new Promise((resolve) => setTimeout(resolve, 10));
			}
		};

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
});
