/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { deepStrictEqual, equal, rejects } from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { CatalogKind, FileTypes, StepUpdateAction } from '@kaoto/kaoto/models';
import { KaotoHostServices } from '../../services/KaotoHostServices';
import { KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID } from '../../constants';

suite('Kaoto host services', () => {
	let root: vscode.Uri;
	let documentUri: vscode.Uri;
	let services: KaotoHostServices;
	let folders: vscode.Disposable;
	let provider: vscode.Disposable;
	const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
	const originalQuickPick = vscode.window.showQuickPick;
	const originalFindFiles = vscode.workspace.findFiles;
	const originalGetConfiguration = vscode.workspace.getConfiguration;
	let blockedRead: string | undefined;
	let blockedStat: string | undefined;

	setup(async () => {
		root = vscode.Uri.file(await mkdtemp(path.join(os.tmpdir(), 'kaoto-host-')));
		documentUri = vscode.Uri.joinPath(root, 'project/src/main/resources/camel/route.camel.yaml');
		await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(documentUri, '..'));
		await write(documentUri, '- route: {}');
		services = new KaotoHostServices(() => documentUri);
		// Associate the owned temporary directory without replacing the runner's workspace.
		vscode.workspace.getWorkspaceFolder = (uri) =>
			uri.toString().startsWith(root.toString() + '/') ? { uri: root, name: 'Host services', index: 1 } : originalGetWorkspaceFolder(uri);
		folders = {
			dispose: () => {
				vscode.workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
			},
		};
		blockedRead = undefined;
		blockedStat = undefined;
	});

	teardown(async () => {
		services.dispose();
		folders.dispose();
		provider?.dispose();
		vscode.window.showQuickPick = originalQuickPick;
		vscode.workspace.findFiles = originalFindFiles;
		vscode.workspace.getConfiguration = originalGetConfiguration;
		await vscode.workspace.fs.delete(root, { recursive: true });
	});

	test('uses nearest metadata and never falls back for a missing key', async () => {
		await write(vscode.Uri.joinPath(root, '.kaoto'), '{"parent":true}');
		await write(vscode.Uri.joinPath(root, 'project/.kaoto'), '{"schema":{"filePath":["x\\\\y.xsd"],"label":"keep\\\\label"}}');
		deepStrictEqual(await services.getMetadata('schema'), { filePath: ['x/y.xsd'], label: 'keep\\label' });
		equal(await services.getMetadata('parent'), undefined);
	});

	test('distinguishes missing metadata from malformed metadata without overwriting it', async () => {
		equal(await services.getMetadata('missing'), undefined);
		const metadata = vscode.Uri.joinPath(root, 'project/.kaoto');
		await write(metadata, '{ malformed');
		await rejects(services.getMetadata('missing'), SyntaxError);
		await rejects(services.setMetadata('key', 'value'), SyntaxError);
		equal(await read(metadata), '{ malformed');
	});

	test('creates metadata at the workspace root and deletes a key via null', async () => {
		await services.setMetadata('keep', true);
		await services.setMetadata('remove', 'value');
		await services.setMetadata('remove', null);
		deepStrictEqual(JSON.parse(await read(vscode.Uri.joinPath(root, '.kaoto'))), { keep: true });
	});

	test('creates metadata alongside a document outside a workspace', async () => {
		vscode.workspace.getWorkspaceFolder = () => undefined;
		await services.setMetadata('key', 'value');
		deepStrictEqual(JSON.parse(await read(vscode.Uri.joinPath(documentUri, '../.kaoto'))), { key: 'value' });
	});

	test('prefers classpath resources and falls back to the metadata directory', async () => {
		await write(vscode.Uri.joinPath(root, 'project/.kaoto'), '{}');
		await write(vscode.Uri.joinPath(root, 'project/schema.xsd'), 'metadata');
		equal(await services.getResourceContent('schema.xsd'), 'metadata');
		await services.saveResourceContent('schema.xsd', 'classpath ä');
		equal(await services.getResourceContent('schema.xsd'), 'classpath ä');
		equal(await read(vscode.Uri.joinPath(root, 'project/src/main/resources/schema.xsd')), 'classpath ä');
		equal(await services.getResourceContent('missing.xsd'), undefined);
	});

	test('propagates resource write failures and preserves the existing directory', async () => {
		const target = vscode.Uri.joinPath(root, 'project/src/main/resources/blocked');
		await vscode.workspace.fs.createDirectory(target);
		await rejects(services.saveResourceContent('blocked', 'content'), { code: 'FileIsADirectory' });
		equal((await vscode.workspace.fs.stat(target)).type, vscode.FileType.Directory);
	});

	test('deletes existing resources and reports missing ones as absent', async () => {
		await services.saveResourceContent('delete.xsd', 'content');
		equal(await services.isResourceExist('delete.xsd'), true);
		equal(await services.deleteResource('delete.xsd'), true);
		equal(await services.isResourceExist('delete.xsd'), false);
		equal(await services.deleteResource('delete.xsd'), false);
	});

	test('uses the current document identity after Save As', async () => {
		await services.saveResourceContent('schema.xsd', 'old');
		documentUri = vscode.Uri.joinPath(root, 'copy/route.camel.yaml');
		await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(documentUri, '..'));
		await services.saveResourceContent('schema.xsd', 'new');
		equal(await read(vscode.Uri.joinPath(root, 'copy/schema.xsd')), 'new');
		equal(await read(vscode.Uri.joinPath(root, 'project/src/main/resources/schema.xsd')), 'old');
	});

	test('uses an injected desktop classpath resolver', async () => {
		services.dispose();
		services = new KaotoHostServices(() => documentUri, { findClasspathRoot: () => root });
		await services.saveResourceContent('injected.txt', 'desktop');
		equal(await read(vscode.Uri.joinPath(root, 'injected.txt')), 'desktop');
	});

	test('returns normalized settings without desktop catalog discovery', async () => {
		const settings = await services.getVSCodeKaotoSettings();
		equal(settings.runtimeCatalogName, '');
		equal(settings.testingCatalogName, '');
		equal(typeof settings.catalogUrl, 'string');
		deepStrictEqual(JSON.parse(JSON.stringify(settings)), { ...settings });
	});

	test('preserves selected catalog type and propagates discovery failures for native callers', async () => {
		services.dispose();
		services = new KaotoHostServices(() => documentUri, { getSelectedCatalog: async () => ({ name: 'Citrus test catalog', runtime: 'Citrus' }) });
		const settings = await services.getVSCodeKaotoSettings();
		equal(settings.testingCatalogName, 'Citrus test catalog');
		equal(settings.runtimeCatalogName, '');
		services.dispose();
		services = new KaotoHostServices(() => documentUri, {
			getSelectedCatalog: async () => {
				throw new Error('catalog unavailable');
			},
		});
		await rejects(services.getVSCodeKaotoSettings(), /catalog unavailable/);
	});

	test('rejects absent Maven and environment operations immediately in worker mode', async function () {
		this.timeout(1000);
		await rejects(services.getRuntimeInfoFromMavenContext(), { code: 'UNSUPPORTED_REQUEST' });
		await rejects(services.getSuggestions('env', '', { propertyName: 'uri', inputValue: '' }), { code: 'UNSUPPORTED_REQUEST' });
		await services.onStepUpdated(StepUpdateAction.Add, CatalogKind.Component, 'log');
	});

	test('keeps injected Maven discovery results and failures tied to the current document', async () => {
		services.dispose();
		services = new KaotoHostServices(() => documentUri, {
			getRuntimeInfoFromMavenContext: async (uri) => {
				if (uri.path.endsWith('/failed.camel.yaml')) {
					throw new Error('Maven discovery failed');
				}
				return { runtime: uri.path.endsWith('/copy.camel.yaml') ? 'quarkus' : 'main', camelVersion: '4.14.7' };
			},
		});
		deepStrictEqual(await services.getRuntimeInfoFromMavenContext(), { runtime: 'main', camelVersion: '4.14.7' });
		documentUri = vscode.Uri.joinPath(root, 'copy.camel.yaml');
		deepStrictEqual(await services.getRuntimeInfoFromMavenContext(), { runtime: 'quarkus', camelVersion: '4.14.7' });
		documentUri = vscode.Uri.joinPath(root, 'failed.camel.yaml');
		await rejects(services.getRuntimeInfoFromMavenContext(), /Maven discovery failed/);
	});

	test('delegates environment suggestions with the current document URI', async () => {
		services.dispose();
		services = new KaotoHostServices(() => documentUri, {
			getEnvironmentSuggestions: async (word, _context, uri) => [{ value: word, description: uri.toString() }],
		});
		deepStrictEqual(await services.getSuggestions('env', 'TEST', { propertyName: 'uri', inputValue: '' }), [
			{ value: 'TEST', description: documentUri.toString() },
		]);
	});

	test('disposes step tracking on rebind and closes the current document once', async () => {
		services.dispose();
		const tracked = new Set<string>();
		const released: string[] = [];
		services = new KaotoHostServices(() => documentUri, {
			onStepUpdated: (uri) => {
				tracked.add(uri.toString());
			},
			disposeFor: (uri) => {
				tracked.delete(uri.toString());
				released.push(uri.toString());
			},
		});
		const oldUri = documentUri.toString();
		await services.onStepUpdated(StepUpdateAction.Add, CatalogKind.Component, 'log');
		documentUri = vscode.Uri.joinPath(root, 'new.camel.yaml');
		await services.onStepUpdated(StepUpdateAction.Replace, CatalogKind.Component, 'timer');
		deepStrictEqual([...tracked], [documentUri.toString()]);
		services.dispose();
		services.dispose();
		deepStrictEqual([...tracked], []);
		deepStrictEqual(released, [oldUri, documentUri.toString()]);
	});

	test('preserves scheme and authority for metadata and resources in a virtual workspace', async () => {
		useVirtualWorkspace();
		await services.setMetadata('remote', true);
		await services.saveResourceContent('remote.xsd', 'virtual');
		equal(await services.getMetadata('remote'), true);
		equal(await services.getResourceContent('remote.xsd'), 'virtual');
		equal(await services.isResourceExist('remote.xsd'), true);
		equal(await services.deleteResource('remote.xsd'), true);
		deepStrictEqual(JSON.parse(await read(vscode.Uri.joinPath(root, '.kaoto'))), { remote: true });
	});

	test('propagates metadata stat and read failures without searching past them', async () => {
		useVirtualWorkspace();
		await write(vscode.Uri.joinPath(root, '.kaoto'), '{"selected":"parent"}');
		await write(vscode.Uri.joinPath(root, 'project/.kaoto'), '{"selected":"nearest"}');
		blockedStat = '/workspace/project/.kaoto';
		await rejects(services.getMetadata('selected'), { code: 'NoPermissions' });
		blockedStat = undefined;
		blockedRead = '/workspace/project/.kaoto';
		await rejects(services.getMetadata('selected'), { code: 'NoPermissions' });
	});

	test('does not mask a denied classpath read with the metadata fallback', async () => {
		useVirtualWorkspace();
		await write(vscode.Uri.joinPath(root, 'project/.kaoto'), '{}');
		await write(vscode.Uri.joinPath(root, 'project/schema.xsd'), 'fallback');
		blockedRead = '/workspace/project/src/main/resources/schema.xsd';
		await rejects(services.getResourceContent('schema.xsd'), { code: 'NoPermissions' });
		blockedStat = blockedRead;
		await rejects(services.isResourceExist('schema.xsd'), { code: 'NoPermissions' });
	});

	test('finds properties in the nearest virtual directory and decodes UTF-8', async () => {
		useVirtualWorkspace();
		await write(vscode.Uri.joinPath(root, 'application.properties'), 'parent=ignored');
		await write(vscode.Uri.joinPath(root, 'project/src/main/resources/application.properties'), 'camel.name=Grüße');
		deepStrictEqual(await services.getSuggestions('properties', 'camel', { propertyName: 'uri', inputValue: '' }), [
			{ value: 'camel.name', description: 'Grüße', group: 'application.properties' },
		]);
	});

	test('resolves configured virtual kamelet folders and preserves filenames', async () => {
		useVirtualWorkspace();
		setKameletDirectories(['${workspaceFolder}/project/src/main/resources', '${cwd}/..']);
		await write(vscode.Uri.joinPath(root, 'project/src/main/resources/sample.kamelet.yaml'), 'kind: Kamelet');
		await write(vscode.Uri.joinPath(root, 'project/src/main/resources/other.yaml'), 'ignored');
		deepStrictEqual(await services.getResourcesContentByType(FileTypes.Kamelets), [{ filename: 'sample.kamelet.yaml', content: 'kind: Kamelet' }]);
	});

	test('rejects configured host-local directories in a virtual workspace', async () => {
		useVirtualWorkspace();
		for (const directory of ['/tmp/kamelets', 'C:\\kamelets', '\\\\server\\kamelets', 'file:///tmp/kamelets']) {
			setKameletDirectories([directory]);
			await rejects(services.getResourcesContentByType(FileTypes.Kamelets), { code: 'UNSUPPORTED_REQUEST' });
		}
	});

	test('keeps picker paths relative to metadata and treats cancellation as absence', async () => {
		useVirtualWorkspace();
		await write(vscode.Uri.joinPath(root, 'project/.kaoto'), '{}');
		vscode.workspace.findFiles = async () => [vscode.Uri.parse('kaoto-host-test://remote/workspace/project/schema.xsd')];
		vscode.window.showQuickPick = (async (items: readonly string[] | Thenable<readonly string[]>) => {
			deepStrictEqual(await items, ['schema.xsd']);
			return undefined;
		}) as typeof vscode.window.showQuickPick;
		equal(await services.askUserForFileSelection('**/*.xsd'), undefined);
	});

	function setKameletDirectories(directories: string[]) {
		vscode.workspace.getConfiguration = (...args) => {
			const config = originalGetConfiguration(...args);
			return {
				...config,
				get: (key: string, fallback?: unknown) => (key === KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID ? directories : config.get(key, fallback)),
			} as vscode.WorkspaceConfiguration;
		};
	}

	function useVirtualWorkspace() {
		const remoteRoot = vscode.Uri.parse('kaoto-host-test://remote/workspace');
		const map = (uri: vscode.Uri) => {
			equal(uri.scheme, 'kaoto-host-test');
			equal(uri.authority, 'remote');
			return vscode.Uri.joinPath(root, path.posix.relative('/workspace', uri.path));
		};
		const changes = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
		provider = vscode.workspace.registerFileSystemProvider(
			'kaoto-host-test',
			{
				onDidChangeFile: changes.event,
				watch: () => ({ dispose() {} }),
				stat: (uri) => {
					if (uri.path === blockedStat) {
						throw vscode.FileSystemError.NoPermissions(uri);
					}
					return vscode.workspace.fs.stat(map(uri));
				},
				readFile: (uri) => {
					if (uri.path === blockedRead) {
						throw vscode.FileSystemError.NoPermissions(uri);
					}
					return vscode.workspace.fs.readFile(map(uri));
				},
				readDirectory: (uri) => vscode.workspace.fs.readDirectory(map(uri)),
				writeFile: (uri, content) => vscode.workspace.fs.writeFile(map(uri), content),
				createDirectory: (uri) => vscode.workspace.fs.createDirectory(map(uri)),
				delete: (uri, options) => vscode.workspace.fs.delete(map(uri), options),
				rename: (oldUri, newUri, options) => vscode.workspace.fs.rename(map(oldUri), map(newUri), options),
			},
			{ isCaseSensitive: true },
		);
		const registration = provider;
		provider = {
			dispose: () => {
				registration.dispose();
				changes.dispose();
			},
		};
		vscode.workspace.getWorkspaceFolder = (uri) =>
			uri.scheme === remoteRoot.scheme ? { uri: remoteRoot, name: 'Remote', index: 1 } : originalGetWorkspaceFolder(uri);
		documentUri = vscode.Uri.joinPath(remoteRoot, 'project/src/main/resources/camel/route.camel.yaml');
	}
});

async function write(uri: vscode.Uri, content: string): Promise<void> {
	await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
}

async function read(uri: vscode.Uri): Promise<string> {
	return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
}
