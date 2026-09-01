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

		return [statusText, serviceText, urlText, portText, argsText].filter(Boolean).join('\n');
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

		if (service.status === 'starting') {
			if (service.port) {
				return `Starting on :${service.port}${externalLabel}`;
			}

			return `Starting...${externalLabel}`;
		}

		if (service.status === 'stopping') {
			if (service.port) {
				return `Stopping on :${service.port}${externalLabel}`;
			}

			return `Stopping...${externalLabel}`;
		}

		if (service.port) {
			return `:${service.port}${externalLabel}`;
		}

		if (service.description) {
			return `${service.description}${externalLabel}`;
		}

		return externalLabel.trim();
	}
}
