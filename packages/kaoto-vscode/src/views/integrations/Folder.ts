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
import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';

export class Folder extends TreeItem {
	private static readonly CONTEXT_FOLDER = 'folder';
	private static readonly CONTEXT_FOLDER_MAVEN_CHILD = 'folder-maven-child';
	private static readonly CONTEXT_FOLDER_MAVEN_ROOT = 'folder-maven-root';

	private static resolveContextValue(isUnderMavenRoot: boolean, isMavenRoot: boolean): string {
		if (isMavenRoot) {
			return Folder.CONTEXT_FOLDER_MAVEN_ROOT;
		}
		return isUnderMavenRoot ? Folder.CONTEXT_FOLDER_MAVEN_CHILD : Folder.CONTEXT_FOLDER;
	}

	private static resolveIcon(isMavenRoot: boolean, isWorkspaceRoot?: boolean): ThemeIcon {
		if (isMavenRoot) {
			return new ThemeIcon('folder-library');
		}
		if (isWorkspaceRoot) {
			return new ThemeIcon('file-submodule');
		}
		return new ThemeIcon('symbol-folder');
	}

	constructor(
		public readonly labelName: string,
		public readonly folderUri: Uri,
		public readonly tooltipText?: string,
		public readonly isUnderMavenRoot: boolean = false,
		public readonly isMavenRoot: boolean = false,
		public readonly isWorkspaceRoot: boolean = false,
	) {
		super(labelName, TreeItemCollapsibleState.Collapsed);
		this.resourceUri = folderUri;
		this.tooltip = tooltipText ?? folderUri.fsPath;

		this.iconPath = Folder.resolveIcon(this.isMavenRoot, this.isWorkspaceRoot);

		this.description = this.isMavenRoot ? 'M' : undefined;
		this.contextValue = Folder.resolveContextValue(this.isUnderMavenRoot, this.isMavenRoot);
	}
}
