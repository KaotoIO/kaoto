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
import * as vscode from 'vscode';
import { TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import { AbstractFolderTreeProvider, IFolderTreeItem } from '../../views/shared/AbstractFolderTreeProvider';
import { confirmFileDeleteDialog } from '../../utils/Modals';
import { KaotoOutputChannel } from '../KaotoOutputChannel';
import { sendCommandTrackingEvent } from './TrackingEvent';

/** The members of a file view provider that its Show Source and Delete commands use */
export type ViewItemContextMenuProvider = Pick<
	AbstractFolderTreeProvider<IFolderTreeItem>,
	'VIEW_ITEM_SHOW_SOURCE_COMMAND_ID' | 'VIEW_ITEM_DELETE_COMMAND_ID' | 'refresh'
>;

/**
 * Registers the Show Source and Delete commands of the items of a file view, under the command IDs of its provider.
 * @param context The extension context that keeps the commands
 * @param telemetryService The telemetry service that tracks the commands, if any
 * @param provider The provider of the view
 */
export function registerViewItemContextMenu(
	context: vscode.ExtensionContext,
	telemetryService: TelemetryService | undefined,
	provider: ViewItemContextMenuProvider,
): void {
	const showSourceCommandId = provider.VIEW_ITEM_SHOW_SOURCE_COMMAND_ID;
	const deleteCommandId = provider.VIEW_ITEM_DELETE_COMMAND_ID;

	const showSourceCommand = vscode.commands.registerCommand(showSourceCommandId, async (item: vscode.TreeItem) => {
		if (!item.resourceUri) {
			return;
		}
		await vscode.window.showTextDocument(item.resourceUri);
		await sendCommandTrackingEvent(telemetryService, showSourceCommandId);
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
		await sendCommandTrackingEvent(telemetryService, deleteCommandId);
	});

	context.subscriptions.push(showSourceCommand, deleteCommand);
}
