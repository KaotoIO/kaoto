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
import { TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { join } from 'path';

export class OpenApiFile extends TreeItem {
	constructor(
		public readonly name: string,
		public readonly filepath: string,
		public readonly version: string,
	) {
		super(name, TreeItemCollapsibleState.None);
		this.tooltip = `Open API - version ${this.version}\n${this.filepath}`;
		this.description = this.version;
		this.resourceUri = Uri.file(this.filepath);
		this.iconPath = {
			light: Uri.file(join(__filename, '..', '..', '..', 'icons', 'openapi', 'openapi-light.svg')),
			dark: Uri.file(join(__filename, '..', '..', '..', 'icons', 'openapi', 'openapi-dark.svg')),
		};
		this.command = { command: 'vscode.open', title: 'Open', arguments: [this.resourceUri] };
		this.contextValue = 'openapi';
	}
}
