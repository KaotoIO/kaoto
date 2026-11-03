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
import * as vscode from 'vscode';
import * as path from 'path'; // NOSONAR
import * as fs from 'fs'; // NOSONAR
import { execFile } from 'child_process';
import { Executable, LanguageClient, LanguageClientOptions } from 'vscode-languageclient/node';
import { KAOTO_LSP_SERVER_JAR_SETTING_ID } from '../constants';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { CAMEL_LSP_DOCUMENT_SELECTORS, CAMEL_LSP_FILE_WATCHER_GLOBS } from './CamelLspDocumentFilter';
import { CamelLspServerDownloader, DownloadProgress } from './CamelLspServerDownloader';

const LANGUAGE_CLIENT_ID = 'LANGUAGE_ID_APACHE_CAMEL_KAOTO';
// also the name of the client's output channel, listed next to the 'Kaoto' channel
const LANGUAGE_CLIENT_NAME = 'Kaoto - Camel Language Server';

type StatusBarState = 'starting' | 'running' | 'error';

/**
 * Manages the lifecycle of the Camel Language Server: Java detection, JAR resolution
 * (the JAR set in the settings, or the release, downloaded when needed),
 * and starting/stopping the underlying `LanguageClient`.
 */
export class CamelLanguageServerManager {
	static readonly REQUIRED_JAVA_VERSION = 17;

	private languageClient: LanguageClient | undefined;
	private statusBarItem: vscode.StatusBarItem | undefined;
	private fileWatchers: vscode.FileSystemWatcher[] = [];
	private readonly retryRequested = new vscode.EventEmitter<void>();

	/** Fires when the user asks to retry a failed download of the server. */
	readonly onDidRequestRetry = this.retryRequested.event;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly downloader = new CamelLspServerDownloader(context.globalStorageUri.fsPath),
	) {
		context.subscriptions.push(this.retryRequested);
	}

	/**
	 * Start the Camel Language Server.
	 */
	async start(): Promise<void> {
		this.createStatusBar();
		this.updateStatusBar('starting');

		const javaExecutable = await CamelLanguageServerManager.findJavaExecutable();
		if (!javaExecutable) {
			this.showJavaNotFoundWarning();
			return;
		}

		const javaVersion = await CamelLanguageServerManager.getJavaVersion(javaExecutable);
		if (javaVersion < CamelLanguageServerManager.REQUIRED_JAVA_VERSION) {
			this.showJavaVersionWarning(javaVersion);
			return;
		}

		const jarPath = await this.resolveJarPath();
		if (!jarPath) {
			this.updateStatusBar('error');
			return;
		}

		KaotoOutputChannel.logInfo(`Starting Camel Language Server with Java ${javaVersion} at ${javaExecutable}`);
		KaotoOutputChannel.logInfo(`Camel LSP server JAR: ${jarPath} (${this.getJarFileSize(jarPath)})`);

		const serverOptions: Executable = {
			command: javaExecutable,
			args: ['-jar', jarPath],
		};

		this.fileWatchers = CAMEL_LSP_FILE_WATCHER_GLOBS.map((glob) => vscode.workspace.createFileSystemWatcher(glob));

		const clientOptions: LanguageClientOptions = {
			documentSelector: CAMEL_LSP_DOCUMENT_SELECTORS,
			synchronize: {
				fileEvents: this.fileWatchers,
			},
		};

		this.languageClient = new LanguageClient(LANGUAGE_CLIENT_ID, LANGUAGE_CLIENT_NAME, serverOptions, clientOptions);

		try {
			await this.languageClient.start();
			this.updateStatusBar('running');
			this.logServerInfo();
			KaotoOutputChannel.logInfo('Camel Language Server started successfully.');
		} catch (error) {
			this.updateStatusBar('error');
			KaotoOutputChannel.logError('Failed to start Camel Language Server', error);
		}
	}

	/**
	 * Stop the Camel Language Server.
	 */
	async stop(): Promise<void> {
		if (this.languageClient) {
			try {
				await this.languageClient.stop();
				KaotoOutputChannel.logInfo('Camel Language Server stopped.');
			} catch (error) {
				KaotoOutputChannel.logError('Error stopping Camel Language Server', error);
			}
			this.languageClient = undefined;
		}
		for (const watcher of this.fileWatchers) {
			watcher.dispose();
		}
		this.fileWatchers = [];
		this.statusBarItem?.dispose();
		this.statusBarItem = undefined;
	}

	/**
	 * Check if the language client is running.
	 */
	isRunning(): boolean {
		return this.languageClient?.isRunning() ?? false;
	}

	/**
	 * Find a Java executable on the system.
	 * Checks JAVA_HOME first, then falls back to java on PATH.
	 */
	static async findJavaExecutable(): Promise<string | undefined> {
		const javaHome = process.env['JAVA_HOME'];
		if (javaHome) {
			const javaPath = path.join(javaHome, 'bin', 'java');
			if (fs.existsSync(javaPath)) {
				return javaPath;
			}
		}

		// Fall back to java on PATH
		try {
			const version = await CamelLanguageServerManager.getJavaVersion('java');
			if (version > 0) {
				return 'java';
			}
		} catch {
			// java not on PATH
		}

		return undefined;
	}

	/**
	 * Get the major Java version by running java -version.
	 * Returns 0 if the version cannot be determined.
	 */
	static async getJavaVersion(javaPath: string): Promise<number> {
		return new Promise<number>((resolve) => {
			execFile(javaPath, ['-version'], { timeout: 10000 }, (_error, stdout, stderr) => {
				// java -version writes to stderr
				const output = stderr || stdout || '';
				const match = output.match(/version\s+"(\d+)(?:\.(\d+))?/);
				if (match) {
					let major = parseInt(match[1], 10);
					// Handle legacy 1.x format
					if (major === 1 && match[2]) {
						major = parseInt(match[2], 10);
					}
					resolve(major);
				} else {
					resolve(0);
				}
			});
		});
	}

	/**
	 * @returns the JAR set in the settings, or the release, downloaded first when needed;
	 * undefined, after reporting the problem, when there is no JAR to run
	 */
	async resolveJarPath(): Promise<string | undefined> {
		const configuredJar = vscode.workspace.getConfiguration().get<string>(KAOTO_LSP_SERVER_JAR_SETTING_ID, '').trim();
		if (configuredJar) {
			if (fs.existsSync(configuredJar)) {
				return configuredJar;
			}
			const msg = `The Camel Language Server JAR set in ${KAOTO_LSP_SERVER_JAR_SETTING_ID} does not exist: ${configuredJar}`;
			KaotoOutputChannel.logError(msg);
			void vscode.window.showErrorMessage(msg);
			return undefined;
		}

		try {
			return await this.downloadServerJar();
		} catch (error) {
			this.showDownloadError(`Camel Language Server ${this.downloader.getVersion()}`, error);
			return undefined;
		}
	}

	private async downloadServerJar(): Promise<string> {
		if (this.downloader.isDownloaded()) {
			return this.downloader.ensureServerJar();
		}
		return this.downloadWithProgress(this.downloader.getVersion(), this.downloader.getDownloadUrl(), (onProgress) =>
			this.downloader.ensureServerJar(onProgress),
		);
	}

	/**
	 * Downloads a JAR of the server with a progress notification.
	 * @param label the version of the server, in the log and the notification
	 */
	private downloadWithProgress(label: string, url: string, download: (onProgress: DownloadProgress) => Promise<string>): Thenable<string> {
		KaotoOutputChannel.logInfo(`Downloading Camel Language Server ${label} from ${url}`);
		return vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Notification, title: `Downloading Camel Language Server ${label}` },
			(progress) => {
				let reportedPercent = 0;
				return download((receivedBytes, totalBytes) => {
					const percent = totalBytes ? Math.floor((receivedBytes / totalBytes) * 100) : 0;
					if (percent > reportedPercent) {
						progress.report({ increment: percent - reportedPercent, message: `${percent}%` });
						reportedPercent = percent;
					}
				});
			},
		);
	}

	private showDownloadError(subject: string, error: unknown): void {
		const msg = `Could not download ${subject}: ${reasonOf(error)}`;
		KaotoOutputChannel.logError(msg);
		void vscode.window.showErrorMessage(msg, 'Retry').then((selection) => {
			if (selection === 'Retry') {
				this.retryRequested.fire();
			}
		});
	}

	private createStatusBar(): void {
		// a start after a failed one replaces the status of the failure
		this.statusBarItem?.dispose();
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
		this.statusBarItem.name = 'Camel Language Server';
		this.context.subscriptions.push(this.statusBarItem);
	}

	private updateStatusBar(state: StatusBarState): void {
		if (!this.statusBarItem) {
			return;
		}

		switch (state) {
			case 'starting':
				this.statusBarItem.text = '$(sync~spin) Camel LS';
				this.statusBarItem.tooltip = 'Camel Language Server is starting...';
				this.statusBarItem.show();
				break;
			case 'running':
				this.statusBarItem.text = '$(check) Camel LS';
				this.statusBarItem.tooltip = 'Camel Language Server is running';
				this.statusBarItem.show();
				break;
			case 'error':
				this.statusBarItem.text = '$(warning) Camel LS';
				this.statusBarItem.tooltip = 'Camel Language Server failed to start';
				this.statusBarItem.show();
				break;
		}
	}

	private logServerInfo(): void {
		if (!this.languageClient) {
			return;
		}
		const serverInfo = this.languageClient.initializeResult?.serverInfo;
		if (serverInfo) {
			const version = serverInfo.version ? ` v${serverInfo.version}` : '';
			KaotoOutputChannel.logInfo(`Camel Language Server info: ${serverInfo.name}${version}`);
		}
	}

	private getJarFileSize(jarPath: string): string {
		try {
			const stats = fs.statSync(jarPath);
			const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
			return `${sizeMB} MB`;
		} catch {
			return 'unknown size';
		}
	}

	private showJavaNotFoundWarning(): void {
		const msg =
			'Java 17+ is required for Camel Language Server features (completion, hover, validation). ' +
			'Please install a JDK and set JAVA_HOME, or add java to your PATH.';
		KaotoOutputChannel.logWarning(msg);
		void vscode.window.showWarningMessage(msg, 'Install JDK').then((selection) => {
			if (selection === 'Install JDK') {
				void vscode.env.openExternal(vscode.Uri.parse('https://adoptium.net/installation/'));
			}
		});
		this.updateStatusBar('error');
	}

	private showJavaVersionWarning(foundVersion: number): void {
		const msg = `Java ${CamelLanguageServerManager.REQUIRED_JAVA_VERSION}+ is required for Camel Language Server, but found Java ${foundVersion}.`;
		KaotoOutputChannel.logWarning(msg);
		void vscode.window.showWarningMessage(msg);
		this.updateStatusBar('error');
	}
}

function reasonOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
