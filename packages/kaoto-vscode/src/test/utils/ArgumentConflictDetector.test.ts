import { assert } from 'chai';
import { ArgumentConflictDetector, ArgumentConflict } from '../../utils/ArgumentConflictDetector';

// Test data constants
const TEST_ARGS = {
	DEV: '--dev',
	CONSOLE: '--console',
	MANAGEMENT_PORT_8080: '--management-port=8080',
	MANAGEMENT_PORT_9090: '--management-port=9090',
	MANAGEMENT_PORT_QUOTED: "'--management-port=8080'",
	MANAGEMENT_PORT_UPPER: '--Management-Port=8080',
	LOGGING_LEVEL_INFO: '--logging-level=info',
	REPOS_COMPLEX: '--repos=#repos,https://maven.repository.redhat.com/ga/',
	REPOS_WITH_EQUALS: '--repos=#repos,https://example.com',
} as const;

// Helper function to assert conflict properties
function assertConflict(conflict: ArgumentConflict, expected: { argument: string; codeValue?: string; userValue?: string; context?: string }): void {
	assert.strictEqual(conflict.argument, expected.argument);
	if (expected.codeValue !== undefined) {
		assert.strictEqual(conflict.codeValue, expected.codeValue);
	}
	if (expected.userValue !== undefined) {
		assert.strictEqual(conflict.userValue, expected.userValue);
	}
	if (expected.context !== undefined) {
		assert.strictEqual(conflict.context, expected.context);
	}
}

suite('ArgumentConflictDetector', () => {
	suite('parseArgument', () => {
		test('should parse argument with equals sign', () => {
			const result = ArgumentConflictDetector.parseArgument(TEST_ARGS.MANAGEMENT_PORT_8080);
			assert.strictEqual(result.name, 'management-port');
			assert.strictEqual(result.value, '8080');
			assert.strictEqual(result.isFlag, false);
		});

		test('should parse argument with equals sign and quotes', () => {
			const result = ArgumentConflictDetector.parseArgument(TEST_ARGS.MANAGEMENT_PORT_QUOTED);
			assert.strictEqual(result.name, 'management-port');
			assert.strictEqual(result.value, '8080');
			assert.strictEqual(result.isFlag, false);
		});

		test('should parse flag argument', () => {
			const result = ArgumentConflictDetector.parseArgument(TEST_ARGS.CONSOLE);
			assert.strictEqual(result.name, 'console');
			assert.isUndefined(result.value);
			assert.strictEqual(result.isFlag, true);
		});

		test('should parse argument with value containing equals sign', () => {
			const result = ArgumentConflictDetector.parseArgument(TEST_ARGS.REPOS_WITH_EQUALS);
			assert.strictEqual(result.name, 'repos');
			assert.strictEqual(result.value, '#repos,https://example.com');
			assert.strictEqual(result.isFlag, false);
		});

		test('should handle case insensitivity', () => {
			const result = ArgumentConflictDetector.parseArgument(TEST_ARGS.MANAGEMENT_PORT_UPPER);
			assert.strictEqual(result.name, 'management-port');
		});
	});

	suite('hasArgument', () => {
		interface HasArgumentTestCase {
			description: string;
			args: string[];
			argName: string;
			expected: boolean;
		}

		const testCases: HasArgumentTestCase[] = [
			{
				description: 'should find management-port in array',
				args: [TEST_ARGS.DEV, TEST_ARGS.MANAGEMENT_PORT_8080, TEST_ARGS.CONSOLE],
				argName: 'management-port',
				expected: true,
			},
			{
				description: 'should find console in array',
				args: [TEST_ARGS.DEV, TEST_ARGS.MANAGEMENT_PORT_8080, TEST_ARGS.CONSOLE],
				argName: 'console',
				expected: true,
			},
			{
				description: 'should find dev in array',
				args: [TEST_ARGS.DEV, TEST_ARGS.MANAGEMENT_PORT_8080, TEST_ARGS.CONSOLE],
				argName: 'dev',
				expected: true,
			},
			{
				description: 'should not find port when not present',
				args: [TEST_ARGS.DEV, TEST_ARGS.MANAGEMENT_PORT_8080],
				argName: 'port',
				expected: false,
			},
			{
				description: 'should not find logging-level when not present',
				args: [TEST_ARGS.DEV, TEST_ARGS.MANAGEMENT_PORT_8080],
				argName: 'logging-level',
				expected: false,
			},
		];

		testCases.forEach(({ description, args, argName, expected }) => {
			test(description, () => {
				assert.strictEqual(ArgumentConflictDetector.hasArgument(args, argName), expected);
			});
		});

		test('should be case insensitive', () => {
			const args: string[] = [TEST_ARGS.MANAGEMENT_PORT_UPPER];
			assert.isTrue(ArgumentConflictDetector.hasArgument(args, 'management-port'));
			assert.isTrue(ArgumentConflictDetector.hasArgument(args, 'MANAGEMENT-PORT'));
		});

		test('should handle quoted arguments', () => {
			const args: string[] = [TEST_ARGS.MANAGEMENT_PORT_QUOTED, TEST_ARGS.CONSOLE];
			assert.isTrue(ArgumentConflictDetector.hasArgument(args, 'management-port'));
		});
	});

	suite('getArgumentValue', () => {
		test('should get value from argument with equals sign', () => {
			const args: string[] = [TEST_ARGS.MANAGEMENT_PORT_8080, TEST_ARGS.DEV];
			assert.strictEqual(ArgumentConflictDetector.getArgumentValue(args, 'management-port'), '8080');
		});

		test('should return undefined for flag argument', () => {
			const args: string[] = [TEST_ARGS.CONSOLE, TEST_ARGS.DEV];
			assert.isUndefined(ArgumentConflictDetector.getArgumentValue(args, 'console'));
		});

		test('should return undefined for non-existent argument', () => {
			const args: string[] = [TEST_ARGS.DEV];
			assert.isUndefined(ArgumentConflictDetector.getArgumentValue(args, 'port'));
		});

		test('should handle complex values', () => {
			const args: string[] = [TEST_ARGS.REPOS_COMPLEX];
			const expectedValue: string = '#repos,https://maven.repository.redhat.com/ga/';
			assert.strictEqual(ArgumentConflictDetector.getArgumentValue(args, 'repos'), expectedValue);
		});
	});

	suite('mergeArguments', () => {
		test('should merge arguments without conflicts', () => {
			const codeArgs: string[] = [TEST_ARGS.CONSOLE];
			const userArgs: string[] = [TEST_ARGS.DEV, TEST_ARGS.LOGGING_LEVEL_INFO];
			const result = ArgumentConflictDetector.mergeArguments(codeArgs, userArgs, 'test');

			assert.strictEqual(result.merged.length, 3);
			assert.include(result.merged, TEST_ARGS.DEV);
			assert.include(result.merged, TEST_ARGS.LOGGING_LEVEL_INFO);
			assert.include(result.merged, TEST_ARGS.CONSOLE);
			assert.strictEqual(result.conflicts.length, 0);
		});

		test('should detect conflict and prioritize user argument', () => {
			const codeArgs: string[] = [TEST_ARGS.CONSOLE];
			const userArgs: string[] = [TEST_ARGS.CONSOLE, TEST_ARGS.DEV];
			const result = ArgumentConflictDetector.mergeArguments(codeArgs, userArgs, 'test');

			assert.strictEqual(result.merged.length, 2);
			assert.include(result.merged, TEST_ARGS.CONSOLE);
			assert.include(result.merged, TEST_ARGS.DEV);
			assert.strictEqual(result.conflicts.length, 1);
			assertConflict(result.conflicts[0], {
				argument: 'console',
				context: 'test',
			});
		});

		test('should detect conflict with different values', () => {
			const codeArgs: string[] = [TEST_ARGS.MANAGEMENT_PORT_8080];
			const userArgs: string[] = [TEST_ARGS.MANAGEMENT_PORT_9090, TEST_ARGS.DEV];
			const result = ArgumentConflictDetector.mergeArguments(codeArgs, userArgs, 'run');

			assert.strictEqual(result.merged.length, 2);
			assert.include(result.merged, TEST_ARGS.MANAGEMENT_PORT_9090);
			assert.include(result.merged, TEST_ARGS.DEV);
			assert.strictEqual(result.conflicts.length, 1);
			assertConflict(result.conflicts[0], {
				argument: 'management-port',
				codeValue: '8080',
				userValue: '9090',
			});
		});

		test('should handle multiple conflicts', () => {
			const codeArgs: string[] = [TEST_ARGS.CONSOLE, TEST_ARGS.MANAGEMENT_PORT_8080];
			const userArgs: string[] = [TEST_ARGS.CONSOLE, TEST_ARGS.MANAGEMENT_PORT_9090, TEST_ARGS.DEV];
			const result = ArgumentConflictDetector.mergeArguments(codeArgs, userArgs, 'test');

			assert.strictEqual(result.merged.length, 3);
			assert.strictEqual(result.conflicts.length, 2);
		});
	});

	suite('hasAnyArgument', () => {
		test('should find any of the specified arguments', () => {
			const args: string[] = [TEST_ARGS.MANAGEMENT_PORT_8080, TEST_ARGS.DEV];
			const argNames: string[] = ['port', 'management-port'];
			assert.isTrue(ArgumentConflictDetector.hasAnyArgument(args, argNames));
		});

		test('should return false if none found', () => {
			const args: string[] = [TEST_ARGS.DEV, TEST_ARGS.CONSOLE];
			const argNames: string[] = ['port', 'management-port'];
			assert.isFalse(ArgumentConflictDetector.hasAnyArgument(args, argNames));
		});

		test('should handle empty arrays', () => {
			const emptyArgs: string[] = [];
			const emptyArgNames: string[] = [];
			assert.isFalse(ArgumentConflictDetector.hasAnyArgument(emptyArgs, ['port']));
			assert.isFalse(ArgumentConflictDetector.hasAnyArgument([TEST_ARGS.DEV], emptyArgNames));
		});
	});

	suite('removeArguments', () => {
		test('should remove specified arguments', () => {
			const args: string[] = [TEST_ARGS.DEV, TEST_ARGS.MANAGEMENT_PORT_8080, TEST_ARGS.CONSOLE];
			const toRemove: string[] = ['management-port', 'console'];
			const result: string[] = ArgumentConflictDetector.removeArguments(args, toRemove);

			assert.strictEqual(result.length, 1);
			assert.include(result, TEST_ARGS.DEV);
		});

		test('should handle non-existent arguments', () => {
			const args: string[] = [TEST_ARGS.DEV, TEST_ARGS.CONSOLE];
			const toRemove: string[] = ['port'];
			const result: string[] = ArgumentConflictDetector.removeArguments(args, toRemove);

			assert.strictEqual(result.length, 2);
			assert.include(result, TEST_ARGS.DEV);
			assert.include(result, TEST_ARGS.CONSOLE);
		});

		test('should be case insensitive', () => {
			const args: string[] = [TEST_ARGS.MANAGEMENT_PORT_UPPER, TEST_ARGS.DEV];
			const toRemove: string[] = ['management-port'];
			const result: string[] = ArgumentConflictDetector.removeArguments(args, toRemove);

			assert.strictEqual(result.length, 1);
			assert.include(result, TEST_ARGS.DEV);
		});
	});

	suite('extractPortValue', () => {
		test('should extract port from --management-port argument', () => {
			const args: string[] = ['--management-port=8080'];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.strictEqual(port, 8080);
		});

		test('should extract port from --port argument', () => {
			const args: string[] = ['--port=9090'];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.strictEqual(port, 9090);
		});

		test('should prioritize --management-port over --port', () => {
			const args: string[] = ['--port=9090', '--management-port=8080'];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.strictEqual(port, 8080);
		});

		test('should handle quoted arguments', () => {
			const args: string[] = ["'--management-port=7070'"];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.strictEqual(port, 7070);
		});

		test('should handle case-insensitive argument names', () => {
			const args: string[] = ['--Management-Port=6060'];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.strictEqual(port, 6060);
		});

		test('should return undefined when no port argument exists', () => {
			const args: string[] = ['--dev', '--console'];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.isUndefined(port);
		});

		test('should return undefined for empty array', () => {
			const args: string[] = [];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.isUndefined(port);
		});

		test('should return undefined for invalid port value', () => {
			const args: string[] = ['--management-port=invalid'];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.isUndefined(port);
		});

		test('should handle negative port values', () => {
			const args: string[] = ['--management-port=-1'];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.strictEqual(port, -1);
		});

		test('should extract port from multiple arguments', () => {
			const args: string[] = ['--dev', '--management-port=5050', '--console'];
			const port = ArgumentConflictDetector.extractPortValue(args);
			assert.strictEqual(port, 5050);
		});
	});
});
