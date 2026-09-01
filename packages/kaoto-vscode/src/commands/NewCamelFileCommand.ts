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
import { QuickPickItem, commands, window } from 'vscode';
import { COMMAND_CAMEL_KAMELET_YAML, COMMAND_CAMEL_PIPE_YAML, COMMAND_CAMEL_ROUTE } from '../constants';

export class NewCamelFileCommand {
	public async create(): Promise<void> {
		const selection = await this.showQuickPickForCamelFileType();
		if (selection) {
			const cmd = this.getCamelRouteCommandFromSelection(selection.label);
			if (cmd) {
				await commands.executeCommand(cmd);
			}
		}
	}

	protected async showQuickPickForCamelFileType(): Promise<QuickPickItem> {
		const items: QuickPickItem[] = [
			{ label: 'Camel Route', description: 'Camel Route using YAML or XML DSL' },
			{ label: 'Kamelet', description: 'Kamelet using YAML DSL' },
			{ label: 'Pipe', description: 'Custom Resource Pipe using YAML DSL' },
		];
		return (
			(await window.showQuickPick(items, {
				placeHolder: 'Please select a Camel File type.',
				title: 'New Camel File...',
			})) || { label: 'Problem occurred: Try again.' }
		);
	}

	protected getCamelRouteCommandFromSelection(selection: string): string | undefined {
		switch (selection) {
			case 'Camel Route':
				return COMMAND_CAMEL_ROUTE;
			case 'Kamelet':
				return COMMAND_CAMEL_KAMELET_YAML;
			case 'Pipe':
				return COMMAND_CAMEL_PIPE_YAML;
			default:
				break;
		}
		return undefined;
	}
}
