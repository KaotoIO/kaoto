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
	COMMAND_DEPLOYMENTS_LOGS,
	COMMAND_DEPLOYMENTS_REFRESH,
	COMMAND_DEPLOYMENTS_ROUTE_RESUME,
	COMMAND_DEPLOYMENTS_ROUTE_START,
	COMMAND_DEPLOYMENTS_ROUTE_STOP,
	COMMAND_DEPLOYMENTS_ROUTE_SUSPEND,
	COMMAND_DEPLOYMENTS_STOP,
	VIEW_DEPLOYMENTS,
} from '../../constants';
import { DeploymentsProvider } from '../../views/deployments/DeploymentsProvider';
import { ParentItem } from '../../views/deployments/ParentItem';
import { ChildItem } from '../../views/deployments/ChildItem';
import { RouteOperation } from '../../types/RouteOperation';
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';
import { CamelTaskFactory } from '../../tasks/CamelTaskFactory';
import { PortManager } from '../../services/PortManager';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { sendCommandTrackingEvent } from './TrackingEvent';
import { IRegistrar } from './IRegistrar';

export class DeploymentsRegistrar implements IRegistrar {
	private deploymentsProvider!: DeploymentsProvider;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly telemetryService: TelemetryService | undefined,
		private readonly portManager: PortManager,
	) {}

	register(): void {
		this.registerDeploymentsView(this.portManager);
		this.registerDeploymentsIntegrationCommands();
		this.registerDeploymentsRouteCommands();
	}

	public registerDeploymentsView(portManager: PortManager) {
		this.deploymentsProvider = new DeploymentsProvider(portManager);

		const deploymentsTreeView = vscode.window.createTreeView(VIEW_DEPLOYMENTS, {
			treeDataProvider: this.deploymentsProvider,
			showCollapseAll: true,
		});

		const deploymentsRefreshCommand = vscode.commands.registerCommand(COMMAND_DEPLOYMENTS_REFRESH, () => this.deploymentsProvider.refresh());
		const deploymentsDispose = {
			dispose: () => this.deploymentsProvider.dispose(),
		};

		const refreshVisibilityChange = deploymentsTreeView.onDidChangeVisibility(async (event) => {
			if (event.visible) {
				await this.deploymentsProvider.refresh();
			} else {
				this.deploymentsProvider.dispose();
			}
		});

		this.context.subscriptions.push(deploymentsTreeView, deploymentsDispose, deploymentsRefreshCommand, refreshVisibilityChange);
	}

	public registerDeploymentsIntegrationCommands() {
		this.context.subscriptions.push(
			vscode.commands.registerCommand(COMMAND_DEPLOYMENTS_STOP, async (integration: ParentItem) => {
				const stopResult = await CamelCommandAPI.stop(integration.label as string);
				const stopTask = CamelTaskFactory.createSilent(`Stop - ${integration.label as string}`, stopResult);
				await stopTask.executeAndWait();
				await sendCommandTrackingEvent(this.telemetryService, COMMAND_DEPLOYMENTS_STOP);
			}),
			vscode.commands.registerCommand(COMMAND_DEPLOYMENTS_LOGS, async (integration: ParentItem) => {
				const portSuffix = `::${integration.port}`;
				const terminal = vscode.window.terminals.find((t) => t.name.startsWith('Running - ') && t.name.endsWith(portSuffix));
				if (terminal) {
					terminal.show();
				} else {
					KaotoOutputChannel.logWarning(`Terminal for integration on port ${integration.port} was not found.`);
				}
				await sendCommandTrackingEvent(this.telemetryService, COMMAND_DEPLOYMENTS_LOGS);
			}),
		);
	}

	public registerDeploymentsRouteCommands() {
		const registerRouteCommand = (commandId: string, operation: RouteOperation, expectedState: 'Started' | 'Stopped' | 'Suspended') =>
			vscode.commands.registerCommand(commandId, async (route: ChildItem) => {
				const integrationName = route.parentIntegration.label as string;
				const routeName = route.label as string;
				const result = await CamelCommandAPI.routeOperation(operation, integrationName, routeName);
				const task = CamelTaskFactory.createSilent(`${operation} - ${integrationName}: ${routeName}`, result);
				await task.executeAndWait();
				await this.deploymentsProvider.waitUntilRouteHasState(route.parentIntegration.port, routeName, expectedState);
				await this.deploymentsProvider.refresh();
				await sendCommandTrackingEvent(this.telemetryService, commandId);
			});

		this.context.subscriptions.push(
			registerRouteCommand(COMMAND_DEPLOYMENTS_ROUTE_START, RouteOperation.start, 'Started'),
			registerRouteCommand(COMMAND_DEPLOYMENTS_ROUTE_STOP, RouteOperation.stop, 'Stopped'),
			registerRouteCommand(COMMAND_DEPLOYMENTS_ROUTE_RESUME, RouteOperation.resume, 'Started'),
			registerRouteCommand(COMMAND_DEPLOYMENTS_ROUTE_SUSPEND, RouteOperation.suspend, 'Suspended'),
		);
	}
}
