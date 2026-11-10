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
import { isCamelLspDocument } from '../../lsp/CamelLspDocumentFilter';
import { readCamelLspSettings } from '../../lsp/CamelLspSettings';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { IRegistrar } from './IRegistrar';

export class LanguageServerRegistrar implements IRegistrar {
	private lspManager: CamelLanguageServerManager | undefined;
	private camelDocumentListener: vscode.Disposable | undefined;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly catalogService: KaotoCatalogService,
	) {}

	register(): void {
		this.lspManager = new CamelLanguageServerManager(this.context, () => readCamelLspSettings(this.catalogService));

		// Register the settings listener unconditionally — this must happen before the
		// early return below so that re-enabling at runtime also works when the LSP was disabled
		// at activation time (otherwise no listener would exist to catch the change).
		this.context.subscriptions.push(
			this.lspManager.onDidRequestRetry(() => this.startInBackground()),
			// the catalogs of a new kaoto.catalog.url can change what the selected catalog is
			this.catalogService.onDidReloadCatalogs(() => this.lspManager?.updateSettings()),
			vscode.workspace.onDidChangeConfiguration(async (event) => {
				if (event.affectsConfiguration(KAOTO_LSP_ENABLED_SETTING_ID)) {
					if (LanguageServerRegistrar.isEnabled()) {
						KaotoOutputChannel.logInfo('Camel Language Server re-enabled.');
						this.startWhenCamelFileOpens();
					} else {
						// also cancels a download or a start in progress
						KaotoOutputChannel.logInfo('Camel Language Server disabled, stopping...');
						this.disposeCamelDocumentListener();
						await this.lspManager?.stop();
					}
				} else if (event.affectsConfiguration(KAOTO_LSP_SERVER_JAR_SETTING_ID) && LanguageServerRegistrar.isEnabled()) {
					// a start in progress would still run the previous JAR, so it is cancelled too
					KaotoOutputChannel.logInfo('Camel Language Server JAR changed, restarting...');
					await this.lspManager?.stop();
					this.startWhenCamelFileOpens();
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
		// a retry or an opened file never starts a disabled server, not even its download
		if (!LanguageServerRegistrar.isEnabled()) {
			return;
		}
		// Start LSP in background — do not block extension activation
		this.lspManager?.start().catch((error) => {
			KaotoOutputChannel.logError('Background LSP startup failed', error);
		});
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

	private static isEnabled(): boolean {
		return vscode.workspace.getConfiguration().get<boolean>(KAOTO_LSP_ENABLED_SETTING_ID, true);
	}
}
