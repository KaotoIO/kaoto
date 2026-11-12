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
import { execFile } from 'node:child_process';
import { DidChangeConfigurationNotification, Executable, LanguageClient, LanguageClientOptions, State } from 'vscode-languageclient/node';
import { KAOTO_LSP_SERVER_JAR_SETTING_ID } from '../constants';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { CAMEL_LSP_DOCUMENT_SELECTORS } from './CamelLspDocumentFilter';
import { CamelLspServerDownloader, DownloadProgress } from './CamelLspServerDownloader';
import { CamelLspSettings } from './CamelLspSettings';

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
	/** The latest settings, which the client also gives to a server that it restarts. */
	private settings: CamelLspSettings | undefined;
	/** The settings that the server got, as JSON. */
	private sentSettings: string | undefined;
	private outputChannel: vscode.LogOutputChannel | undefined;
	private starting: Promise<void> | undefined;
	private startAbort: AbortController | undefined;
	private readonly statusBarItem: vscode.StatusBarItem;
	private readonly retryRequested = new vscode.EventEmitter<void>();

	/** Fires when the user asks to retry a failed download of the server. */
	readonly onDidRequestRetry = this.retryRequested.event;

	constructor(
		private readonly context: vscode.ExtensionContext,
		// read at each start and by updateSettings(), so that the server follows the catalog selected in Kaoto
		private readonly readSettings: () => Promise<CamelLspSettings>,
		// the release pinned in the camelLanguageServer group of the extension's package.json
		private readonly downloader = new CamelLspServerDownloader(context.globalStorageUri.fsPath, context.extension.packageJSON.camelLanguageServer),
	) {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_VALUE);
		this.statusBarItem.name = 'Camel Language Server';
		context.subscriptions.push(this.retryRequested, this.statusBarItem);
	}

	/**
	 * Start the Camel Language Server. A call while a start is in progress joins it.
	 */
	start(): Promise<void> {
		this.starting ??= this.startOnce().finally(() => {
			this.starting = undefined;
		});
		return this.starting;
	}

	private async startOnce(): Promise<void> {
		if (this.isRunning()) {
			return;
		}
		// stop() aborts the start, so that a stopped server is neither downloaded nor started
		const abort = new AbortController();
		this.startAbort = abort;
		try {
			await this.startClient(abort.signal);
		} finally {
			this.startAbort = undefined;
		}
	}

	private async startClient(signal: AbortSignal): Promise<void> {
		this.updateStatusBar('starting');

		const javaExecutable = await CamelLanguageServerManager.findJavaExecutable();
		if (signal.aborted) {
			return;
		}
		if (!javaExecutable) {
			this.showJavaNotFoundWarning();
			return;
		}

		const javaVersion = await CamelLanguageServerManager.getJavaVersion(javaExecutable);
		if (signal.aborted) {
			return;
		}
		if (javaVersion < CamelLanguageServerManager.REQUIRED_JAVA_VERSION) {
			this.showJavaVersionWarning(javaVersion);
			return;
		}

		const jarPath = await this.resolveJarPath(signal);
		if (signal.aborted) {
			return;
		}
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

		// read after the download, so that a catalog selected meanwhile is the one the server starts with
		const settings = await this.readSettingsOrBundledCatalog();
		if (signal.aborted) {
			return;
		}
		KaotoOutputChannel.logInfo(`Camel Language Server settings: ${JSON.stringify(settings.camel)}`);
		this.settings = settings;

		const clientOptions: LanguageClientOptions = {
			documentSelector: CAMEL_LSP_DOCUMENT_SELECTORS,
			outputChannel: this.getOutputChannel(),
			// no configuration section is synchronized: the server gets only these settings, the camel.* ones of VS Code
			// belong to the Camel extension. Read at each initialize, also when the client restarts a server that stopped.
			initializationOptions: () => {
				this.sentSettings = JSON.stringify(this.settings);
				return this.settings;
			},
		};

		const client = this.createLanguageClient(serverOptions, clientOptions);
		// settings changed while the client restarted a server that stopped are sent once it runs again
		client.onDidChangeState((event) => {
			if (event.newState === State.Running && client === this.languageClient) {
				void this.sendSettings(client);
			}
		});
		this.languageClient = client;

		try {
			await this.languageClient.start();
		} catch (error) {
			await this.disposeClient();
			if (!signal.aborted) {
				this.updateStatusBar('error');
				KaotoOutputChannel.logError('Failed to start Camel Language Server', error);
			}
			return;
		}
		if (signal.aborted) {
			await this.disposeClient();
			return;
		}
		this.updateStatusBar('running');
		this.logServerInfo();
		KaotoOutputChannel.logInfo('Camel Language Server started successfully.');
	}

	/**
	 * Stop the Camel Language Server, and cancel its start when it is still starting.
	 */
	async stop(): Promise<void> {
		this.startAbort?.abort();
		// the start sees the abort and disposes what it created
		await this.starting?.catch(() => undefined);
		await this.disposeClient();
		this.statusBarItem.hide();
	}

	/**
	 * Reads the settings, once a start in progress is done, and sends them to the running server when they changed.
	 * A server that is not running gets them when it starts, also when its client restarts it.
	 */
	async updateSettings(): Promise<void> {
		await this.starting?.catch(() => undefined);
		const client = this.languageClient;
		if (!client) {
			return;
		}
		try {
			const settings = await this.readSettings();
			// a client created meanwhile read them at its start
			if (client === this.languageClient) {
				this.settings = settings;
				await this.sendSettings(client);
			}
		} catch (error) {
			KaotoOutputChannel.logError('Could not send the settings to the Camel Language Server', error);
		}
	}

	/**
	 * Sends the latest settings to the server when it runs and did not get them yet.
	 */
	private async sendSettings(client: LanguageClient): Promise<void> {
		const json = JSON.stringify(this.settings);
		if (!client.isRunning() || json === this.sentSettings) {
			return;
		}
		this.sentSettings = json;
		try {
			await client.sendNotification(DidChangeConfigurationNotification.type, { settings: this.settings });
			KaotoOutputChannel.logInfo(`Camel Language Server settings changed: ${JSON.stringify(this.settings?.camel)}`);
		} catch (error) {
			KaotoOutputChannel.logError('Could not send the settings to the Camel Language Server', error);
		}
	}

	/**
	 * @returns the settings, or none when they cannot be read, so that the server still starts, with the catalog it bundles
	 */
	private async readSettingsOrBundledCatalog(): Promise<CamelLspSettings> {
		try {
			return await this.readSettings();
		} catch (error) {
			KaotoOutputChannel.logError('Could not read the settings of the Camel Language Server, it uses the catalog it bundles', error);
			return { camel: {} };
		}
	}

	/**
	 * Stops the client when it runs, and drops it. A client whose start failed cannot be stopped.
	 */
	private async disposeClient(): Promise<void> {
		const client = this.languageClient;
		this.languageClient = undefined;
		this.sentSettings = undefined;
		if (client?.isRunning()) {
			try {
				await client.stop();
				KaotoOutputChannel.logInfo('Camel Language Server stopped.');
			} catch (error) {
				KaotoOutputChannel.logError('Error stopping Camel Language Server', error);
			}
		}
	}

	/**
	 * Creates the client of the server; tests replace it with a client that starts no process.
	 */
	protected createLanguageClient(serverOptions: Executable, clientOptions: LanguageClientOptions): LanguageClient {
		return new LanguageClient(LANGUAGE_CLIENT_ID, LANGUAGE_CLIENT_NAME, serverOptions, clientOptions);
	}

	/**
	 * One output channel for all the clients of the session: the log of a failed start stays, and a restart adds no channel.
	 */
	private getOutputChannel(): vscode.LogOutputChannel {
		if (!this.outputChannel) {
			this.outputChannel = vscode.window.createOutputChannel(LANGUAGE_CLIENT_NAME, { log: true });
			this.context.subscriptions.push(this.outputChannel);
		}
		return this.outputChannel;
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
			const javaPath = CamelLanguageServerManager.getJavaHomeExecutable(javaHome);
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
	 * @returns the java executable of a Java home, java.exe on Windows
	 */
	static getJavaHomeExecutable(javaHome: string, platform: NodeJS.Platform = process.platform): string {
		return path.join(javaHome, 'bin', platform === 'win32' ? 'java.exe' : 'java');
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
					let major = Number.parseInt(match[1], 10);
					// Handle legacy 1.x format
					if (major === 1 && match[2]) {
						major = Number.parseInt(match[2], 10);
					}
					resolve(major);
				} else {
					resolve(0);
				}
			});
		});
	}

	/**
	 * @param signal cancels the download of the release, without reporting it
	 * @returns the JAR set in the settings, or the release, downloaded first when needed;
	 * undefined, after reporting the problem, when there is no JAR to run
	 */
	async resolveJarPath(signal?: AbortSignal): Promise<string | undefined> {
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
			return await this.downloadServerJar(signal);
		} catch (error) {
			if (!signal?.aborted) {
				this.showDownloadError(`Camel Language Server ${this.downloader.getVersion()}`, error);
			}
			return undefined;
		}
	}

	private async downloadServerJar(signal?: AbortSignal): Promise<string> {
		if (this.downloader.isDownloaded()) {
			return this.downloader.ensureServerJar();
		}
		return this.downloadWithProgress(this.downloader.getVersion(), this.downloader.getDownloadUrl(), (onProgress) =>
			this.downloader.ensureServerJar(onProgress, signal),
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

	private updateStatusBar(state: StatusBarState): void {
		switch (state) {
			case 'starting':
				this.statusBarItem.text = '$(sync~spin) Camel LS';
				this.statusBarItem.tooltip = 'Camel Language Server is starting...';
				break;
			case 'running':
				this.statusBarItem.text = '$(check) Camel LS';
				this.statusBarItem.tooltip = 'Camel Language Server is running';
				break;
			case 'error':
				this.statusBarItem.text = '$(warning) Camel LS';
				this.statusBarItem.tooltip = 'Camel Language Server failed to start';
				break;
		}
		this.statusBarItem.show();
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
