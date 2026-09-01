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
	COMMAND_INFRASTRUCTURE_COPY_PORT,
	COMMAND_INFRASTRUCTURE_COPY_URL,
	COMMAND_INFRASTRUCTURE_LOGS,
	COMMAND_INFRASTRUCTURE_REFRESH,
	COMMAND_INFRASTRUCTURE_START,
	COMMAND_INFRASTRUCTURE_STOP,
	VIEW_INFRASTRUCTURE,
} from '../../constants';
import { InfrastructureProvider } from '../../views/infrastructure/InfrastructureProvider';
import { InfrastructureItem } from '../../views/infrastructure/InfrastructureItem';
import { StartInfrastructureServiceCommand } from '../../commands/StartInfrastructureServiceCommand';
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';
import { CamelTaskFactory } from '../../tasks/CamelTaskFactory';
import { confirmInfrastructureServiceStop } from '../../utils/Modals';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { sendCommandTrackingEvent } from './TrackingEvent';
import { IRegistrar } from './IRegistrar';

export class InfrastructureRegistrar implements IRegistrar {
	private infrastructureProvider!: InfrastructureProvider;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly telemetryService: TelemetryService | undefined,
	) {}

	register(): void {
		this.registerInfrastructureView();
		this.registerInfrastructureCommands();
	}

	public registerInfrastructureView() {
		this.infrastructureProvider = new InfrastructureProvider();
		const infrastructureTreeView = vscode.window.createTreeView(VIEW_INFRASTRUCTURE, {
			treeDataProvider: this.infrastructureProvider,
			showCollapseAll: false,
		});

		const refreshCommand = vscode.commands.registerCommand(COMMAND_INFRASTRUCTURE_REFRESH, async () => {
			await this.infrastructureProvider.refresh();
		});

		const visibilityChange = infrastructureTreeView.onDidChangeVisibility(async (event) => {
			if (event.visible) {
				try {
					await this.infrastructureProvider.ensureAvailableServicesLoaded();
				} catch (error) {
					vscode.window.showWarningMessage(`Unable to load infrastructure services: ${String(error)}`);
				}
				await this.infrastructureProvider.refresh();
			}
		});

		this.context.subscriptions.push(infrastructureTreeView, this.infrastructureProvider, refreshCommand, visibilityChange);
	}

	public registerInfrastructureCommands() {
		const startInfrastructureServiceCommand = new StartInfrastructureServiceCommand(this.infrastructureProvider);
		const startCommand = vscode.commands.registerCommand(COMMAND_INFRASTRUCTURE_START, async () => {
			await startInfrastructureServiceCommand.execute();
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_INFRASTRUCTURE_START);
		});

		const stopCommand = vscode.commands.registerCommand(COMMAND_INFRASTRUCTURE_STOP, async (item: InfrastructureItem) => {
			// CRITICAL: Capture service name at the VERY START before ANY async operation
			// This prevents issues when tree refreshes (triggered by other stop operations) invalidate the item reference
			const serviceName = item?.service?.name;

			if (!serviceName) {
				KaotoOutputChannel.logWarning('[Infrastructure] Stop command called with invalid item');
				return;
			}

			const confirmation = await confirmInfrastructureServiceStop(serviceName);

			if (confirmation !== 'Stop') {
				return;
			}

			// Block auto-refresh for the full duration of the async stop to prevent race conditions
			this.infrastructureProvider.setManualOperationInProgress(true);
			try {
				this.infrastructureProvider.markServiceStopping(serviceName);
				const result = await CamelCommandAPI.infraStop(serviceName);
				await CamelTaskFactory.createSilent(`Infrastructure Stop - ${serviceName}`, result).executeAndWait();
				this.infrastructureProvider.unregisterRunningService(serviceName);
				await sendCommandTrackingEvent(this.telemetryService, COMMAND_INFRASTRUCTURE_STOP);
			} catch (error) {
				KaotoOutputChannel.logError(`[Infrastructure] Failed to stop service "${serviceName}"`, error);
				vscode.window.showErrorMessage(`Failed to stop ${serviceName}: ${String(error)}`);
				// Do not unregister: the service may still be running; a CLI refresh will reconcile state
			} finally {
				this.infrastructureProvider.setManualOperationInProgress(false);
			}
		});

		const logsCommand = vscode.commands.registerCommand(COMMAND_INFRASTRUCTURE_LOGS, async (item: InfrastructureItem) => {
			const terminal = vscode.window.terminals.find((t) => t.name === item.service.terminalName);
			if (terminal) {
				terminal.show();
			} else {
				KaotoOutputChannel.logWarning(`Terminal with a name "${item.service.terminalName}" was not found.`);
				vscode.window.showWarningMessage(`Terminal for "${item.service.name}" was not found.`);
			}
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_INFRASTRUCTURE_LOGS);
		});

		const copyUrlCommand = vscode.commands.registerCommand(COMMAND_INFRASTRUCTURE_COPY_URL, async (item: InfrastructureItem) => {
			if (item.service.url) {
				await vscode.env.clipboard.writeText(item.service.url);
				vscode.window.showInformationMessage(`URL copied to clipboard: ${item.service.url}`);
				await sendCommandTrackingEvent(this.telemetryService, COMMAND_INFRASTRUCTURE_COPY_URL);
			} else {
				vscode.window.showWarningMessage(`No URL available for service "${item.service.name}"`);
			}
		});

		const copyPortCommand = vscode.commands.registerCommand(COMMAND_INFRASTRUCTURE_COPY_PORT, async (item: InfrastructureItem) => {
			if (item.service.port) {
				await vscode.env.clipboard.writeText(item.service.port.toString());
				vscode.window.showInformationMessage(`Port copied to clipboard: ${item.service.port}`);
				await sendCommandTrackingEvent(this.telemetryService, COMMAND_INFRASTRUCTURE_COPY_PORT);
			} else {
				vscode.window.showWarningMessage(`No port available for service "${item.service.name}"`);
			}
		});

		this.context.subscriptions.push(startCommand, stopCommand, logsCommand, copyUrlCommand, copyPortCommand);
	}
}
