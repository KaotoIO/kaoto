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
import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import { Route } from './Route';
import { join } from 'path'; // NOSONAR
import { ParentItem } from './ParentItem';

export class ChildItem extends TreeItem {
	constructor(
		public readonly parentIntegration: ParentItem,
		label: string,
		state: TreeItemCollapsibleState,
		baseContext: string,
		route?: Route,
	) {
		super(label, state);

		if (route) {
			const { icon, context, tooltip, description } = ChildItem.getRouteState(route);
			this.iconPath = icon;
			this.contextValue = `${baseContext} ${context}`;
			this.tooltip = tooltip;
			this.description = description;
		}
	}

	private static getRouteState(route: Route): {
		icon: string;
		context: string;
		tooltip: string;
		description: string;
	} {
		const base = join(__filename, '..', '..', '..', 'icons', 'deployments');
		const state = route.state ?? '';

		const visuals: Record<string, { icon: string; context: string }> = {
			Started: {
				icon: join(base, 'route-started.png'),
				context: 'startDisabled resumeDisabled suspendEnabled stopEnabled',
			},
			Suspended: {
				icon: join(base, 'route-suspended.png'),
				context: 'startDisabled resumeEnabled suspendDisabled stopEnabled',
			},
			Stopped: {
				icon: join(base, 'route-stopped.png'),
				context: 'startEnabled resumeDisabled suspendDisabled stopDisabled',
			},
		};

		const visual = visuals[state] || {
			icon: join(base, 'route-default.png'),
			context: 'startDisabled resumeDisabled suspendDisabled stopDisabled',
		};

		const description = state === 'Started' ? `${state} (${route.uptime})` : state;
		const tooltip = `${route.statistics.exchangesTotal} Total - ${route.statistics.exchangesFailed} Fail - ${route.statistics.exchangesInflight} Inflight`;

		return { ...visual, description, tooltip };
	}
}
