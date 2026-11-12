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
import {
	KAOTO_CATALOG_URL_SETTING_ID,
	KAOTO_LSP_ENABLED_SETTING_ID,
	KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID,
	KAOTO_LSP_SERVER_JAR_SETTING_ID,
	KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID,
} from '../../constants';
import { CamelLanguageServerManager } from '../../lsp/CamelLanguageServerManager';
import { hasOpenCamelLspDocument, isCamelLspDocument, isCamelLspTabActive } from '../../lsp/CamelLspDocumentFilter';
import { readCamelLspSettings } from '../../lsp/CamelLspSettings';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { IRegistrar } from './IRegistrar';

export class LanguageServerRegistrar implements IRegistrar {
	/** How long the server keeps running after the last file it serves is closed, so that switching files does not restart Java. */
	static readonly IDLE_STOP_DELAY_MS = 60_000;

	private lspManager: CamelLanguageServerManager | undefined;
	private camelDocumentListeners: vscode.Disposable | undefined;
	private idleStopTimer: NodeJS.Timeout | undefined;
	/** Whether the server is to run, for the open files or until the idle stop: a start that waited for a stop checks it. */
	private serverRequested = false;
	/** All the stops in progress: a start waits for them, so that it neither joins a cancelled start nor overlaps a server that stops. */
	private stopping: Promise<unknown> | undefined;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly catalogService: KaotoCatalogService,
		private readonly idleStopDelayMs = LanguageServerRegistrar.IDLE_STOP_DELAY_MS,
	) {}

	register(): void {
		this.lspManager = new CamelLanguageServerManager(this.context, () => readCamelLspSettings(this.catalogService));

		// Register the settings listener unconditionally — this must happen before the
		// early return below so that re-enabling at runtime also works when the LSP was disabled
		// at activation time (otherwise no listener would exist to catch the change).
		this.context.subscriptions.push(
			this.lspManager.onDidRequestRetry(() => this.retryStart()),
			// the catalogs of a new kaoto.catalog.url can change what the selected catalog is
			this.catalogService.onDidReloadCatalogs(() => this.lspManager?.updateSettings()),
			vscode.workspace.onDidChangeConfiguration(async (event) => {
				if (event.affectsConfiguration(KAOTO_LSP_ENABLED_SETTING_ID)) {
					if (LanguageServerRegistrar.isEnabled()) {
						KaotoOutputChannel.logInfo('Camel Language Server re-enabled.');
						this.startWhileCamelFilesAreOpen();
					} else {
						// also cancels a download or a start in progress
						KaotoOutputChannel.logInfo('Camel Language Server disabled, stopping...');
						this.disposeCamelDocumentListeners();
						await this.stopServer();
					}
				} else if (event.affectsConfiguration(KAOTO_LSP_SERVER_JAR_SETTING_ID) && LanguageServerRegistrar.isEnabled()) {
					// a start in progress would still run the previous JAR, so it is cancelled too
					KaotoOutputChannel.logInfo('Camel Language Server JAR changed, restarting...');
					await this.stopServer();
					this.startWhileCamelFilesAreOpen();
				}
				// not an else: the same change can also touch kaoto.lsp.enabled, which leaves a running server as it is
				if (
					// with a new kaoto.catalog.url, the settings are sent once its catalogs are loaded, where the name is looked up
					!event.affectsConfiguration(KAOTO_CATALOG_URL_SETTING_ID) &&
					(event.affectsConfiguration(KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID) || event.affectsConfiguration(KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID))
				) {
					// a server that is not running reads the settings when it starts
					await this.lspManager?.updateSettings();
				}
			}),
		);

		if (!LanguageServerRegistrar.isEnabled()) {
			KaotoOutputChannel.logInfo('Camel Language Server is disabled via kaoto.lsp.enabled setting.');
			return;
		}

		this.startWhileCamelFilesAreOpen();
	}

	/**
	 * Runs the LSP while a Camel or application properties file is open, so that windows without such files don't download
	 * or run the server: it starts when the first one is opened, and stops some time after the last one is closed.
	 * Its status bar item shows only while the active tab is such a file.
	 */
	private startWhileCamelFilesAreOpen(): void {
		this.camelDocumentListeners ??= vscode.Disposable.from(
			vscode.workspace.onDidOpenTextDocument((document) => {
				// a document can open after its tab is active
				this.updateStatusBarVisibility();
				if (isCamelLspDocument(document)) {
					this.startForOpenCamelFiles();
				}
			}),
			vscode.workspace.onDidCloseTextDocument((closed) => {
				if (isCamelLspDocument(closed) && !hasOpenCamelLspDocument(closed)) {
					this.stopWhenIdle();
				}
			}),
			vscode.window.tabGroups.onDidChangeTabs(() => this.updateStatusBarVisibility()),
			vscode.window.tabGroups.onDidChangeTabGroups(() => this.updateStatusBarVisibility()),
		);
		// the tab that is active now, also when the server is enabled later than the window opened
		this.updateStatusBarVisibility();

		if (hasOpenCamelLspDocument()) {
			this.startForOpenCamelFiles();
		} else {
			KaotoOutputChannel.logInfo('Camel Language Server will start when a Camel or application properties file is opened.');
		}
	}

	private disposeCamelDocumentListeners(): void {
		this.camelDocumentListeners?.dispose();
		this.camelDocumentListeners = undefined;
	}

	/**
	 * Keeps a server that runs, also one that was about to stop, and starts one that was stopped or that failed to start:
	 * each opened file tries again, so that the server follows a JDK installed or a network back meanwhile.
	 */
	private startForOpenCamelFiles(): void {
		this.cancelIdleStop();
		this.serverRequested = true;
		this.startInBackground();
	}

	/**
	 * Stops the server after the grace period, unless a file that it serves is opened meanwhile.
	 */
	private stopWhenIdle(): void {
		this.cancelIdleStop();
		if (!this.serverRequested) {
			return;
		}
		// an opened file that the server serves cancels the timer
		this.idleStopTimer = setTimeout(() => {
			this.idleStopTimer = undefined;
			const seconds = Math.round(this.idleStopDelayMs / 1000);
			KaotoOutputChannel.logInfo(`No Camel or application properties file was open for ${seconds} seconds, stopping the Camel Language Server...`);
			this.stopServer().catch((error) => {
				KaotoOutputChannel.logError('Could not stop the Camel Language Server', error);
			});
		}, this.idleStopDelayMs);
	}

	private cancelIdleStop(): void {
		clearTimeout(this.idleStopTimer);
		this.idleStopTimer = undefined;
	}

	/**
	 * Starts the server again after a download that failed. With no file left to serve, the server is still downloaded
	 * and started, as asked, and stops after the grace period.
	 */
	private retryStart(): void {
		// a retry never starts a disabled server, not even its download
		if (!LanguageServerRegistrar.isEnabled()) {
			return;
		}
		this.serverRequested = true;
		this.startInBackground();
		if (!hasOpenCamelLspDocument()) {
			this.stopWhenIdle();
		}
	}

	private startInBackground(): void {
		// Start LSP in background — do not block extension activation.
		// The stops in progress end first: a start would join the one that a stop cancels, or run a second server.
		Promise.resolve(this.stopping)
			.then(() => {
				// stopped or disabled again meanwhile: an opened file never starts a disabled server, not even its download
				if (this.serverRequested && LanguageServerRegistrar.isEnabled()) {
					return this.lspManager?.start();
				}
			})
			.catch((error) => {
				KaotoOutputChannel.logError('Background LSP startup failed', error);
			});
	}

	/**
	 * Stops the server, and cancels its start when it is still starting. The next opened file starts it again.
	 */
	private async stopServer(): Promise<void> {
		this.cancelIdleStop();
		this.serverRequested = false;
		// a stop during another one ends at once, as the client is already dropped: the earlier stop is waited for too
		const stopping = Promise.all([this.stopping, this.lspManager?.stop()]).finally(() => {
			if (this.stopping === stopping) {
				this.stopping = undefined;
			}
		});
		this.stopping = stopping;
		await stopping;
	}

	private updateStatusBarVisibility(): void {
		this.lspManager?.setStatusBarVisible(isCamelLspTabActive());
	}

	/**
	 * Stop the language server. Called from extension.ts deactivate().
	 */
	async stop(): Promise<void> {
		this.disposeCamelDocumentListeners();
		await this.stopServer();
	}

	private static isEnabled(): boolean {
		return vscode.workspace.getConfiguration().get<boolean>(KAOTO_LSP_ENABLED_SETTING_ID, true);
	}
}
