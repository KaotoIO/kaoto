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
import { AbstractNewCamelRouteCommand } from './AbstractNewCamelRouteCommand';
import { CamelRouteDSL } from './AbstractCamelCommand';
import { StarterTemplateService } from '../services/StarterTemplateService';

export class NewCamelPipeCommand extends AbstractNewCamelRouteCommand {
	public static readonly ID_COMMAND_CAMEL_PIPE_YAML = 'kaoto.camel.jbang.init.pipe.yaml';

	constructor(
		private readonly starterTemplates: StarterTemplateService,
		dsl: string,
	) {
		super(dsl);
	}

	public async create(): Promise<void> {
		const wsFolder = await this.showWorkspaceFolderPick();
		if (wsFolder || this.singleWorkspaceFolder) {
			const targetFolder = await this.showDialogToPickFolder(wsFolder?.uri);
			if (targetFolder) {
				const name = await this.showInputBoxForFileName(targetFolder.fsPath);
				if (name && this.camelDSL) {
					const fileName = this.getFullName(name, this.camelDSL.extension);
					const fileUri = Uri.file(this.computeFullPath(targetFolder.fsPath, fileName));
					await this.createFromStarterTemplateAndOpen(this.starterTemplates, 'pipe-yaml', fileUri, name);
				}
			}
		} else {
			await this.showNoWorkspaceNotification();
		}
	}

	protected getDSL(dsl: string): CamelRouteDSL | undefined {
		if (dsl === 'YAML') {
			return { language: 'YAML', extension: 'pipe.yaml', placeHolder: 'example' };
		} else {
			return undefined;
		}
	}
}
