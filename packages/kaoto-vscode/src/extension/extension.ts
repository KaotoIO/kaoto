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
import { getRedHatService, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import * as vscode from 'vscode';
import { KAOTO_FILE_PATH_GLOB, VIEW_HELP } from '../constants';
import { VSCodeKaotoChannelApiProducer } from './../webview/VSCodeKaotoChannelApiProducer';
import { KaotoOutputChannel } from './KaotoOutputChannel';
import { PortManager } from '../services/PortManager';
import { CamelExecutorFactory } from '../executors/CamelExecutorFactory';
import { KaotoCatalogService } from '../services/KaotoCatalogService';
import { HelpFeedbackProvider } from '../views/help/HelpFeedbackProvider';
import { IRegistrar } from './registrars/IRegistrar';
import { EditorRegistrar } from './registrars/EditorRegistrar';
import { ExecutorRegistrar } from './registrars/ExecutorRegistrar';
import { LifecycleRegistrar } from './registrars/LifecycleRegistrar';
import { IntegrationsRegistrar } from './registrars/IntegrationsRegistrar';
import { DeploymentsRegistrar } from './registrars/DeploymentsRegistrar';
import { TestsRegistrar } from './registrars/TestsRegistrar';
import { InfrastructureRegistrar } from './registrars/InfrastructureRegistrar';
import { OpenApiRegistrar } from './registrars/OpenApiRegistrar';

let backendProxy: VsCodeBackendProxy;
let telemetryService: TelemetryService;

export async function activate(context: vscode.ExtensionContext) {
	KaotoOutputChannel.logInfo('Kaoto extension is alive.');
	KaotoOutputChannel.logStartupInfo(context);

	// Initialize executor factory with extension context
	CamelExecutorFactory.initialize(context);

	const backendI18n = new I18n(backendI18nDefaults, backendI18nDictionaries, vscode.env.language);
	backendProxy = new VsCodeBackendProxy(context, backendI18n);

	const kieEditorStore = await KogitoVsCode.startExtension({
		extensionName: 'redhat.vscode-kaoto',
		context: context,
		viewType: 'webviewEditorsKaoto',
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

	const portManager = new PortManager();

	/*
	 * Initialize Camel Catalog Service
	 */
	const catalogService = new KaotoCatalogService(context);
	await catalogService.initialize();

	// Create and register status bar item
	const catalogStatusBar = catalogService.createStatusBarItem();
	context.subscriptions.push(catalogStatusBar);

	/*
	 * init Red Hat Telemetry
	 */
	const redhatService = await getRedHatService(context);
	telemetryService = await redhatService.getTelemetryService();

	/*
	 * register all views (Integrations, Deployments, Infrastructure, Tests, Help & Feedback, OpenAPI) first to avoid race conditions
	 */
	context.subscriptions.push(vscode.window.registerTreeDataProvider(VIEW_HELP, new HelpFeedbackProvider(context.extensionUri.path)));

	const registrars: IRegistrar[] = [
		new EditorRegistrar(context, kieEditorStore, telemetryService),
		new IntegrationsRegistrar(context, telemetryService, portManager),
		new DeploymentsRegistrar(context, telemetryService, portManager),
		new InfrastructureRegistrar(context, telemetryService),
		new TestsRegistrar(context, telemetryService),
		new OpenApiRegistrar(context, telemetryService),
		new ExecutorRegistrar(context, telemetryService, catalogService),
		new LifecycleRegistrar(context, telemetryService),
	];

	for (const registrar of registrars) {
		await registrar.register();
	}

	/*
	 * send extension startup event into Red Hat Telemetry
	 */
	await telemetryService.sendStartupEvent();

	KaotoOutputChannel.logInfo('Kaoto extension is successfully setup.');
	console.log('Kaoto extension is successfully setup.');
}

export async function deactivate() {
	backendProxy?.stopServices();
	await telemetryService.sendShutdownEvent();
	KaotoOutputChannel.dispose();
}
