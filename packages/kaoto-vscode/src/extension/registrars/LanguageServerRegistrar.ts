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
import { KAOTO_LSP_ENABLED_SETTING_ID, KAOTO_LSP_SERVER_JAR_SETTING_ID } from '../../constants';
import { CamelLanguageServerManager } from '../../lsp/CamelLanguageServerManager';
import { isCamelLspDocument } from '../../lsp/CamelLspDocumentFilter';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { IRegistrar } from './IRegistrar';

export class LanguageServerRegistrar implements IRegistrar {
	private lspManager: CamelLanguageServerManager | undefined;
	private camelDocumentListener: vscode.Disposable | undefined;
	private starting: Promise<void> | undefined;

	constructor(private readonly context: vscode.ExtensionContext) {}

	async register(): Promise<void> {
		this.lspManager = new CamelLanguageServerManager(this.context);
		this.context.subscriptions.push(this.lspManager.onDidRequestRetry(() => this.startInBackground()));

		// Register the settings listener unconditionally — this must happen before the
		// early return below so that re-enabling at runtime also works when the LSP was disabled
		// at activation time (otherwise no listener would exist to catch the change).
		this.context.subscriptions.push(
			vscode.workspace.onDidChangeConfiguration(async (event) => {
				if (event.affectsConfiguration(KAOTO_LSP_ENABLED_SETTING_ID)) {
					if (LanguageServerRegistrar.isEnabled()) {
						KaotoOutputChannel.logInfo('Camel Language Server re-enabled.');
						this.startWhenCamelFileOpens();
					} else if (this.lspManager?.isRunning()) {
						KaotoOutputChannel.logInfo('Camel Language Server disabled, stopping...');
						await this.lspManager.stop();
					}
				} else if (event.affectsConfiguration(KAOTO_LSP_SERVER_JAR_SETTING_ID) && LanguageServerRegistrar.isEnabled()) {
					if (this.lspManager?.isRunning()) {
						KaotoOutputChannel.logInfo('Camel Language Server JAR changed, restarting...');
						await this.lspManager.stop();
					}
					this.startWhenCamelFileOpens();
				}
			}),
		);

		if (!LanguageServerRegistrar.isEnabled()) {
			KaotoOutputChannel.logInfo('Camel Language Server is disabled via kaoto.lsp.enabled setting.');
			return;
		}

		this.startWhenCamelFileOpens();
	}

	/**
	 * Starts the LSP now when a Camel or application properties file is open, otherwise when the first one is opened,
	 * so that windows without such files don't download or run the server.
	 */
	private startWhenCamelFileOpens(): void {
		if (vscode.workspace.textDocuments.some(isCamelLspDocument)) {
			this.startInBackground();
			return;
		}

		if (!this.camelDocumentListener) {
			KaotoOutputChannel.logInfo('Camel Language Server will start when a Camel or application properties file is opened.');
			this.camelDocumentListener = vscode.workspace.onDidOpenTextDocument((document) => {
				if (isCamelLspDocument(document) && LanguageServerRegistrar.isEnabled()) {
					this.disposeCamelDocumentListener();
					this.startInBackground();
				}
			});
		}
	}

	private disposeCamelDocumentListener(): void {
		this.camelDocumentListener?.dispose();
		this.camelDocumentListener = undefined;
	}

	private startInBackground(): void {
		// Start LSP in background — do not block extension activation
		this.startLsp().catch((error) => {
			KaotoOutputChannel.logError('Background LSP startup failed', error);
		});
	}

	/**
	 * Starts a single server, also when Camel files are opened while a start is in progress.
	 */
	private startLsp(): Promise<void> {
		this.starting ??= this.doStartLsp().finally(() => {
			this.starting = undefined;
		});
		return this.starting;
	}

	private async doStartLsp(): Promise<void> {
		if (!this.lspManager || this.lspManager.isRunning()) {
			return;
		}

		await this.lspManager.start();
	}

	/**
	 * Stop the language server. Called from extension.ts deactivate().
	 */
	async stop(): Promise<void> {
		this.disposeCamelDocumentListener();
		if (this.lspManager) {
			await this.lspManager.stop();
		}
	}

	/**
	 * Get the underlying LSP manager.
	 */
	getLspManager(): CamelLanguageServerManager | undefined {
		return this.lspManager;
	}

	private static isEnabled(): boolean {
		return vscode.workspace.getConfiguration().get<boolean>(KAOTO_LSP_ENABLED_SETTING_ID, true);
	}
}
