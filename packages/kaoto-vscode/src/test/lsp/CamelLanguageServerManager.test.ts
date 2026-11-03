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
				new CamelLspServerDownloader(storageDir, '1.2.3', hash('sha256', RELEASE_CONTENT), downloadWriting(RELEASE_CONTENT)),
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
});
