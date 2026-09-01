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
import { TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import {
	CAMEL_TRUSTED_SOURCE_URL,
	CITRUS_TRUSTED_SOURCE_URL,
	COMMAND_SELECT_CAMEL_CATALOG,
	CONTEXT_EXECUTOR_AVAILABLE,
	KAOTO_EXECUTOR_TYPE_SETTING_ID,
} from '../../constants';
import { sendCommandTrackingEvent } from './TrackingEvent';
import {
	runJBangCommandWithStatusBar,
	verifyJavaExists,
	verifyJBangExists,
	verifyJBangTrustedSources,
	verifyCamelPluginsAreInstalled,
} from '../../utils/Process';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { ensureExecutorAvailable } from '../../executors/ExecutorInitializer';
import { IRegistrar } from './IRegistrar';

export class ExecutorRegistrar implements IRegistrar {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly telemetryService: TelemetryService | undefined,
		private readonly catalogService: KaotoCatalogService,
	) {}

	/**
	 * Register executor-related configuration listeners, catalog selection command,
	 * and trigger initial executor setup (non-blocking).
	 */
	public register(): void {
		this.registerExecutorSetup(this.catalogService);
	}

	public registerExecutorSetup(catalogService: KaotoCatalogService): void {
		this.context.subscriptions.push(
			vscode.workspace.onDidChangeConfiguration(async (event) => {
				if (event.affectsConfiguration(KAOTO_EXECUTOR_TYPE_SETTING_ID)) {
					KaotoOutputChannel.logInfo('Executor type configuration changed, validating requirements...');

					ensureExecutorAvailable(this.context, this, true).catch((error) => {
						KaotoOutputChannel.logError('Failed to initialize executor after configuration change', error);
					});
				}
			}),
			vscode.commands.registerCommand(COMMAND_SELECT_CAMEL_CATALOG, async () => {
				const catalogSelected = await catalogService.showCatalogPicker();
				await sendCommandTrackingEvent(this.telemetryService, COMMAND_SELECT_CAMEL_CATALOG);

				if (catalogSelected) {
					ensureExecutorAvailable(this.context, this, true).catch((error) => {
						KaotoOutputChannel.logError('Failed to initialize executor after catalog selection', error);
					});
				}
			}),
		);

		ensureExecutorAvailable(this.context, this).catch((error) => {
			KaotoOutputChannel.logError('Background executor setup failed', error);
		});
	}

	public async checkJbangOnPath(): Promise<boolean> {
		return this.checkToolOnPath('JBang', verifyJBangExists, 'https://www.jbang.dev/documentation/jbang/latest/installation.html');
	}

	public async checkJavaOnPath(): Promise<boolean> {
		return this.checkToolOnPath('Java', verifyJavaExists, 'https://adoptium.net/installation/');
	}

	private async checkToolOnPath(toolName: string, verifyFn: () => Promise<boolean>, installUrl: string): Promise<boolean> {
		if (await verifyFn()) {
			return true;
		}
		const msg = `${toolName} is missing on a system PATH. Please follow instructions below and install ${toolName}. [${toolName} Installation Guide](${installUrl}).`;
		KaotoOutputChannel.logWarning(msg);
		const selection = await vscode.window.showWarningMessage(msg, 'Install');
		if (selection !== undefined) {
			await vscode.commands.executeCommand('vscode.open', installUrl);
		} else {
			await vscode.window.showWarningMessage(`${toolName} is not installed. Some Kaoto extension features may not work properly.`, 'OK');
		}
		return false;
	}

	public async setExecutorAvailable(available: boolean): Promise<void> {
		await vscode.commands.executeCommand('setContext', CONTEXT_EXECUTOR_AVAILABLE, available);
	}

	public async checkJBangTrustedSources() {
		const camelTrustedSources = await verifyJBangTrustedSources([CAMEL_TRUSTED_SOURCE_URL, CITRUS_TRUSTED_SOURCE_URL]);
		const camelTrustedSourcesToAdd = camelTrustedSources.filter((source) => !source.exists).map((source) => source.url);
		if (camelTrustedSourcesToAdd.length > 0) {
			const output = await runJBangCommandWithStatusBar(
				`trust add ${camelTrustedSourcesToAdd.join(' ')}`,
				`Adding [${camelTrustedSourcesToAdd.join(', ')}] into JBang configuration Trusted Sources...`,
			);
			if (output.stderr.length > 0 && output.stderr.toLowerCase().includes('error')) {
				const errorMessage = `Failed to add [${camelTrustedSourcesToAdd.join(', ')}] into JBang configuration Trusted Sources: ${output.stderr}`;
				KaotoOutputChannel.logError(errorMessage);
				vscode.window.showWarningMessage(errorMessage);
			} else {
				KaotoOutputChannel.logInfo(`[${camelTrustedSourcesToAdd.join(', ')}] were added into JBang configuration Trusted Sources.`);
			}
		}
	}

	public async checkCamelJBangPlugins() {
		const camelPlugins = await verifyCamelPluginsAreInstalled(['kubernetes', 'test']);
		const camelPluginsToInstall = camelPlugins.filter((plugin) => !plugin.installed).map((plugin) => plugin.plugin);
		if (camelPluginsToInstall.length > 0) {
			for (const plugin of camelPluginsToInstall) {
				const output = await runJBangCommandWithStatusBar(`camel@apache/camel plugin add ${plugin}`, `Adding Apache Camel JBang ${plugin} plugin...`);
				if (output.stderr.length > 0 && output.stderr.toLowerCase().includes('error')) {
					KaotoOutputChannel.logError(`Failed to add Apache Camel JBang ${plugin} plugin: ${output.stderr}`);
					vscode.window.showWarningMessage(`Failed to add Apache Camel JBang ${plugin} plugin: ${output.stderr}`);
				} else {
					KaotoOutputChannel.logInfo(`Apache Camel JBang ${plugin} plugin was installed.`);
				}
			}
		}
	}
}
