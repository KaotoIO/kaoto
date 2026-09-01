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
import { IntegrationFileIcon } from '../../types/IntegrationTreeItemType';
import { TreeItem, TreeItemCollapsibleState } from 'vscode';

export class Route extends TreeItem {
	private static readonly CONTEXT_ROUTE: string = 'route';
	private static readonly MISSING_ID_DESCRIPTION: string = '(missing id)';
	private static readonly MISSING_ID_TOOLTIP: string = 'This route has no id.';

	private static resolveDescription(name: string | undefined, providedDescription: string): string {
		return name ? providedDescription : Route.MISSING_ID_DESCRIPTION;
	}

	constructor(
		public readonly name: string,
		public readonly description: string,
		public readonly icon: IntegrationFileIcon,
	) {
		super(name, TreeItemCollapsibleState.None);

		this.description = Route.resolveDescription(name, description);
		if (!name) {
			this.tooltip = Route.MISSING_ID_TOOLTIP;
		}

		this.iconPath = icon;
		this.contextValue = Route.CONTEXT_ROUTE;
	}
}
