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
import { getRedHatService, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import * as vscode from 'vscode';
import { VIEW_HELP } from '../constants';
import { KaotoOutputChannel } from './KaotoOutputChannel';
import { PortManager } from '../services/PortManager';
import { CamelExecutorFactory } from '../executors/CamelExecutorFactory';
import path from 'path'; // NOSONAR: desktop path resolution
import { StepUpdateAction } from '@kaoto/kaoto/models';
import { findClasspathRoot } from '../utils/ClasspathRootFinder';
import { resolvePaths } from '../utils/Path';
import { MavenRuntimeDetector } from '../services/MavenRuntimeDetector';
import { StepsOnSaveManager } from '../services/StepsOnSaveManager';
import { getEnvironmentSuggestions } from '../services/SuggestionRegistry';
import { KaotoCatalogService } from '../services/KaotoCatalogService';
import { HelpFeedbackProvider } from '../views/help/HelpFeedbackProvider';
import { IRegistrar } from './registrars/IRegistrar';
import { registerKaotoEditorProvider } from './KaotoEditorProvider';
import { KaotoHostServices, type KaotoDesktopOperations } from '../services/KaotoHostServices';
import { EditorRegistrar } from './registrars/EditorRegistrar';
import { ExecutorRegistrar } from './registrars/ExecutorRegistrar';
import { LifecycleRegistrar } from './registrars/LifecycleRegistrar';
import { IntegrationsRegistrar } from './registrars/IntegrationsRegistrar';
import { DeploymentsRegistrar } from './registrars/DeploymentsRegistrar';
import { TestsRegistrar } from './registrars/TestsRegistrar';
import { InfrastructureRegistrar } from './registrars/InfrastructureRegistrar';
import { OpenApiRegistrar } from './registrars/OpenApiRegistrar';

let telemetryService: TelemetryService;

export async function activate(context: vscode.ExtensionContext) {
	KaotoOutputChannel.logInfo('Kaoto extension is alive.');
	KaotoOutputChannel.logStartupInfo(context);

	// Initialize executor factory with extension context
	CamelExecutorFactory.initialize(context);

	const catalogService = new KaotoCatalogService(context);
	await catalogService.initialize();
	const desktopOperations: KaotoDesktopOperations = {
		getSelectedCatalog: async (uri) => {
			if (await KaotoCatalogService.isMavenProject(uri)) {
				return undefined;
			}
			return KaotoCatalogService.getInstance().getSelectedCatalog(uri);
		},
		findClasspathRoot: (uri) => vscode.Uri.file(findClasspathRoot(uri)),
		resolveKameletDirectories: (directories, uri) =>
			[...resolvePaths(directories, path.dirname(uri.fsPath))].map((directory) => vscode.Uri.file(directory)),
		getEnvironmentSuggestions: (word) => getEnvironmentSuggestions(word, process.env),
		getRuntimeInfoFromMavenContext: (uri) => MavenRuntimeDetector.getRuntimeInfoFromMavenContext(uri.fsPath),
		onStepUpdated: (uri, action, stepType, stepName) => {
			KaotoOutputChannel.logInfo(`Step ${stepName} of type ${stepType} - Action: ${action}`);
			if (action === StepUpdateAction.Add || action === StepUpdateAction.Replace) {
				StepsOnSaveManager.instance.markStepsAdded(uri);
			}
		},
		disposeFor: (uri) => StepsOnSaveManager.instance.disposeFor(uri),
	};
	const editors = registerKaotoEditorProvider(context, (getUri) => new KaotoHostServices(getUri, desktopOperations));

	const portManager = new PortManager();

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
		new EditorRegistrar(context, editors, telemetryService),
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
	await telemetryService.sendShutdownEvent();
	KaotoOutputChannel.dispose();
}
