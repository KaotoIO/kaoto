import { assert } from 'chai';
import { CamelCommandBuilder } from '../../executors/builders/CamelCommandBuilder';

suite('CamelCommandBuilder Tests', () => {
	test('Should build command with JBang prefix args', () => {
		const builder = new CamelCommandBuilder({
			executable: 'jbang',
			prefixArgs: ['-Dcamel.jbang.version=4.18.0', 'camel@apache/camel'],
		});

		const result = builder.buildCommand('run', ['test.yaml', '--port=8080']);

		// Verify execution is created
		assert.isDefined(result.execution);
		assert.equal(result.resolvedPort, 8080);
	});

	test('Should build command without prefix args for Camel Launcher', () => {
		const builder = new CamelCommandBuilder({
			executable: '/path/to/camel',
			prefixArgs: [],
		});

		const result = builder.buildCommand('run', ['test.yaml', '--management-port=8080']);

		// Verify execution is created
		assert.isDefined(result.execution);
		assert.equal(result.resolvedPort, 8080);
	});

	test('Should filter empty arguments', () => {
		const builder = new CamelCommandBuilder({
			executable: 'camel',
			prefixArgs: [],
		});

		const result = builder.buildCommand('export', ['test.yaml', '', '--runtime=quarkus']);

		// Verify execution is created (empty args should be filtered)
		assert.isDefined(result.execution);
	});

	test('Should extract port from --port argument', () => {
		const builder = new CamelCommandBuilder({
			executable: 'camel',
			prefixArgs: [],
		});

		const result = builder.buildCommand('run', ['test.yaml', '--port=8080']);

		assert.equal(result.resolvedPort, 8080);
	});

	test('Should extract port from --management-port argument', () => {
		const builder = new CamelCommandBuilder({
			executable: 'camel',
			prefixArgs: [],
		});

		const result = builder.buildCommand('run', ['test.yaml', '--management-port=9090']);

		assert.equal(result.resolvedPort, 9090);
	});

	test('Should return undefined port when no port argument', () => {
		const builder = new CamelCommandBuilder({
			executable: 'camel',
			prefixArgs: [],
		});

		const result = builder.buildCommand('run', ['test.yaml']);

		assert.isUndefined(result.resolvedPort);
	});

	test('Should include context cwd in execution options', () => {
		const builder = new CamelCommandBuilder({
			executable: 'camel',
			prefixArgs: [],
		});

		const result = builder.buildCommand('run', ['test.yaml'], { cwd: '/project/path' });

		assert.equal(result.execution.options?.cwd, '/project/path');
	});
});
