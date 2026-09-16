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
import { VIEW_HELP, VIEW_INTEGRATIONS, COMMAND_INTEGRATIONS_REFRESH } from '../constants';
import { KaotoOutputChannel } from './KaotoOutputChannel';
import { HelpFeedbackProvider } from '../views/help/HelpFeedbackProvider';
import { IntegrationsProvider } from '../views/integrations/IntegrationsProvider';
import { registerKaotoEditorProvider } from './KaotoEditorProvider';
import { EditorRegistrar } from './registrars/EditorRegistrar';
import { LifecycleRegistrar } from './registrars/LifecycleRegistrar';
import { TestsRegistrar } from './registrars/TestsRegistrar';

export async function activate(context: vscode.ExtensionContext) {
	KaotoOutputChannel.logInfo('Kaoto extension is alive.');
	KaotoOutputChannel.logStartupInfo(context, 'web');

	const editors = registerKaotoEditorProvider(context);

	/*
	 * register commands for a toggle source code (open/close camel file in a side textual editor)
	 * and open with Kaoto Editor
	 */
	await new EditorRegistrar(context, editors, undefined).register();

	/*
	 * register 'Integrations' view provider
	 */
	const integrationsProvider = new IntegrationsProvider(context.extensionUri.path);
	const integrationsTreeView = vscode.window.createTreeView(VIEW_INTEGRATIONS, {
		treeDataProvider: integrationsProvider,
		showCollapseAll: true,
	});
	const integrationsDispose = { dispose: () => integrationsProvider.dispose() };
	const integrationsRefreshCommand = vscode.commands.registerCommand(COMMAND_INTEGRATIONS_REFRESH, () => integrationsProvider.refresh());
	context.subscriptions.push(integrationsTreeView, integrationsDispose, integrationsRefreshCommand);

	/*
	 * register 'Tests' view provider
	 */
	new TestsRegistrar(context, undefined).registerTestsView();

	/*
	 * register 'Help & Feedback' view provider
	 */
	context.subscriptions.push(vscode.window.registerTreeDataProvider(VIEW_HELP, new HelpFeedbackProvider(context.extensionUri.path)));

	/*
	 * Show What's New on first start for this version
	 */
	await new LifecycleRegistrar(context, undefined).showWhatsNewIfNeeded();

	KaotoOutputChannel.logInfo('Kaoto extension is successfully setup.');
}

export function deactivate() {
	KaotoOutputChannel.dispose();
}
