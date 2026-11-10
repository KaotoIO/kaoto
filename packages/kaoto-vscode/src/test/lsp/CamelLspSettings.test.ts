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
import * as vscode from 'vscode';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID } from '../../constants';
import { readCamelLspSettings, toCamelLspRuntimeProvider, toCamelLspSettings } from '../../lsp/CamelLspSettings';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { initializeKaotoCatalogService, preserveKaotoCatalogServiceInstance } from '../utils/TestSetup';

suite('CamelLspSettings', () => {
	const EXTRA_COMPONENTS = [{ component: { kind: 'component', scheme: 'acme', syntax: 'acme:name' }, properties: {} }];

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
			expect(toCamelLspSettings(mainCatalog, []).camel).to.not.have.property('extra-components');
		});

		// the server fails its whole catalog on one of these
		test('sends only the extra components that describe a component with a scheme', () => {
			const malformed = ['acme', null, { scheme: 'acme', syntax: 'acme:name' }, { component: { kind: 'component', syntax: 'acme:name' } }];

			expect(toCamelLspSettings(mainCatalog, [...malformed, ...EXTRA_COMPONENTS]).camel['extra-components']).to.deep.equal(EXTRA_COMPONENTS);
			expect(toCamelLspSettings(mainCatalog, malformed).camel).to.not.have.property('extra-components');
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
			const warnings: string[] = [];
			Object.defineProperty(vscode.window, 'showWarningMessage', {
				value: (message: string) => {
					warnings.push(message);
					return Promise.resolve(undefined);
				},
				configurable: true,
			});
			const restoreCatalogServiceInstance = preserveKaotoCatalogServiceInstance();

			const settings = await initializeKaotoCatalogService().then(readCamelLspSettings).finally(restoreCatalogServiceInstance);

			expect(warnings).to.be.empty;
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
				camel: { 'Camel catalog version': '4.23.0', 'Camel catalog runtime provider': 'DEFAULT' },
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

			expect(await readCamelLspSettings(catalogService)).to.deep.equal(toCamelLspSettings(quarkusCatalog, EXTRA_COMPONENTS));
		});
	});
});
