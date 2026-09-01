export interface DockerErrorInfo {
	isDockerError: boolean;
	userMessage: string;
}

export class DockerErrorDetector {
	private static readonly DOCKER_ERROR_PATTERN = /Could not find a valid Docker environment/i;

	/**
	 * Detects if the error message indicates Docker environment is not available
	 * @param errorOutput The error output to analyze
	 * @returns DockerErrorInfo if Docker error detected, null otherwise
	 */
	public static detectDockerError(errorOutput: string): DockerErrorInfo | null {
		if (!errorOutput || typeof errorOutput !== 'string') {
			return null;
		}

		if (this.DOCKER_ERROR_PATTERN.test(errorOutput)) {
			return {
				isDockerError: true,
				userMessage:
					'Docker environment not found. Infrastructure services require a container runtime (Docker or Podman) to be installed and running.',
			};
		}

		return null;
	}
}
