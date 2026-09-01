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
import { TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

export class File extends TreeItem {
	private static readonly CONTEXT_FILE: string = 'file';

	constructor(
		public readonly fileUri: Uri,
		displayLabel: string,
	) {
		super(displayLabel, TreeItemCollapsibleState.None);
		this.resourceUri = fileUri;
		this.tooltip = fileUri.fsPath;
		this.command = { command: 'vscode.open', title: 'Open File', arguments: [fileUri] };
		this.contextValue = File.CONTEXT_FILE;
	}
}
