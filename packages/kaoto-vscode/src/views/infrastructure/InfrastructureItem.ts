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

import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';

export interface RunningInfrastructureService {
	name: string;
	port?: number;
	url?: string;
	uiUrl?: string;
	uiSupported?: boolean;
	description?: string;
	args: string[];
	terminalName: string;
	status: 'starting' | 'running' | 'stopping';
	isExternal?: boolean;
}

export class InfrastructureItem extends TreeItem {
	constructor(public readonly service: RunningInfrastructureService) {
		super(service.name, TreeItemCollapsibleState.None);

		// Build context value with availability flags
		let contextValue = service.isExternal ? 'infrastructure-service-external' : 'infrastructure-service';
		if (service.url) {
			contextValue += '-has-url';
		}
		if (service.port) {
			contextValue += '-has-port';
		}
		if (service.uiUrl) {
			contextValue += '-has-ui-url';
		}
		this.contextValue = contextValue;

		this.iconPath = new ThemeIcon(service.status === 'running' ? 'server-environment' : 'loading~spin');

		this.description = this.buildDescription(service);
		this.tooltip = this.buildTooltip(service);
	}

	private buildTooltip(service: RunningInfrastructureService): string {
		const statusText = this.getStatusText(service.status);
		const serviceText = service.description ? `Service: ${service.description}` : `Service: ${service.name}`;
		const urlText = service.url ? `URL: ${service.url}` : undefined;
		const portText = service.port ? `Port: ${service.port}` : undefined;
		const argsText = service.args.length > 0 ? `Args: ${service.args.join(' ')}` : undefined;
		const uiText = this.buildUiTooltipText(service);

		return [statusText, serviceText, urlText, portText, argsText, uiText].filter(Boolean).join('\n');
	}

	private buildUiTooltipText(service: RunningInfrastructureService): string | undefined {
		if (service.uiUrl) {
			return `UI: ${service.uiUrl}`;
		}
		return service.uiSupported ? 'UI: available but not running' : undefined;
	}

	private getStatusText(status: 'starting' | 'running' | 'stopping'): string {
		switch (status) {
			case 'starting':
				return 'Status: Starting';
			case 'stopping':
				return 'Status: Stopping';
			case 'running':
				return 'Status: Running';
		}
	}

	private buildDescription(service: RunningInfrastructureService): string {
		const externalLabel = service.isExternal ? ' (external)' : '';
		const uiHint = !service.uiUrl && service.uiSupported ? ' · UI available but not running' : '';

		return `${this.buildBaseDescription(service)}${externalLabel}${uiHint}`.trim();
	}

	private buildBaseDescription(service: RunningInfrastructureService): string {
		if (service.status === 'starting') {
			return service.port ? `Starting on :${service.port}` : 'Starting...';
		}

		if (service.status === 'stopping') {
			return service.port ? `Stopping on :${service.port}` : 'Stopping...';
		}

		if (service.port) {
			return `:${service.port}`;
		}

		return service.description ?? '';
	}
}
