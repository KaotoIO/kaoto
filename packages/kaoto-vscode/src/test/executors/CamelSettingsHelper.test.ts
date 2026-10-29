import { assert } from 'chai';
import * as vscode from 'vscode';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { CamelSettingsHelper } from '../../executors/helpers/CamelSettingsHelper';
import { ExecutorType } from '../../executors/types/ExecutorTypes';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { KAOTO_EXECUTOR_TYPE_SETTING_ID } from '../../constants';
import * as path from 'path';
import { initializeKaotoCatalogService, preserveKaotoCatalogServiceInstance } from '../utils/TestSetup';
import { SPRING_BOOT_CATALOGS } from '../utils/SpringBootCatalogs';

suite('CamelSettingsHelper Tests', () => {
	let helper: CamelSettingsHelper;

	suiteSetup(async () => {
		// Initialize KaotoCatalogService for tests
		await initializeKaotoCatalogService();
	});

	setup(() => {
		helper = new CamelSettingsHelper();
	});

	test('Should get run arguments with console flag', async () => {
		const testFile = path.join(__dirname, 'test.yaml');
		const result = await helper.getRunArguments(testFile, __dirname);

		// Should include --console from code defaults
		assert.include(result.args, '--console');
	});

	test('Should get run source dir arguments with console flag', async () => {
		const result = await helper.getRunSourceDirArguments(__dirname);

		// Should include --console from code defaults
		assert.include(result.args, '--console');
	});

	test('Should get export arguments', async () => {
		const result = await helper.getExportArguments(__dirname);

		// Should return array (may be empty if no user settings)
		assert.isArray(result.args);
		assert.isArray(result.conflicts);
	});

	test('Should get port argument for Camel 4.14+', () => {
		const result = helper.getPortArgument(8080);

		// Should use --management-port for 4.14+
		assert.include(result.argument, '--management-port=8080');
		assert.equal(result.resolvedPort, 8080);
	});

	test('Should always use management port for Quarkus runtime', () => {
		(helper as unknown as { runtime: string; camelVersion: string }).runtime = 'quarkus';
		(helper as unknown as { runtime: string; camelVersion: string }).camelVersion = '3.20.0';

		const result = helper.getPortArgument(8080);

		assert.equal(result.argument, '--management-port=8080');
		assert.equal(result.resolvedPort, 8080);
	});

	test('Should respect user-defined port in arguments', () => {
		const userArgs = ['--management-port=9090'];
		const result = helper.getPortArgument(8080, userArgs);

		// Should not add port argument when user already defined it
		assert.equal(result.argument, '');
		assert.equal(result.resolvedPort, 9090);
	});

	test('Should get Camel version argument from configuration', async () => {
		const result = await helper.getCamelVersionArgument();

		// May return version if configured in test environment, or empty string
		// Just verify it returns a string
		assert.isString(result);
	});

	test('Should not add Camel version when user already defined it', async () => {
		const userArgs = ['--camel-version=4.17.0'];
		const result = await helper.getCamelVersionArgument(userArgs);

		// Should return empty string to avoid conflict
		assert.equal(result, '');
	});

	test('Should get Red Hat Maven repository argument based on version', async () => {
		const result = await helper.getRedHatMavenRepositoryArgument();

		// May return repos URL if redhat version is configured, or empty string
		// Just verify it returns a string
		assert.isString(result);
	});

	test('Should not add repos when user already defined it', async () => {
		const userArgs = ['--repos=https://custom.repo.com'];
		const result = await helper.getRedHatMavenRepositoryArgument(userArgs);

		// Should return empty string to avoid conflict
		assert.equal(result, '');
	});

	test('Should handle port extraction from --port argument', () => {
		const userArgs = ['--port=8080'];
		const result = helper.getPortArgument(9090, userArgs);

		// Should extract port from user args
		assert.equal(result.resolvedPort, 8080);
		assert.equal(result.argument, '');
	});

	test('Should handle port extraction from --management-port argument', () => {
		const userArgs = ['--management-port=8080'];
		const result = helper.getPortArgument(9090, userArgs);

		// Should extract port from user args
		assert.equal(result.resolvedPort, 8080);
		assert.equal(result.argument, '');
	});

	suite('Spring Boot arguments', () => {
		const executorTypes: ExecutorType[] = ['jbang', 'camel-launcher'];
		let catalogService: KaotoCatalogService;
		let originalGetConfiguration: typeof vscode.workspace.getConfiguration;
		let restoreCatalogServiceInstance: () => void;

		suiteSetup(async () => {
			restoreCatalogServiceInstance = preserveKaotoCatalogServiceInstance();
			catalogService = await initializeKaotoCatalogService();
		});

		setup(() => {
			originalGetConfiguration = vscode.workspace.getConfiguration;
		});

		teardown(() => {
			Object.defineProperty(vscode.workspace, 'getConfiguration', {
				value: originalGetConfiguration,
				configurable: true,
			});
		});

		suiteTeardown(() => {
			// The instance with a stubbed catalog selection must not outlive this suite.
			restoreCatalogServiceInstance();
		});

		/**
		 * Make the helper resolve this catalog and executor type; other settings keep their values.
		 */
		function selectCatalog(catalog: CatalogLibraryEntry, executorType: ExecutorType): void {
			catalogService.getSelectedIntegrationCatalog = async () => catalog;
			Object.defineProperty(vscode.workspace, 'getConfiguration', {
				value: (section?: string, scope?: vscode.ConfigurationScope | null) => {
					const config = originalGetConfiguration(section, scope);
					return {
						...config,
						get: (key: string, defaultValue?: unknown) => (key === KAOTO_EXECUTOR_TYPE_SETTING_ID ? executorType : config.get(key, defaultValue)),
					};
				},
				configurable: true,
			});
		}

		for (const executorType of executorTypes) {
			for (const { name, catalog, camelSpringBootVersion } of SPRING_BOOT_CATALOGS) {
				test(`Should pass the Camel Spring Boot version of ${name} with the ${executorType} executor`, async () => {
					selectCatalog(catalog, executorType);

					const args = await helper.getSpringBootArguments();

					assert.deepEqual(args, [`--camel-spring-boot-version=${camelSpringBootVersion}`, `--spring-boot-version=${catalog.frameworkVersion}`]);
				});
			}
		}
	});
});
