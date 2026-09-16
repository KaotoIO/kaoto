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
import { COMMAND_CLOSE_SOURCE, COMMAND_OPEN_SOURCE, COMMAND_OPEN_WITH_KAOTO, COMMAND_REDO, COMMAND_UNDO } from '../../constants';
import { sendCommandTrackingEvent } from './TrackingEvent';
import { IRegistrar } from './IRegistrar';

export interface ActiveKaotoDocument {
	readonly activeDocumentUri: vscode.Uri | undefined;
	applyHistory(command: 'undo' | 'redo'): Promise<void>;
}

export class EditorRegistrar implements IRegistrar {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly editors: ActiveKaotoDocument,
		private readonly telemetryService: TelemetryService | undefined,
	) {}

	async register(): Promise<void> {
		this.registerUndoRedoCommands();
		await this.registerToggleSourceCode();
		this.registerOpenWithKaoto();
	}

	/** Canvas shortcuts use the same native text history as the source editor. */
	public registerUndoRedoCommands() {
		this.context.subscriptions.push(
			vscode.commands.registerCommand(COMMAND_UNDO, async () => {
				await this.editors.applyHistory('undo');
			}),
			vscode.commands.registerCommand(COMMAND_REDO, async () => {
				await this.editors.applyHistory('redo');
			}),
		);
	}

	public async registerToggleSourceCode() {
		const OPEN_SOURCE_COMMAND_ID: string = COMMAND_OPEN_SOURCE;
		const CLOSE_SOURCE_COMMAND_ID: string = COMMAND_CLOSE_SOURCE;

		this.context.subscriptions.push(
			vscode.commands.registerCommand(OPEN_SOURCE_COMMAND_ID, async () => {
				if (this.editors.activeDocumentUri !== undefined) {
					const doc = await vscode.workspace.openTextDocument(this.editors.activeDocumentUri);
					await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
					await sendCommandTrackingEvent(this.telemetryService, OPEN_SOURCE_COMMAND_ID);
				}
			}),
			vscode.commands.registerCommand(CLOSE_SOURCE_COMMAND_ID, async () => {
				await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
				await sendCommandTrackingEvent(this.telemetryService, CLOSE_SOURCE_COMMAND_ID);
			}),
		);
	}

	public registerOpenWithKaoto() {
		this.context.subscriptions.push(
			vscode.commands.registerCommand(COMMAND_OPEN_WITH_KAOTO, async (uri: vscode.Uri) => {
				await vscode.commands.executeCommand('vscode.openWith', uri, 'webviewEditorsKaoto');
				await sendCommandTrackingEvent(this.telemetryService, COMMAND_OPEN_WITH_KAOTO);
			}),
		);
	}
}
