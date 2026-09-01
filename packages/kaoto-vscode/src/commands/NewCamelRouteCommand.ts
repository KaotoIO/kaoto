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
import { QuickPickItem, window } from 'vscode';
import { CamelCommandAPI } from '../executors/api/CamelCommandAPI';
import { AbstractNewCamelRouteCommand } from './AbstractNewCamelRouteCommand';
import path from 'path'; // NOSONAR

export class NewCamelRouteCommand extends AbstractNewCamelRouteCommand {
	public static readonly ID_COMMAND_CAMEL_ROUTE = 'kaoto.camel.jbang.init.route';
	protected static readonly PROGRESS_NOTIFICATION_MESSAGE = 'Creating a new Route file...';

	public async create(): Promise<void> {
		const dslPick = await this.showQuickPickForCamelRouteDSL();
		if (!dslPick) {
			return;
		}
		if (!this.camelDSL) {
			this.camelDSL = this.getDSL(dslPick.label);
		}

		const wsFolder = await this.showWorkspaceFolderPick();
		if (wsFolder || this.singleWorkspaceFolder) {
			const targetFolder = await this.showDialogToPickFolder(wsFolder?.uri);
			if (targetFolder) {
				const name = await this.showInputBoxForFileName(targetFolder.fsPath);
				if (name && this.camelDSL && this.singleWorkspaceFolder) {
					const fileName = this.getFullName(name, this.camelDSL.extension);
					const filePath = this.computeFullPath(targetFolder.fsPath, fileName);
					const wsFolderTarget = wsFolder || this.singleWorkspaceFolder;
					const result = await CamelCommandAPI.init(path.relative(wsFolderTarget.uri.fsPath, filePath));
					await this.executeInitAndOpen(result, fileName, filePath, wsFolderTarget, NewCamelRouteCommand.PROGRESS_NOTIFICATION_MESSAGE);
				}
			}
		} else {
			await this.showNoWorkspaceNotification();
		}
	}

	private async showQuickPickForCamelRouteDSL(): Promise<QuickPickItem | undefined> {
		const items: QuickPickItem[] = [
			{ label: 'YAML', description: 'Camel Route using YAML DSL' },
			{ label: 'XML', description: 'Camel Route using XML DSL' },
		];
		return await window.showQuickPick(items, {
			placeHolder: 'Please select a Camel DSL.',
			title: 'DSL selection...',
		});
	}
}
