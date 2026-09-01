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
import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';

export class ParentItem extends TreeItem {
	private readonly _port: number;

	constructor(label: string, state: TreeItemCollapsibleState, contextValue: string, port: number, description?: string, tooltip?: string) {
		super(label, state);
		this.iconPath = ThemeIcon.File;
		this.contextValue = contextValue;
		this.description = description;
		this.tooltip = tooltip;
		this._port = port;
	}

	public get port(): number {
		return this._port;
	}
}
