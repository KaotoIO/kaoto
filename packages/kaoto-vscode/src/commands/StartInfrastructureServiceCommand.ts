/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
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
import { COMMAND_INFRASTRUCTURE_START } from '../constants';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { CamelCommandAPI } from '../executors/api/CamelCommandAPI';
import { CamelTaskFactory } from '../tasks/CamelTaskFactory';
import { InfrastructureProvider } from '../views/infrastructure/InfrastructureProvider';
import { DockerErrorDetector } from '../utils/DockerErrorDetector';

export class StartInfrastructureServiceCommand {
	public static readonly ID_COMMAND = COMMAND_INFRASTRUCTURE_START;

	constructor(private readonly infrastructureProvider: InfrastructureProvider) {}

	private getServiceTargetUrl(service: { url?: string; port?: number }): string | undefined {
		return service.url ?? (service.port ? `localhost:${service.port}` : undefined);
	}

	private showServiceAlreadyRunningMessage(serviceName: string, target?: string): void {
		vscode.window.showInformationMessage(
			target ? `Infrastructure service "${serviceName}" is already running at ${target}.` : `Infrastructure service "${serviceName}" is already running.`,
		);
	}

	public async execute(): Promise<void> {
		// Prevent starting a new service if one is already being started
		if (this.infrastructureProvider.isServiceStarting()) {
			return;
		}

		try {
			// Set the starting flag to disable the button
			this.infrastructureProvider.setStartingService(true);

			const selectedService = await this.selectService();
			if (!selectedService) {
				return;
			}

			const shouldContinue = await this.handleExistingService(selectedService.label);
			if (!shouldContinue) {
				return;
			}

			await this.configureAndStartService(selectedService);
		} catch (error) {
			this.handleError(error);
		} finally {
			this.infrastructureProvider.setStartingService(false);
		}
	}

	private async selectService(): Promise<{ label: string; description: string } | undefined> {
		const services = await this.infrastructureProvider.ensureAvailableServicesLoaded();
		if (services.length === 0) {
			vscode.window.showInformationMessage('No infrastructure services are available from Camel JBang infra.');
			return undefined;
		}

		return vscode.window.showQuickPick(
			services.map((service) => ({
				label: service.name,
				description: service.description ?? '',
			})),
			{
				title: 'Select infrastructure service',
				placeHolder: 'Choose a Camel Infra service to start',
			},
		);
	}

	private async handleExistingService(serviceName: string): Promise<boolean> {
		// Fast check: in-memory state first
		const existingService = this.infrastructureProvider.getRunningService(serviceName);
		if (existingService) {
			if (existingService.isExternal) {
				return this.handleExternalServiceConflict(serviceName, existingService);
			} else {
				// It's a managed service already running
				const target = this.getServiceTargetUrl(existingService);
				this.showServiceAlreadyRunningMessage(serviceName, target);
				return false;
			}
		}

		// Slower check: CLI state (only if not in memory)
		const cliRunningService = await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: `Checking if ${serviceName} is already running...`,
				cancellable: false,
			},
			async () => this.infrastructureProvider.getCliRunningService(serviceName),
		);

		if (cliRunningService) {
			// Service is running but not yet tracked - register it and handle inline
			this.infrastructureProvider.registerRunningService({
				name: cliRunningService.name,
				description: cliRunningService.description ?? '',
				port: cliRunningService.port,
				url: cliRunningService.url,
				args: [],
				terminalName: `${cliRunningService.name} (external)`,
				status: 'running',
				isExternal: true,
			});

			// Handle the external service conflict inline
			return this.handleExternalServiceConflict(serviceName, {
				port: cliRunningService.port,
				url: cliRunningService.url,
				isExternal: true,
			});
		}

		return true;
	}

	private async handleExternalServiceConflict(serviceName: string, existingService: { port?: number; url?: string; isExternal?: boolean }): Promise<boolean> {
		const action = await vscode.window.showWarningMessage(
			`Infrastructure service "${serviceName}" is already running externally at ${this.getServiceTargetUrl(existingService) || 'unknown location'}. What would you like to do?`,
			'Use Existing',
			'Stop and Restart',
			'Cancel',
		);

		if (action === 'Cancel' || !action) {
			return false;
		}

		if (action === 'Use Existing') {
			return false;
		}

		// User chose "Stop and Restart" - stop the external service first
		try {
			await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Stopping external ${serviceName}...`,
					cancellable: false,
				},
				async () => {
					const result = await CamelCommandAPI.infraStop(serviceName);
					const stopTask = CamelTaskFactory.createSilent(`Infrastructure Stop - ${serviceName}`, result);
					await stopTask.executeAndWait();
				},
			);

			// Poll until the CLI no longer reports the service, up to a bounded timeout
			const deadline = Date.now() + 15000;
			while (Date.now() < deadline) {
				if (!(await this.infrastructureProvider.getCliRunningService(serviceName))) {
					break;
				}
				await new Promise((resolve) => setTimeout(resolve, 500));
			}

			// Remove from tracked services
			this.infrastructureProvider.unregisterRunningService(serviceName);
			return true;
		} catch (error) {
			KaotoOutputChannel.logError(`[Infrastructure] Failed to stop external service "${serviceName}"`, error);
			vscode.window.showErrorMessage(`Failed to stop external service: ${String(error)}`);
			return false;
		}
	}

	private async configureAndStartService(selectedService: { label: string; description: string }): Promise<void> {
		const portValue = await vscode.window.showInputBox({
			title: `Configure ${selectedService.label}`,
			prompt: 'Enter a port number or leave EMPTY to use the default',
			ignoreFocusOut: true,
			validateInput: (value) => {
				if (!value) {
					return undefined;
				}
				const port = Number(value);
				return Number.isInteger(port) && port >= 1 && port <= 65535 ? undefined : 'Port must be between 1 and 65535.';
			},
		});

		if (portValue === undefined) {
			return;
		}

		const args = [...CamelCommandAPI.getInfraDefaultArgs()];
		const port = portValue ? Number(portValue) : undefined;
		const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

		const result = await CamelCommandAPI.infraRun(selectedService.label, port, args, cwd);
		const runTask = CamelTaskFactory.createBackgroundSilent(`Infrastructure - ${selectedService.label}`, result);

		await runTask.execute();

		this.infrastructureProvider.registerRunningService({
			name: selectedService.label,
			description: selectedService.description,
			port,
			url: this.getServiceTargetUrl({ port }),
			args,
			terminalName: runTask.name,
			status: 'starting',
		});
	}

	private handleError(error: unknown): void {
		const errorMessage = String(error);
		const dockerError = DockerErrorDetector.detectDockerError(errorMessage);

		if (dockerError) {
			KaotoOutputChannel.logError('[Infrastructure] Docker environment error', error);
			vscode.window.showErrorMessage(dockerError.userMessage);
		} else {
			KaotoOutputChannel.logError('[Infrastructure] Failed to start infrastructure service.', error);
			vscode.window.showWarningMessage(`Unable to start infrastructure service: ${errorMessage}`);
		}
	}
}
