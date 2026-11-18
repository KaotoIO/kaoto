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
import * as path from 'path';
import * as vscode from 'vscode';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID, KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID } from '../../constants';
import { readCamelLspSettings, toCamelLspRuntimeProvider, toCamelLspSettings, toLocalKameletDirectories } from '../../lsp/CamelLspSettings';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { resolvePaths } from '../../utils/Path';
import { initializeKaotoCatalogService, preserveKaotoCatalogServiceInstance } from '../utils/TestSetup';

suite('CamelLspSettings', () => {
	const EXTRA_COMPONENTS = [{ component: { kind: 'component', scheme: 'acme', syntax: 'acme:name' }, properties: {} }];
	/** The default of kaoto.localKameletDirectories. */
	const DEFAULT_LOCAL_KAMELET_DIRECTORIES = ['./kamelets'];

	const mainCatalog: CatalogLibraryEntry = {
		name: 'Camel Main 4.23.0',
		version: '4.23.0',
		runtime: 'Main',
		fileName: 'camel-main/4.23.0/index.json',
		camelCatalogVersion: '4.23.0',
		executorVersion: '4.23.0',
	};

	const quarkusCatalog: CatalogLibraryEntry = {
		name: 'Camel Quarkus 3.40.0',
		version: '3.40.0',
		runtime: 'Quarkus',
		fileName: 'camel-quarkus/3.40.0/index.json',
		camelCatalogVersion: '4.22.1',
		executorVersion: '4.22.1',
		runtimeProviderVersion: '3.40.0',
	};

	suite('toCamelLspRuntimeProvider', () => {
		test('maps the runtimes of the Kaoto catalogs', () => {
			expect(toCamelLspRuntimeProvider('Main')).to.equal('DEFAULT');
			expect(toCamelLspRuntimeProvider('Quarkus')).to.equal('QUARKUS');
			expect(toCamelLspRuntimeProvider('Spring Boot')).to.equal('SPRINGBOOT');
		});

		test('ignores the case', () => {
			expect(toCamelLspRuntimeProvider('quarkus')).to.equal('QUARKUS');
			expect(toCamelLspRuntimeProvider('spring boot')).to.equal('SPRINGBOOT');
		});

		test('maps any other runtime to DEFAULT', () => {
			expect(toCamelLspRuntimeProvider('Camel Main')).to.equal('DEFAULT');
			expect(toCamelLspRuntimeProvider('Unknown')).to.equal('DEFAULT');
		});
	});

	suite('toCamelLspSettings', () => {
		test('sends the Camel version of a Main catalog, without a runtime provider version', () => {
			expect(toCamelLspSettings({ ...mainCatalog, runtimeProviderVersion: '4.23.0' })).to.deep.equal({
				camel: {
					'Camel catalog version': '4.23.0',
					'Camel catalog runtime provider': 'DEFAULT',
				},
			});
		});

		test('sends the Camel version of a Quarkus catalog, not its Camel Quarkus version, and the Camel Quarkus version', () => {
			expect(toCamelLspSettings(quarkusCatalog)).to.deep.equal({
				camel: {
					'Camel catalog version': '4.22.1',
					'Camel catalog runtime provider': 'QUARKUS',
					'Camel catalog runtime provider version': '3.40.0',
				},
			});
		});

		test('sends the Camel version and the Camel Spring Boot version of a Red Hat Spring Boot catalog, which differ', () => {
			// as in @kaoto/camel-catalog 0.10.8
			const catalog: CatalogLibraryEntry = {
				name: 'Camel Spring Boot 4.18.3.redhat-00006',
				version: '4.18.3.redhat-00006',
				runtime: 'Spring Boot',
				fileName: 'camel-springboot/4.18.3.redhat-00006/index.json',
				camelCatalogVersion: '4.18.3.redhat-00005',
				executorVersion: '4.18.3.redhat-00005',
				runtimeProviderVersion: '4.18.3.redhat-00006',
			};

			expect(toCamelLspSettings(catalog)).to.deep.equal({
				camel: {
					'Camel catalog version': '4.18.3.redhat-00005',
					'Camel catalog runtime provider': 'SPRINGBOOT',
					'Camel catalog runtime provider version': '4.18.3.redhat-00006',
				},
			});
		});

		test('sends the version of a catalog without a Camel version', () => {
			expect(toCamelLspSettings({ ...mainCatalog, camelCatalogVersion: '' }).camel['Camel catalog version']).to.equal('4.23.0');
		});

		// the indexes of @kaoto/camel-catalog before 0.4.8, which kaoto.catalog.url can point to, have neither version
		test('sends no Camel version for a Quarkus catalog without one, and its version as the Camel Quarkus version', () => {
			const catalog: CatalogLibraryEntry = {
				name: 'Camel Quarkus 3.20.4',
				version: '3.20.4',
				runtime: 'Quarkus',
				fileName: 'camel-quarkus/3.20.4/index.json',
			};

			expect(toCamelLspSettings(catalog)).to.deep.equal({
				camel: {
					'Camel catalog runtime provider': 'QUARKUS',
					'Camel catalog runtime provider version': '3.20.4',
				},
			});
		});

		test('sends the version of a Spring Boot catalog without camelCatalogVersion and runtimeProviderVersion as both', () => {
			const catalog: CatalogLibraryEntry = {
				name: 'Camel Spring Boot 4.14.7',
				version: '4.14.7',
				runtime: 'Spring Boot',
				fileName: 'camel-springboot/4.14.7/index.json',
			};

			expect(toCamelLspSettings(catalog)).to.deep.equal({
				camel: {
					'Camel catalog version': '4.14.7',
					'Camel catalog runtime provider': 'SPRINGBOOT',
					'Camel catalog runtime provider version': '4.14.7',
				},
			});
		});

		test('sends no catalog for a Citrus catalog, so that the server keeps its bundled one', () => {
			const catalog: CatalogLibraryEntry = {
				name: 'Citrus 5.1.0',
				version: '5.1.0',
				runtime: 'Citrus',
				fileName: 'citrus/5.1.0/index.json',
				camelCatalogVersion: '5.1.0',
			};

			expect(toCamelLspSettings(catalog)).to.deep.equal({ camel: {} });
		});

		test('sends no catalog without a selected catalog', () => {
			expect(toCamelLspSettings(undefined)).to.deep.equal({ camel: {} });
		});

		test('sends the extra components', () => {
			expect(toCamelLspSettings(mainCatalog, EXTRA_COMPONENTS).camel['extra-components']).to.deep.equal(EXTRA_COMPONENTS);
			expect(toCamelLspSettings(undefined, EXTRA_COMPONENTS)).to.deep.equal({ camel: { 'extra-components': EXTRA_COMPONENTS } });
		});

		test('sends no extra components when there are none', () => {
			expect(toCamelLspSettings(mainCatalog, null).camel).to.not.have.property('extra-components');
			expect(toCamelLspSettings(mainCatalog, undefined).camel).to.not.have.property('extra-components');
			expect(toCamelLspSettings(mainCatalog, []).camel).to.not.have.property('extra-components');
		});

		// the server fails its whole catalog on one of these
		test('sends only the extra components that describe a component with a scheme', () => {
			const malformed = ['acme', null, { scheme: 'acme', syntax: 'acme:name' }, { component: { kind: 'component', syntax: 'acme:name' } }];

			expect(toCamelLspSettings(mainCatalog, [...malformed, ...EXTRA_COMPONENTS]).camel['extra-components']).to.deep.equal(EXTRA_COMPONENTS);
			expect(toCamelLspSettings(mainCatalog, malformed).camel).to.not.have.property('extra-components');
		});

		test('sends the local Kamelet directories', () => {
			expect(toCamelLspSettings(mainCatalog, null, ['./kamelets']).camel['local-kamelet-directories']).to.deep.equal(['./kamelets']);
			expect(toCamelLspSettings(undefined, null, ['./kamelets'])).to.deep.equal({ camel: { 'local-kamelet-directories': ['./kamelets'] } });
		});

		test('sends no local Kamelet directories when there are none', () => {
			expect(toCamelLspSettings(mainCatalog, null, undefined).camel).to.not.have.property('local-kamelet-directories');
			expect(toCamelLspSettings(mainCatalog, null, []).camel).to.not.have.property('local-kamelet-directories');
		});
	});

	suite('toLocalKameletDirectories', () => {
		const HOME = os.homedir();
		const folders = [
			{ uri: vscode.Uri.file('/workspace/service'), name: 'service' },
			{ uri: vscode.Uri.file('/workspace/routes'), name: 'routes' },
		];

		test('keeps the relative directories, which the server resolves against the folder of the edited file', () => {
			expect(toLocalKameletDirectories(['./kamelets', 'kamelets', '../shared/kamelets'], folders)).to.deep.equal([
				'./kamelets',
				'kamelets',
				'../shared/kamelets',
			]);
		});

		test('keeps the absolute directories', () => {
			const absolute = path.join(HOME, 'kamelets');

			expect(toLocalKameletDirectories([absolute], folders)).to.deep.equal([absolute]);
		});

		test('expands the home directory', () => {
			expect(toLocalKameletDirectories(['~', '~/kamelets', '${homeDir}/shared'], folders)).to.deep.equal([
				path.normalize(HOME),
				path.join(HOME, 'kamelets'),
				path.join(HOME, 'shared'),
			]);
		});

		test('turns ${cwd}, the folder of the edited file, into a relative directory', () => {
			expect(toLocalKameletDirectories(['${cwd}', '${cwd}/kamelets'], folders)).to.deep.equal(['.', './kamelets']);
		});

		test('gives one directory per workspace folder for ${workspaceFolder} and ${workspaceFolderBasename}', () => {
			expect(toLocalKameletDirectories(['${workspaceFolder}/kamelets', '../${workspaceFolderBasename}-kamelets'], folders)).to.deep.equal([
				path.join(folders[0].uri.fsPath, 'kamelets'),
				path.join(folders[1].uri.fsPath, 'kamelets'),
				'../service-kamelets',
				'../routes-kamelets',
			]);
		});

		test('keeps the workspace folder variables in a window without a folder, as the canvas does', () => {
			expect(toLocalKameletDirectories(['${workspaceFolder}/kamelets', './kamelets'], [])).to.deep.equal(['${workspaceFolder}/kamelets', './kamelets']);
			expect(toLocalKameletDirectories(['${workspaceFolder}/kamelets'], undefined)).to.deep.equal(['${workspaceFolder}/kamelets']);
		});

		test('turns an empty entry, which the canvas reads as the folder of the edited file, into a relative directory', () => {
			expect(toLocalKameletDirectories([''], folders)).to.deep.equal(['.']);
		});

		test('ignores the duplicates and the entries that are not directories', () => {
			expect(toLocalKameletDirectories(['./kamelets', '  ', 42, null, './kamelets'], folders)).to.deep.equal(['./kamelets']);
			expect(toLocalKameletDirectories(undefined, folders)).to.deep.equal([]);
			expect(toLocalKameletDirectories('./kamelets', folders)).to.deep.equal([]);
		});

		suite('compared with the canvas', () => {
			const originalWorkspaceFolders = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders')!;
			/** The forms of kaoto.localKameletDirectories that the canvas resolves with resolvePaths. */
			const DIRECTORIES = [
				'',
				'./kamelets',
				'kamelets',
				'../shared/kamelets',
				'~',
				'~/kamelets',
				'${homeDir}/kamelets',
				'${cwd}',
				'${cwd}/kamelets',
				'${workspaceFolder}/kamelets',
				'../${workspaceFolderBasename}-kamelets',
				path.join(path.sep, 'opt', 'kamelets'),
			];

			/**
			 * @returns the directories that the server reads for a file of the given folder: it resolves a relative directory
			 * against the folder of the file, and keeps the first of the same directories
			 */
			const readByServer = (directories: string[], fileFolder: string) => [
				...new Set(directories.map((directory) => path.normalize(path.isAbsolute(directory) ? directory : path.resolve(fileFolder, directory)))),
			];

			const useWorkspaceFolders = (workspaceFolders: typeof folders | undefined) =>
				Object.defineProperty(vscode.workspace, 'workspaceFolders', { get: () => workspaceFolders, configurable: true });

			teardown(() => {
				Object.defineProperty(vscode.workspace, 'workspaceFolders', originalWorkspaceFolders);
			});

			test('gives the server the directories of the canvas in a window with one folder', () => {
				useWorkspaceFolders([folders[0]]);
				const fileFolder = path.join(folders[0].uri.fsPath, 'src', 'main', 'resources', 'camel');

				expect(readByServer(toLocalKameletDirectories(DIRECTORIES, vscode.workspace.workspaceFolders), fileFolder)).to.deep.equal([
					...resolvePaths(DIRECTORIES, fileFolder),
				]);
			});

			test('gives the server the directories of the canvas in a window without a folder', () => {
				useWorkspaceFolders(undefined);
				const fileFolder = path.join(path.sep, 'tmp', 'camel');

				expect(readByServer(toLocalKameletDirectories(DIRECTORIES, vscode.workspace.workspaceFolders), fileFolder)).to.deep.equal([
					...resolvePaths(DIRECTORIES, fileFolder),
				]);
			});

			test('gives the server the directories of the canvas, and the ones of the other folders, in a window with several folders', () => {
				useWorkspaceFolders(folders);
				const fileFolder = path.join(folders[1].uri.fsPath, 'camel');

				const server = readByServer(toLocalKameletDirectories(DIRECTORIES, vscode.workspace.workspaceFolders), fileFolder);
				const canvas = [...resolvePaths(DIRECTORIES, fileFolder)];

				expect(server).to.include.members(canvas);
				expect(server.filter((directory) => !canvas.includes(directory))).to.deep.equal([
					path.join(folders[0].uri.fsPath, 'kamelets'),
					path.resolve(fileFolder, '..', 'service-kamelets'),
				]);
				// the server keeps the first Kamelet of a name: one of the first folder wins over the one that the canvas reads
				expect(server.indexOf(path.join(folders[0].uri.fsPath, 'kamelets'))).to.be.below(server.indexOf(path.join(folders[1].uri.fsPath, 'kamelets')));
			});
		});
	});

	suite('readCamelLspSettings', () => {
		const originalGetConfiguration = vscode.workspace.getConfiguration;
		const originalShowWarningMessage = vscode.window.showWarningMessage;
		const originalIsMavenProject = KaotoCatalogService.isMavenProject;
		const originalWorkspaceFolders = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders')!;
		let mavenFolders: string[];

		const useWorkspaceFolders = (...names: string[]) => {
			const folders = names.map((name, index) => ({ uri: vscode.Uri.file(`/workspace/${name}`), name, index }));
			Object.defineProperty(vscode.workspace, 'workspaceFolders', { get: () => folders, configurable: true });
		};

		setup(() => {
			mavenFolders = [];
			KaotoCatalogService.isMavenProject = (uri: vscode.Uri) => Promise.resolve(mavenFolders.includes(uri.path));
		});

		teardown(() => {
			Object.defineProperty(vscode.workspace, 'getConfiguration', { value: originalGetConfiguration, configurable: true });
			Object.defineProperty(vscode.window, 'showWarningMessage', { value: originalShowWarningMessage, configurable: true });
			Object.defineProperty(vscode.workspace, 'workspaceFolders', originalWorkspaceFolders);
			KaotoCatalogService.isMavenProject = originalIsMavenProject;
		});

		test('reads the default catalog for an invalid catalog name without a warning, which the editor shows', async () => {
			Object.defineProperty(vscode.workspace, 'getConfiguration', {
				value: (section?: string, scope?: vscode.ConfigurationScope | null) => {
					const config = originalGetConfiguration(section, scope);
					return {
						...config,
						get: (key: string, defaultValue?: unknown) =>
							section === 'kaoto' && key === 'runtimeCatalogName' ? 'Camel Main 0.0.0' : config.get(key, defaultValue),
					};
				},
				configurable: true,
			});
			const restoreCatalogServiceInstance = preserveKaotoCatalogServiceInstance();

			const settings = await initializeKaotoCatalogService().then(readCamelLspSettings).finally(restoreCatalogServiceInstance);

			expect(settings.camel['Camel catalog runtime provider']).to.equal('DEFAULT');
		});

		test('reads the default catalog in a Maven project, as the canvas does', async () => {
			useWorkspaceFolders('service');
			mavenFolders = ['/workspace/service'];
			const catalogService = {
				resolveSelectedIntegrationCatalog: () => quarkusCatalog,
				getDefaultIntegrationCatalog: () => mainCatalog,
			} as unknown as KaotoCatalogService;

			expect(await readCamelLspSettings(catalogService)).to.deep.equal({
				camel: {
					'Camel catalog version': '4.23.0',
					'Camel catalog runtime provider': 'DEFAULT',
					'local-kamelet-directories': DEFAULT_LOCAL_KAMELET_DIRECTORIES,
				},
			});
		});

		test('reads the selected catalog in a window without a folder', async () => {
			useWorkspaceFolders();
			const catalogService = {
				resolveSelectedIntegrationCatalog: () => quarkusCatalog,
				getDefaultIntegrationCatalog: () => mainCatalog,
			} as unknown as KaotoCatalogService;

			expect((await readCamelLspSettings(catalogService)).camel['Camel catalog runtime provider']).to.equal('QUARKUS');
		});

		test('reads the selected catalog when workspaceFolders is undefined', async () => {
			Object.defineProperty(vscode.workspace, 'workspaceFolders', { get: () => undefined, configurable: true });
			const catalogService = {
				resolveSelectedIntegrationCatalog: () => quarkusCatalog,
				getDefaultIntegrationCatalog: () => mainCatalog,
			} as unknown as KaotoCatalogService;

			expect((await readCamelLspSettings(catalogService)).camel['Camel catalog runtime provider']).to.equal('QUARKUS');
		});

		test('reads the selected catalog when not every folder of the window is a Maven project', async () => {
			useWorkspaceFolders('service', 'routes');
			mavenFolders = ['/workspace/service'];
			const catalogService = {
				resolveSelectedIntegrationCatalog: () => quarkusCatalog,
				getDefaultIntegrationCatalog: () => mainCatalog,
			} as unknown as KaotoCatalogService;

			expect(await readCamelLspSettings(catalogService)).to.deep.equal({
				camel: {
					'Camel catalog version': '4.22.1',
					'Camel catalog runtime provider': 'QUARKUS',
					'Camel catalog runtime provider version': '3.40.0',
					'local-kamelet-directories': DEFAULT_LOCAL_KAMELET_DIRECTORIES,
				},
			});
		});

		test('reads the selected integration catalog and kaoto.lsp.extraComponents', async () => {
			Object.defineProperty(vscode.workspace, 'getConfiguration', {
				value: (section?: string, scope?: vscode.ConfigurationScope | null) => {
					const config = originalGetConfiguration(section, scope);
					return {
						...config,
						get: (key: string, defaultValue?: unknown) =>
							key === KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID ? EXTRA_COMPONENTS : config.get(key, defaultValue),
					};
				},
				configurable: true,
			});
			const catalogService = { resolveSelectedIntegrationCatalog: () => quarkusCatalog } as unknown as KaotoCatalogService;

			expect(await readCamelLspSettings(catalogService)).to.deep.equal(
				toCamelLspSettings(quarkusCatalog, EXTRA_COMPONENTS, DEFAULT_LOCAL_KAMELET_DIRECTORIES),
			);
		});

		test('reads kaoto.localKameletDirectories, with one directory per workspace folder for ${workspaceFolder}', async () => {
			useWorkspaceFolders('service', 'routes');
			Object.defineProperty(vscode.workspace, 'getConfiguration', {
				value: (section?: string, scope?: vscode.ConfigurationScope | null) => {
					const config = originalGetConfiguration(section, scope);
					return {
						...config,
						get: (key: string, defaultValue?: unknown) =>
							key === KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID ? ['${workspaceFolder}/kamelets', './kamelets'] : config.get(key, defaultValue),
					};
				},
				configurable: true,
			});
			const catalogService = { resolveSelectedIntegrationCatalog: () => quarkusCatalog } as unknown as KaotoCatalogService;

			expect((await readCamelLspSettings(catalogService)).camel['local-kamelet-directories']).to.deep.equal([
				path.join(vscode.Uri.file('/workspace/service').fsPath, 'kamelets'),
				path.join(vscode.Uri.file('/workspace/routes').fsPath, 'kamelets'),
				'./kamelets',
			]);
		});
	});
});
