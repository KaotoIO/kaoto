import { expect } from 'chai';
import { NewCamelProjectCommand } from '../../commands/NewCamelProjectCommand';

suite('New Camel Project GAV Validation', function () {
	const command = new NewCamelProjectCommand();

	/**
	 * Helper function to validate test cases.
	 * @param {string[]} validCases - Array of valid GAV strings.
	 * @param {string[]} invalidCases - Array of invalid GAV strings.
	 */
	function runValidationTests(validCases: string[], invalidCases: string[]) {
		validCases.forEach((gav) => {
			test(`Valid: ${gav}`, function () {
				expect(command.validateGAV(gav)).to.be.undefined;
			});
		});
		invalidCases.forEach((gav) => {
			test(`Invalid: ${gav}`, function () {
				expect(command.validateGAV(gav)).to.not.be.undefined;
			});
		});
	}

	suite('General GAV Validation', function () {
		runValidationTests(
			['com.test:demo:1.0-SNAPSHOT', 'com:demo:1.0-SNAPSHOT', 'com.test:demo:1.0'],
			[
				'',
				'invalid',
				'invalid:invalid',
				'invalid:with space:1.0-SNAPSHOT',
				'with space:invalid:1.0-SNAPSHOT',
				'invalid:invalid:1.0- with space',
				'.invalid:valid:1.0-SNAPSHOT',
				'%invalid:valid:1.0-SNAPSHOT',
				'va.lid:%invalid:1.0-SNAPSHOT',
				'va.lid:valid:1.0-%invalid',
			],
		);
	});

	suite('Group ID Validation', function () {
		runValidationTests(
			['com.test:demo:1.0-SNAPSHOT', 'org.apache.maven:demo:1.0', 'io.github.project:demo:2.3.4'],
			['.com.test:demo:1.0', 'com..example:demo:1.0', 'com.Example:demo:1.0', 'com.example.:demo:1.0'],
		);
	});

	suite('Artifact ID Validation', function () {
		runValidationTests(
			['com.test:demo:1.0', 'com.test:my-library:1.2.3', 'org.apache.maven:plugin:3.5.0'],
			['com.test:Demo:1.0', 'com.test:my_library:1.2.3', 'com.test:lib$:1.0', 'com.test:lib-:1.0'],
		);
	});

	suite('Version Validation', function () {
		runValidationTests(
			[
				'com.test:demo:1.0',
				'com.test:demo:1.2.3',
				'com.test:demo:1.0-SNAPSHOT',
				'com.test:demo:2.3.4-beta',
				'com.test:demo:3.1.4-alpha-2',
				'com.test:demo:1.2.3+dfc0c87',
				'com.test:demo:2.3.4+15433',
			],
			['com.test:demo:1', 'com.test:demo:1.', 'com.test:demo:1.0.', 'com.test:demo:1.0+', 'com.test:demo:v1.0', 'com.test:demo:1.0--SNAPSHOT'],
		);
	});
});
