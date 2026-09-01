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
import { backendI18nDefaults, backendI18nDictionaries } from '@kie-tools-core/backend/dist/i18n';
import { VsCodeBackendProxy } from '@kie-tools-core/backend/dist/vscode';
import { EditorEnvelopeLocator, EnvelopeContentType, EnvelopeMapping } from '@kie-tools-core/editor/dist/api';
import { I18n } from '@kie-tools-core/i18n/dist/core';
import * as KogitoVsCode from '@kie-tools-core/vscode-extension/dist';
import * as vscode from 'vscode';
import { KAOTO_EDITOR_VIEW_TYPE, KAOTO_FILE_PATH_GLOB, VIEW_HELP, VIEW_INTEGRATIONS, COMMAND_INTEGRATIONS_REFRESH } from '../constants';
import { VSCodeKaotoChannelApiProducer } from './../webview/VSCodeKaotoChannelApiProducer';
import { KaotoOutputChannel } from './KaotoOutputChannel';
import { HelpFeedbackProvider } from '../views/help/HelpFeedbackProvider';
import { IntegrationsProvider } from '../views/integrations/IntegrationsProvider';
import { EditorRegistrar } from './registrars/EditorRegistrar';
import { LifecycleRegistrar } from './registrars/LifecycleRegistrar';
import { TestsRegistrar } from './registrars/TestsRegistrar';

let backendProxy: VsCodeBackendProxy;

export async function activate(context: vscode.ExtensionContext) {
	KaotoOutputChannel.logInfo('Kaoto extension is alive.');
	KaotoOutputChannel.logStartupInfo(context, 'web');

	const backendI18n = new I18n(backendI18nDefaults, backendI18nDictionaries, vscode.env.language);
	backendProxy = new VsCodeBackendProxy(context, backendI18n);

	const kieEditorStore = await KogitoVsCode.startExtension({
		extensionName: 'redhat.vscode-kaoto',
		context: context,
		viewType: KAOTO_EDITOR_VIEW_TYPE,
		editorEnvelopeLocator: new EditorEnvelopeLocator('vscode', [
			new EnvelopeMapping({
				type: 'kaoto',
				filePathGlob: KAOTO_FILE_PATH_GLOB,
				resourcesPathPrefix: 'dist/webview/editors/kaoto',
				envelopeContent: {
					type: EnvelopeContentType.PATH,
					path: 'dist/webview/KaotoEditorEnvelopeApp.js',
				},
			}),
		]),
		channelApiProducer: new VSCodeKaotoChannelApiProducer(),
		backendProxy: backendProxy,
	});

	/*
	 * register commands for a toggle source code (open/close camel file in a side textual editor)
	 * and open with Kaoto Editor
	 */
	await new EditorRegistrar(context, kieEditorStore, undefined).register();

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
	backendProxy?.stopServices();
	KaotoOutputChannel.dispose();
}
