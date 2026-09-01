import { expect } from 'chai';
import * as vscode from 'vscode';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { initializeKaotoCatalogService, getExtensionContext } from '../utils/TestSetup';
import { RuntimeType } from '../../executors/types/ExecutorTypes';
import { KAOTO_CATALOG_URL_SETTING_ID } from '../../constants';

suite('KaotoCatalogService Test Suite', () => {
	let catalogService: KaotoCatalogService;
	let context: vscode.ExtensionContext;
	let originalGetConfiguration: typeof vscode.workspace.getConfiguration;
	let originalShowWarningMessage: typeof vscode.window.showWarningMessage;
	let originalFetch: typeof globalThis.fetch;

	suiteSetup(async () => {
		// Get extension context for tests that need to create custom instances
		context = await getExtensionContext();
		// Initialize KaotoCatalogService using the test helper
		catalogService = await initializeKaotoCatalogService();
	});

	setup(async () => {
		originalGetConfiguration = vscode.workspace.getConfiguration;
		originalShowWarningMessage = vscode.window.showWarningMessage;
		originalFetch = globalThis.fetch;
		// Re-initialize for each test to ensure clean state
		catalogService = await initializeKaotoCatalogService();
	});

	teardown(() => {
		Object.defineProperty(vscode.workspace, 'getConfiguration', {
			value: originalGetConfiguration,
			configurable: true,
		});
		Object.defineProperty(vscode.window, 'showWarningMessage', {
			value: originalShowWarningMessage,
			configurable: true,
		});
		Object.defineProperty(globalThis, 'fetch', {
			value: originalFetch,
			configurable: true,
		});
	});

	test('should load catalogs from index.json', () => {
		const catalogs = catalogService.getCatalogs();
		expect(catalogs).to.be.an('array');
		expect(catalogs.length).to.be.greaterThan(0);
	});

	test('should load catalogs from custom URL when kaoto.catalog.url is configured', async () => {
		const remoteCatalogs: CatalogLibraryEntry[] = [
			{
				name: 'Camel Main 9.9.9',
				version: '9.9.9',
				runtime: 'Main',
				fileName: 'camel-main/9.9.9/index.json',
				executorVersion: '9.9.9',
				camelCatalogVersion: '9.9.9',
				frameworkVersion: '9.9.9',
				runtimeProviderVersion: '9.9.9',
			},
		];

		Object.defineProperty(vscode.workspace, 'getConfiguration', {
			value: () =>
				({
					get: (key: string) => (key === KAOTO_CATALOG_URL_SETTING_ID ? 'https://example.com/catalog/index.json' : undefined),
				}) as vscode.WorkspaceConfiguration,
			configurable: true,
		});

		Object.defineProperty(globalThis, 'fetch', {
			value: async () =>
				({
					ok: true,
					json: async () => ({
						definitions: remoteCatalogs,
						version: 1,
						name: 'remote-catalog',
					}),
				}) as Response,
			configurable: true,
		});

		catalogService = new KaotoCatalogService(context);
		await catalogService.initialize();

		expect(catalogService.getCatalogs()).to.deep.equal(remoteCatalogs);
	});

	test('should fallback to local catalogs when custom URL fetch fails', async () => {
		const warningMessages: string[] = [];
		Object.defineProperty(vscode.window, 'showWarningMessage', {
			value: async (message: string) => {
				warningMessages.push(message);
				return undefined;
			},
			configurable: true,
		});

		Object.defineProperty(vscode.workspace, 'getConfiguration', {
			value: () =>
				({
					get: (key: string) => (key === KAOTO_CATALOG_URL_SETTING_ID ? 'https://example.com/catalog/index.json' : undefined),
				}) as vscode.WorkspaceConfiguration,
			configurable: true,
		});

		Object.defineProperty(globalThis, 'fetch', {
			value: async () => {
				throw new Error('network failure');
			},
			configurable: true,
		});

		catalogService = new KaotoCatalogService(context);
		await catalogService.initialize();

		expect(catalogService.getCatalogs().length).to.be.greaterThan(0);
		expect(warningMessages).to.have.lengthOf(1);
		expect(warningMessages[0]).to.include(KAOTO_CATALOG_URL_SETTING_ID);
		expect(warningMessages[0]).to.include('Falling back to local node_modules catalog');
	});

	test('should group catalogs by runtime', () => {
		const grouped = catalogService.getCatalogsByRuntime();
		expect(grouped).to.be.an('object');
		expect(grouped).to.have.property('Main');
		expect(grouped).to.have.property('Quarkus');
		expect(grouped).to.have.property('Spring Boot');
	});

	test('should return default catalog (latest Camel Main RedHat version)', () => {
		const defaultCatalog = catalogService.getDefaultCatalog();
		expect(defaultCatalog).to.not.be.undefined;
		expect(defaultCatalog?.runtime).to.equal('Main');

		// Should prioritize RedHat versions if available
		const allMainCatalogs = catalogService.getCatalogs().filter((c) => c.runtime === 'Main');
		const hasRedHatVersions = allMainCatalogs.some((c) => c.version.toLowerCase().includes('redhat'));

		if (hasRedHatVersions) {
			expect(defaultCatalog?.version.toLowerCase()).to.include('redhat');
		}
	});

	test('should return default Citrus catalog for test files', () => {
		const testFileUri = vscode.Uri.file('/path/to/test.citrus.yaml');
		const defaultCatalog = catalogService.getDefaultCatalog(testFileUri);

		// Should return a Citrus catalog for test files
		const citrusCatalogs = catalogService.getCatalogs().filter((c) => c.runtime.toLowerCase() === RuntimeType.CITRUS);
		if (citrusCatalogs.length > 0) {
			expect(defaultCatalog).to.not.be.undefined;
			expect(defaultCatalog?.runtime.toLowerCase()).to.equal('citrus');

			// Should be the latest version
			const sorted = citrusCatalogs.toSorted((a, b) => {
				return b.version.localeCompare(a.version, undefined, { numeric: true });
			});
			expect(defaultCatalog?.version).to.equal(sorted[0].version);
		}
	});

	test('should detect Maven projects', async () => {
		// Test isMavenProject method - it requires files to be in workspace folders
		// Since test fixtures may not be in workspace folders, we test the method exists and returns boolean
		const testUri = vscode.Uri.file('/path/to/test.camel.yaml');
		const result = await KaotoCatalogService.isMavenProject(testUri);
		expect(result).to.be.a('boolean');
		// Method should return false for non-workspace files
		expect(result).to.be.false;
	});

	test('should not detect non-Maven projects', async () => {
		// Test with a non-existent path - should return false
		const testUri = vscode.Uri.file('/non/existent/path/test.camel.yaml');
		const result = await KaotoCatalogService.isMavenProject(testUri);
		expect(result).to.be.false;
	});

	test('should validate catalog definitions', () => {
		const catalogs = catalogService.getCatalogs();
		catalogs.forEach((catalog) => {
			expect(catalog).to.have.property('name');
			expect(catalog).to.have.property('version');
			expect(catalog).to.have.property('runtime');
			expect(catalog).to.have.property('fileName');
			expect(catalog.name).to.be.a('string');
			expect(catalog.version).to.be.a('string');
			expect(catalog.runtime).to.be.a('string');
			expect(catalog.fileName).to.be.a('string');
		});
	});

	test('should detect Kaoto integration files', () => {
		// Test .camel.yaml files
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/route.camel.yaml'))).to.be.true;
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/route.camel.yml'))).to.be.true;

		// Test .kamelet.yaml files
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/source.kamelet.yaml'))).to.be.true;
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/source.kamelet.yml'))).to.be.true;

		// Test .pipe.yaml files
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/integration.pipe.yaml'))).to.be.true;
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/integration-pipe.yaml'))).to.be.true;

		// Test .camel.xml files
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/route.camel.xml'))).to.be.true;

		// Test non-integration files
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/test.citrus.yaml'))).to.be.false;
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/random.yaml'))).to.be.false;
		expect(catalogService['isKaotoIntegrationFile'](vscode.Uri.file('/path/to/pom.xml'))).to.be.false;
	});

	test('should detect Citrus test files', () => {
		// Test .citrus.yaml files
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/test.citrus.yaml'))).to.be.true;
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/test.citrus.yml'))).to.be.true;

		// Test .citrus.test.yaml files
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/test.citrus.test.yaml'))).to.be.true;
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/test.citrus-test.yaml'))).to.be.true;

		// Test .citrus.it.yaml files
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/test.citrus.it.yaml'))).to.be.true;
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/test.citrus-it.yaml'))).to.be.true;

		// Test non-test files
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/route.camel.yaml'))).to.be.false;
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/random.yaml'))).to.be.false;
		expect(catalogService['isKaotoCitrusTestFile'](vscode.Uri.file('/path/to/pom.xml'))).to.be.false;
	});

	test('should detect any Kaoto file (integration or test)', () => {
		// Test integration files
		expect(catalogService['isKaotoFile'](vscode.Uri.file('/path/to/route.camel.yaml'))).to.be.true;
		expect(catalogService['isKaotoFile'](vscode.Uri.file('/path/to/source.kamelet.yaml'))).to.be.true;
		expect(catalogService['isKaotoFile'](vscode.Uri.file('/path/to/integration.pipe.yaml'))).to.be.true;

		// Test Citrus test files
		expect(catalogService['isKaotoFile'](vscode.Uri.file('/path/to/test.citrus.yaml'))).to.be.true;
		expect(catalogService['isKaotoFile'](vscode.Uri.file('/path/to/test.citrus.test.yaml'))).to.be.true;

		// Test non-Kaoto files
		expect(catalogService['isKaotoFile'](vscode.Uri.file('/path/to/random.yaml'))).to.be.false;
		expect(catalogService['isKaotoFile'](vscode.Uri.file('/path/to/pom.xml'))).to.be.false;
	});

	test('should have Main runtime catalogs', () => {
		const grouped = catalogService.getCatalogsByRuntime();
		const mainCatalogs = grouped['Main'];
		expect(mainCatalogs).to.be.an('array');
		expect(mainCatalogs.length).to.be.greaterThan(0);
	});

	test('should have Quarkus runtime catalogs', () => {
		const grouped = catalogService.getCatalogsByRuntime();
		const quarkusCatalogs = grouped['Quarkus'];
		expect(quarkusCatalogs).to.be.an('array');
		expect(quarkusCatalogs.length).to.be.greaterThan(0);
	});

	test('should have Spring Boot runtime catalogs', () => {
		const grouped = catalogService.getCatalogsByRuntime();
		const springBootCatalogs = grouped['Spring Boot'];
		expect(springBootCatalogs).to.be.an('array');
		expect(springBootCatalogs.length).to.be.greaterThan(0);
	});

	test('should build display label from catalog definition', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Main 4.18.0',
			version: '4.18.0',
			runtime: 'Main',
			fileName: 'camel-main/4.18.0/index-825a64c8dcfd946d5eb88a96e71f6589.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '',
			frameworkVersion: '',
		};

		const label = KaotoCatalogService.buildDisplayLabel(catalog);
		expect(label).to.equal('Camel Main 4.18.0');
	});

	test('should get Camel version for CLI from catalog (Main with executorVersion) - JBang', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Main 4.18.0',
			version: '4.18.0',
			runtime: 'Main',
			fileName: 'camel-main/4.18.0/index-825a64c8dcfd946d5eb88a96e71f6589.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '',
			frameworkVersion: '',
		};

		const camelVersion = catalogService.getCamelVersionForCLI(catalog, 'jbang');
		// JBang should use catalog version for --camel-version flag
		expect(camelVersion).to.equal('4.18.0');
	});

	test('should get Camel version for CLI from catalog (Main with executorVersion) - Camel Launcher', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Main 4.18.0',
			version: '4.18.0',
			runtime: 'Main',
			fileName: 'camel-main/4.18.0/index-825a64c8dcfd946d5eb88a96e71f6589.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '',
			frameworkVersion: '',
		};

		const camelVersion = catalogService.getCamelVersionForCLI(catalog, 'camel-launcher');
		// Camel Launcher should use executorVersion for JAR download
		expect(camelVersion).to.equal('4.18.0');
	});

	test('should get Camel version for CLI from catalog (Quarkus with executorVersion) - JBang', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Quarkus 3.32.0',
			version: '3.32.0',
			runtime: 'Quarkus',
			fileName: 'camel-quarkus/3.32.0/index-xxx.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '3.32.0',
			frameworkVersion: '3.32.2',
		};

		const camelVersion = catalogService.getCamelVersionForCLI(catalog, 'jbang');
		// JBang with Quarkus should use frameworkVersion (Quarkus platform version)
		expect(camelVersion).to.equal('3.32.2');
	});

	test('should get Camel version for CLI from catalog (Quarkus with executorVersion) - Camel Launcher', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Quarkus 3.32.0',
			version: '3.32.0',
			runtime: 'Quarkus',
			fileName: 'camel-quarkus/3.32.0/index-xxx.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '3.32.0',
			frameworkVersion: '3.32.2',
		};

		const camelVersion = catalogService.getCamelVersionForCLI(catalog, 'camel-launcher');
		// Camel Launcher should use executorVersion (4.18.0) for JAR download
		expect(camelVersion).to.equal('4.18.0');
	});

	test('should get Camel version for CLI from catalog (RedHat with executorVersion) - JBang', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Main 4.18.1.redhat-00019',
			version: '4.18.1.redhat-00019',
			runtime: 'Main',
			fileName: 'camel-main/4.18.1.redhat-00019/index-xxx.json',
			executorVersion: '4.18.1.redhat-00016',
			camelCatalogVersion: '4.18.1.redhat-00019',
			runtimeProviderVersion: '',
			frameworkVersion: '',
		};

		const camelVersion = catalogService.getCamelVersionForCLI(catalog, 'jbang');
		// JBang should use catalog version for --camel-version flag
		expect(camelVersion).to.equal('4.18.1.redhat-00019');
	});

	test('should get Camel version for CLI from catalog (RedHat with executorVersion) - Camel Launcher', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Main 4.18.1.redhat-00019',
			version: '4.18.1.redhat-00019',
			runtime: 'Main',
			fileName: 'camel-main/4.18.1.redhat-00019/index-xxx.json',
			executorVersion: '4.18.1.redhat-00016',
			camelCatalogVersion: '4.18.1.redhat-00019',
			runtimeProviderVersion: '',
			frameworkVersion: '',
		};

		const camelVersion = catalogService.getCamelVersionForCLI(catalog, 'camel-launcher');
		// Camel Launcher should use executorVersion which differs from catalog version
		expect(camelVersion).to.equal('4.18.1.redhat-00016');
	});

	test('should return undefined Camel version for undefined catalog', () => {
		const camelVersion = catalogService.getCamelVersionForCLI(undefined);
		expect(camelVersion).to.be.undefined;
	});

	test('should get runtime for CLI from catalog (Main)', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Main 4.18.0',
			version: '4.18.0',
			runtime: 'Main',
			fileName: 'camel-main/4.18.0/index-825a64c8dcfd946d5eb88a96e71f6589.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '',
			frameworkVersion: '',
		};

		const runtime = catalogService.getRuntimeForCLI(catalog);
		expect(runtime).to.equal('camel-main');
	});

	test('should get runtime for CLI from catalog (Quarkus)', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Quarkus 3.32.0',
			version: '3.32.0',
			runtime: 'Quarkus',
			fileName: 'camel-quarkus/3.32.0/index-xxx.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '3.32.0',
			frameworkVersion: '3.32.2',
		};

		const runtime = catalogService.getRuntimeForCLI(catalog);
		expect(runtime).to.equal('quarkus');
	});

	test('should get runtime for CLI from catalog (Spring Boot)', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Spring Boot 4.18.0',
			version: '4.18.0',
			runtime: 'Spring Boot',
			fileName: 'camel-springboot/4.18.0/index-xxx.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '',
			frameworkVersion: '3.4.3',
		};

		const runtime = catalogService.getRuntimeForCLI(catalog);
		expect(runtime).to.equal('spring-boot');
	});

	test('should return undefined runtime for undefined catalog', () => {
		const runtime = catalogService.getRuntimeForCLI(undefined);
		expect(runtime).to.be.undefined;
	});

	test('should get CLI parameters from catalog', () => {
		const catalog: CatalogLibraryEntry = {
			name: 'Camel Main 4.18.0',
			version: '4.18.0',
			runtime: 'Main',
			fileName: 'camel-main/4.18.0/index-825a64c8dcfd946d5eb88a96e71f6589.json',
			executorVersion: '4.18.0',
			camelCatalogVersion: '4.18.0',
			runtimeProviderVersion: '',
			frameworkVersion: '',
		};

		const params = catalogService.getCLIParameters(catalog);
		expect(params.executorVersion).to.equal('4.18.0');
		expect(params.runtime).to.equal('camel-main');
	});

	test('should return empty CLI parameters for undefined catalog', () => {
		const params = catalogService.getCLIParameters(undefined);
		expect(params.executorVersion).to.be.undefined;
		expect(params.runtime).to.be.undefined;
	});

	// Note: Active document resolution tests removed due to complexity of mocking VSCode API
	// These scenarios are better tested through integration tests

	suite('Separate Integration and Test Catalog Storage', () => {
		test('should store integration and test catalogs separately', async () => {
			// Get an integration catalog (Main)
			const integrationCatalog = catalogService.getCatalogs().find((c) => c.runtime === 'Main');
			expect(integrationCatalog).to.not.be.undefined;

			// Get a test catalog (Citrus)
			const testCatalog = catalogService.getCatalogs().find((c) => c.runtime.toLowerCase() === RuntimeType.CITRUS);
			expect(testCatalog).to.not.be.undefined;

			if (integrationCatalog && testCatalog) {
				// Set integration catalog
				await catalogService.setSelectedIntegrationCatalog(integrationCatalog);

				// Set test catalog
				await catalogService.setSelectedTestCatalog(testCatalog);

				// Verify both are stored correctly
				const storedIntegration = await catalogService.getSelectedIntegrationCatalog();
				const storedTest = await catalogService.getSelectedTestCatalog();

				expect(storedIntegration?.version).to.equal(integrationCatalog.version);
				expect(storedTest?.version).to.equal(testCatalog.version);

				// Verify they are different
				expect(storedIntegration?.runtime).to.not.equal(storedTest?.runtime);
			}
		});

		test('should return integration catalog for integration file URI', async () => {
			const integrationFileUri = vscode.Uri.file('/path/to/route.camel.yaml');
			const catalog = await catalogService.getSelectedCatalog(integrationFileUri);

			// Should return integration catalog (not Citrus)
			if (catalog) {
				expect(catalog.runtime.toLowerCase()).to.not.equal('citrus');
			}
		});

		test('should return test catalog for test file URI', async () => {
			const testFileUri = vscode.Uri.file('/path/to/test.citrus.yaml');
			const catalog = await catalogService.getSelectedCatalog(testFileUri);

			// Should return test catalog (Citrus) if available
			const citrusCatalogs = catalogService.getCatalogs().filter((c) => c.runtime.toLowerCase() === RuntimeType.CITRUS);
			if (citrusCatalogs.length > 0 && catalog) {
				expect(catalog.runtime.toLowerCase()).to.equal('citrus');
			}
		});

		test('should have separate default catalogs for integration and test', () => {
			const integrationDefault = catalogService.getDefaultIntegrationCatalog();
			const testDefault = catalogService.getDefaultTestCatalog();

			expect(integrationDefault).to.not.be.undefined;
			expect(integrationDefault?.runtime).to.equal('Main');

			// Test default may be undefined if no Citrus catalogs available
			const citrusCatalogs = catalogService.getCatalogs().filter((c) => c.runtime.toLowerCase() === RuntimeType.CITRUS);
			if (citrusCatalogs.length > 0) {
				expect(testDefault).to.not.be.undefined;
				expect(testDefault?.runtime.toLowerCase()).to.equal('citrus');
			}
		});
	});
});
