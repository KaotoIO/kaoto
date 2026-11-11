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
import { expect } from 'chai';
import * as os from 'os';
import * as vscode from 'vscode';
import { KAOTO_CATALOG_URL_SETTING_ID, KAOTO_LSP_ENABLED_SETTING_ID, KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID } from '../../../constants';
import { LanguageServerRegistrar } from '../../../extension/registrars/LanguageServerRegistrar';
import { CamelLanguageServerManager } from '../../../lsp/CamelLanguageServerManager';
import { KaotoCatalogService } from '../../../services/KaotoCatalogService';

suite('LanguageServerRegistrar', () => {
	const originalOnDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration;
	const originalStart = CamelLanguageServerManager.prototype.start;
	const originalUpdateSettings = CamelLanguageServerManager.prototype.updateSettings;
	let context: vscode.ExtensionContext;
	let registrar: LanguageServerRegistrar;
	let changeConfiguration: (event: vscode.ConfigurationChangeEvent) => Promise<void>;
	let reloadCatalogs: () => void;
	let updates: number;

	/** One configuration change event that affects these settings. */
	const changeOf = (...settingIds: string[]) => ({ affectsConfiguration: (id: string) => settingIds.includes(id) }) as vscode.ConfigurationChangeEvent;

	setup(() => {
		updates = 0;
		CamelLanguageServerManager.prototype.start = () => Promise.resolve();
		CamelLanguageServerManager.prototype.updateSettings = () => {
			updates++;
			return Promise.resolve();
		};
		Object.defineProperty(vscode.workspace, 'onDidChangeConfiguration', {
			value: (listener: typeof changeConfiguration) => {
				changeConfiguration = listener;
				return new vscode.Disposable(() => undefined);
			},
			configurable: true,
		});
		context = {
			subscriptions: [],
			globalStorageUri: vscode.Uri.file(os.tmpdir()),
			extension: { packageJSON: { camelLanguageServer: { version: '1.2.3', sha256: '0'.repeat(64) } } },
		} as unknown as vscode.ExtensionContext;
		const catalogService = {
			onDidReloadCatalogs: (listener: () => void) => {
				reloadCatalogs = listener;
				return new vscode.Disposable(() => undefined);
			},
		} as unknown as KaotoCatalogService;

		registrar = new LanguageServerRegistrar(context, catalogService);
		registrar.register();
	});

	teardown(async () => {
		// disposes the listener that waits for a Camel file when the server is enabled, which is not in the subscriptions
		await registrar.stop();
		CamelLanguageServerManager.prototype.start = originalStart;
		CamelLanguageServerManager.prototype.updateSettings = originalUpdateSettings;
		Object.defineProperty(vscode.workspace, 'onDidChangeConfiguration', { value: originalOnDidChangeConfiguration, configurable: true });
		context.subscriptions.forEach((subscription) => subscription.dispose());
	});

	test('sends the settings to the server when the selected catalog changes', async () => {
		await changeConfiguration(changeOf(KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID));

		expect(updates).to.equal(1);
	});

	test('sends the settings to the server when the same change also affects kaoto.lsp.enabled', async () => {
		await changeConfiguration(changeOf(KAOTO_LSP_ENABLED_SETTING_ID, KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID));

		expect(updates).to.equal(1);
	});

	test('sends the settings to the server when the catalogs are loaded again', () => {
		reloadCatalogs();

		expect(updates).to.equal(1);
	});

	test('leaves a catalog selected with a new kaoto.catalog.url to the reload of its catalogs', async () => {
		await changeConfiguration(changeOf(KAOTO_CATALOG_URL_SETTING_ID, KAOTO_RUNTIME_CATALOG_NAME_SETTING_ID));

		expect(updates).to.equal(0);
	});
});
