import { assert } from 'chai';
import { DockerErrorDetector } from '../../utils/DockerErrorDetector';

suite('DockerErrorDetector', () => {
	suite('detectDockerError', () => {
		test('should detect Docker environment error from typical error message', () => {
			const errorOutput = `
Starting service kafka (PID: 52744)
java.lang.reflect.InvocationTargetException
Caused by: java.lang.IllegalStateException: Could not find a valid Docker environment. Please see logs and check configuration
			`;

			const result = DockerErrorDetector.detectDockerError(errorOutput);

			assert.isNotNull(result, 'Should detect Docker error');
			assert.strictEqual(result?.isDockerError, true);
			assert.include(result?.userMessage ?? '', 'Docker environment not found');
			assert.include(result?.userMessage ?? '', 'container runtime');
		});

		test('should return null for non-Docker errors', () => {
			const errorOutput = 'Some other error message';

			const result = DockerErrorDetector.detectDockerError(errorOutput);

			assert.isNull(result);
		});

		test('should return null for empty string', () => {
			const result = DockerErrorDetector.detectDockerError('');

			assert.isNull(result);
		});

		test('should return null for null input', () => {
			const result = DockerErrorDetector.detectDockerError(null as any);

			assert.isNull(result);
		});

		test('should return null for undefined input', () => {
			const result = DockerErrorDetector.detectDockerError(undefined as any);

			assert.isNull(result);
		});

		test('should detect Docker error case-insensitively', () => {
			const errorOutput = 'could not find a valid docker environment';

			const result = DockerErrorDetector.detectDockerError(errorOutput);

			assert.isNotNull(result, 'Should detect Docker error case-insensitively');
			assert.strictEqual(result?.isDockerError, true);
		});

		test('should provide user-friendly message', () => {
			const errorOutput = 'Could not find a valid Docker environment';

			const result = DockerErrorDetector.detectDockerError(errorOutput);

			assert.isNotNull(result);
			assert.isNotEmpty(result?.userMessage);
			assert.isTrue(result?.userMessage.includes('Docker') || result?.userMessage.includes('Podman'), 'Message should mention Docker or Podman');
		});
	});
});
