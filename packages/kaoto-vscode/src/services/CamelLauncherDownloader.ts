import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as os from 'os';
import { ExtensionContext } from 'vscode';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { isRedHatBuild } from '../utils/Version';

/**
 * Error thrown when Camel Launcher version is not found (404)
 */
export class LauncherNotFoundError extends Error {
	constructor(version: string, url: string) {
		super(`Camel Launcher ${version} is not available. ` + `This version may not exist in the repository. ` + `Attempted URL: ${url}`);
		this.name = 'LauncherNotFoundError';
	}
}

/**
 * Service for downloading and managing Camel Launcher JAR distributions
 */
export class CamelLauncherDownloader {
	private static readonly MAVEN_CENTRAL_BASE = 'https://repo1.maven.org/maven2/org/apache/camel/camel-launcher';
	private static readonly REDHAT_MAVEN_BASE = 'https://maven.repository.redhat.com/ga/org/apache/camel/camel-launcher';
	private readonly storageDir: string;

	constructor(context?: ExtensionContext, customStorageDir?: string) {
		// Use custom storage dir, extension global storage, or fallback to temp
		this.storageDir = customStorageDir || context?.globalStorageUri.fsPath || path.join(os.tmpdir(), 'vscode-kaoto-camel-launcher');

		// Ensure storage directory exists
		if (!fs.existsSync(this.storageDir)) {
			fs.mkdirSync(this.storageDir, { recursive: true });
		}
	}

	/**
	 * Ensure Camel Launcher is available, downloading if necessary
	 * @param version - Camel version to download
	 * @returns Path to the camel launcher JAR file
	 */
	async ensureLauncher(version: string): Promise<string> {
		const launcherDir = this.getLauncherDirectory(version);
		const jarPath = path.join(launcherDir, `camel-launcher-${version}.jar`);

		// Check if JAR already exists
		if (fs.existsSync(jarPath)) {
			KaotoOutputChannel.logInfo(`Camel Launcher ${version} already available at: ${jarPath}`);
			return jarPath;
		}

		// Download JAR
		KaotoOutputChannel.logInfo(`Downloading Camel Launcher ${version}...`);
		await this.downloadLauncher(version, launcherDir);

		// Verify JAR was downloaded
		if (!fs.existsSync(jarPath)) {
			throw new Error(`Camel Launcher JAR not found after download in ${launcherDir}`);
		}

		return jarPath;
	}

	/**
	 * Get Maven repository base URL for the version
	 */
	private getMavenBaseUrl(version: string): string {
		return isRedHatBuild(version) ? CamelLauncherDownloader.REDHAT_MAVEN_BASE : CamelLauncherDownloader.MAVEN_CENTRAL_BASE;
	}

	/**
	 * Download Camel Launcher JAR from appropriate Maven repository
	 */
	private async downloadLauncher(version: string, targetDir: string): Promise<void> {
		const jarPath = path.join(targetDir, `camel-launcher-${version}.jar`);
		const mavenBaseUrl = this.getMavenBaseUrl(version);

		// Ensure target directory exists
		if (!fs.existsSync(targetDir)) {
			fs.mkdirSync(targetDir, { recursive: true });
		}

		// Download JAR file
		const downloadUrl = `${mavenBaseUrl}/${version}/camel-launcher-${version}.jar`;

		try {
			KaotoOutputChannel.logInfo(`Downloading JAR from: ${downloadUrl}`);
			await this.downloadFile(downloadUrl, jarPath);
			KaotoOutputChannel.logInfo(`JAR downloaded successfully to: ${jarPath}`);
		} catch (error) {
			// Handle 404 errors with a specific error type
			if (error instanceof Error && error.message.includes('HTTP 404')) {
				throw new LauncherNotFoundError(version, downloadUrl);
			}
			// For other errors, throw with details
			throw new Error(`Failed to download Camel Launcher ${version} from ${downloadUrl}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Download file from URL
	 */
	private downloadFile(url: string, targetPath: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const file = fs.createWriteStream(targetPath);

			https
				.get(url, (response) => {
					// Handle redirects
					if (response.statusCode === 301 || response.statusCode === 302) {
						const redirectUrl = response.headers.location;
						if (redirectUrl) {
							file.close();
							fs.unlinkSync(targetPath);
							this.downloadFile(redirectUrl, targetPath).then(resolve).catch(reject);
							return;
						}
					}

					if (response.statusCode !== 200) {
						file.close();
						fs.unlinkSync(targetPath);
						reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
						return;
					}

					response.pipe(file);

					file.on('finish', () => {
						file.close();
						resolve();
					});
				})
				.on('error', (error) => {
					file.close();
					if (fs.existsSync(targetPath)) {
						fs.unlinkSync(targetPath);
					}
					reject(error);
				});
		});
	}

	/**
	 * Get launcher directory for specific version
	 */
	private getLauncherDirectory(version: string): string {
		return path.join(this.storageDir, `camel-launcher-${version}`);
	}

	/**
	 * Get storage directory
	 */
	getStorageDirectory(): string {
		return this.storageDir;
	}
}
