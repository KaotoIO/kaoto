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
import { Uri } from 'vscode';
import { AbstractFolder } from '../shared/AbstractFolder';

export class TestFolder extends AbstractFolder {
	constructor(labelName: string, folderUri: Uri, isUnderMavenRoot: boolean = false, isMavenRoot: boolean = false, isWorkspaceRoot: boolean = false) {
		super(labelName, folderUri, isUnderMavenRoot, isMavenRoot, isWorkspaceRoot);
	}

	protected getContextPrefix(): string {
		return 'test-folder';
	}
}
