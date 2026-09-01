import { assert } from 'chai';
import { CamelSettingsHelper } from '../../executors/helpers/CamelSettingsHelper';
import * as path from 'path';
import { initializeKaotoCatalogService } from '../utils/TestSetup';

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
});
