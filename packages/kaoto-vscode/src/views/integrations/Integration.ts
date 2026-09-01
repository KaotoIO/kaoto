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
import { TreeItem, Uri, TreeItemCollapsibleState } from 'vscode';
import { COMMAND_OPEN_WITH_KAOTO } from '../../constants';
import { IntegrationFileDSL, IntegrationFileIcon, IntegrationFileType } from '../../types/IntegrationTreeItemType';

export class Integration extends TreeItem {
	private static readonly CONTEXT_INTEGRATION = 'integration';
	private static readonly CONTEXT_INTEGRATION_STANDALONE_CHILD = 'integration-standalone-child';
	private static readonly CONTEXT_INTEGRATION_MAVEN_CHILD = 'integration-maven-child';

	private static resolveContextValue(isTopLevelWithinWorkspace: boolean, isUnderMavenRoot: boolean): string {
		const topLevelContext = isTopLevelWithinWorkspace ? Integration.CONTEXT_INTEGRATION : Integration.CONTEXT_INTEGRATION_STANDALONE_CHILD;
		return isUnderMavenRoot ? Integration.CONTEXT_INTEGRATION_MAVEN_CHILD : topLevelContext;
	}

	constructor(
		public readonly name: string,
		public readonly filename: string,
		public readonly filepath: Uri,
		public collapsibleState: TreeItemCollapsibleState,
		public readonly type: IntegrationFileType,
		public readonly dsl: IntegrationFileDSL,
		public readonly icon: IntegrationFileIcon,
		public readonly description: string,
		public readonly isUnderMavenRoot: boolean = false,
		public readonly isTopLevelWithinWorkspace: boolean = true,
	) {
		super(filename, collapsibleState);
		this.tooltip = this.filepath.fsPath;
		this.resourceUri = this.filepath;
		this.iconPath = icon;
		this.description = description;

		this.contextValue = Integration.resolveContextValue(isTopLevelWithinWorkspace, isUnderMavenRoot);

		this.command = { command: COMMAND_OPEN_WITH_KAOTO, title: 'Open with Kaoto', arguments: [this.filepath] };
	}
}
