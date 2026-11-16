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
import { QuickPickItem, Uri, window } from 'vscode';
import { StarterTemplateId } from '@kaoto/camel-catalog/types';
import { AbstractNewCamelRouteCommand } from './AbstractNewCamelRouteCommand';
import { CamelRouteDSL } from './AbstractCamelCommand';
import { StarterTemplateService } from '../services/StarterTemplateService';

/**
 * The Kamelet types the user can pick. The type also ends the name of the Kamelet and of its file.
 */
type KameletType = 'source' | 'sink' | 'action';

interface KameletTypeItem extends QuickPickItem {
	type: KameletType;
}

/**
 * The starter template of each Kamelet type.
 */
const KAMELET_TEMPLATES: Record<KameletType, StarterTemplateId> = {
	source: 'kamelet-source-yaml',
	sink: 'kamelet-sink-yaml',
	action: 'kamelet-action-yaml',
};

export class NewCamelKameletCommand extends AbstractNewCamelRouteCommand {
	public static readonly ID_COMMAND_CAMEL_KAMELET_YAML = 'kaoto.camel.jbang.init.kamelet.yaml';

	private kameletType: string = '';

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
				const picked = await this.showQuickPickForKameletType();
				if (picked) {
					this.kameletType = picked.type;
					const name = await this.showInputBoxForFileName(targetFolder.fsPath);
					if (name && this.camelDSL) {
						const fileName = this.getKameletFullName(name, this.kameletType, this.camelDSL.extension);
						const fileUri = Uri.file(this.computeFullPath(targetFolder.fsPath, fileName));
						// Camel resolves a local Kamelet by its file name, so the Kamelet is named after the file.
						const kameletName = `${name}-${this.kameletType}`;
						await this.createFromStarterTemplateAndOpen(this.starterTemplates, KAMELET_TEMPLATES[picked.type], fileUri, kameletName);
					}
				}
			}
		} else {
			await this.showNoWorkspaceNotification();
		}
	}

	protected getDSL(dsl: string): CamelRouteDSL | undefined {
		if (dsl === 'YAML') {
			return { language: 'YAML', extension: 'kamelet.yaml', placeHolder: 'example' };
		} else {
			return undefined;
		}
	}

	protected async showInputBoxForFileName(targetFolder?: string): Promise<string> {
		return (
			(await window.showInputBox({
				prompt: this.fileNameInputPrompt,
				placeHolder: this.camelDSL?.placeHolder,
				validateInput: (fileName) => {
					return this.validateCamelFileName(`${fileName}-${this.kameletType}`, targetFolder);
				},
			})) ?? ''
		);
	}

	protected async showQuickPickForKameletType(): Promise<KameletTypeItem | undefined> {
		const items: KameletTypeItem[] = [
			{
				type: 'source',
				label: 'source',
				description: 'A route that produces data.',
				detail: 'You use a source Kamelet to retrieve data from a component.',
			},
			{ type: 'sink', label: 'sink', description: 'A route that consumes data.', detail: 'You use a sink Kamelet to send data to a component.' },
			{
				type: 'action',
				label: 'action',
				description: 'A route that performs an action on data.',
				detail: 'You can use an action Kamelet to manipulate data when it passes from a source Kamelet to a sink Kamelet.',
			},
		];
		return await window.showQuickPick(items, {
			placeHolder: 'Please select a Kamelet type.',
		});
	}

	protected getKameletFullName(name: string, type: string, suffix: string): string {
		return `${name}-${type}.${suffix}`;
	}
}
