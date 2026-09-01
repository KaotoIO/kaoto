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
import * as vscode from 'vscode';
import { TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import { COMMAND_OPENAPI_DELETE, COMMAND_OPENAPI_IMPORT, COMMAND_OPENAPI_REFRESH, COMMAND_OPENAPI_SHOW_SOURCE, VIEW_OPENAPI } from '../../constants';
import { OpenApiProvider } from '../../views/openapi/OpenApiProvider';
import { AbstractFolderTreeProvider } from '../../views/shared/AbstractFolderTreeProvider';
import { ImportOpenApiCommand } from '../../commands/ImportOpenApiCommand';
import { confirmFileDeleteDialog } from '../../utils/Modals';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { sendCommandTrackingEvent } from './TrackingEvent';
import { IRegistrar } from './IRegistrar';

export class OpenApiRegistrar implements IRegistrar {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly telemetryService: TelemetryService | undefined,
	) {}

	register(): void {
		this.registerOpenApiView();
		this.registerOpenApiImportCommand();
	}

	public registerOpenApiView() {
		const openApiProvider = new OpenApiProvider();
		const openApiTreeView = vscode.window.createTreeView(VIEW_OPENAPI, {
			treeDataProvider: openApiProvider,
			showCollapseAll: true,
		});
		const dispose = {
			dispose: () => openApiProvider.dispose(),
		};
		const refreshCommand = vscode.commands.registerCommand(COMMAND_OPENAPI_REFRESH, () => openApiProvider.refresh());
		this.context.subscriptions.push(openApiTreeView, dispose, refreshCommand);

		this.registerViewItemContextMenu(openApiProvider, COMMAND_OPENAPI_SHOW_SOURCE, COMMAND_OPENAPI_DELETE);
	}

	public registerOpenApiImportCommand() {
		const importCommand = vscode.commands.registerCommand(COMMAND_OPENAPI_IMPORT, async () => {
			await new ImportOpenApiCommand().create();
			await sendCommandTrackingEvent(this.telemetryService, COMMAND_OPENAPI_IMPORT);
		});

		this.context.subscriptions.push(importCommand);
	}

	private registerViewItemContextMenu(provider: AbstractFolderTreeProvider<any>, showSourceCommandId: string, deleteCommandId: string) {
		const showSourceCommand = vscode.commands.registerCommand(showSourceCommandId, async (item: vscode.TreeItem) => {
			if (!item.resourceUri) {
				return;
			}
			await vscode.window.showTextDocument(item.resourceUri);
			await sendCommandTrackingEvent(this.telemetryService, showSourceCommandId);
		});

		const deleteCommand = vscode.commands.registerCommand(deleteCommandId, async (item: vscode.TreeItem) => {
			if (!item.resourceUri) {
				return;
			}
			const confirmation = await confirmFileDeleteDialog(item.resourceUri.fsPath);
			if (confirmation) {
				await vscode.workspace.fs.delete(item.resourceUri, { recursive: true });
				// ensure tree refresh (folder deletions may not trigger file-pattern watcher)
				provider.refresh();
				KaotoOutputChannel.logInfo(`Item '${item.resourceUri.fsPath}' was deleted.`);
			}
			await sendCommandTrackingEvent(this.telemetryService, deleteCommandId);
		});

		this.context.subscriptions.push(showSourceCommand, deleteCommand);
	}
}
