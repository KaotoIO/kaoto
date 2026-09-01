import * as vscode from 'vscode';
import { CamelExecutorFactory } from './CamelExecutorFactory';
import { CamelLauncherDownloader } from '../services/CamelLauncherDownloader';
import { KaotoCatalogService } from '../services/KaotoCatalogService';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { DEFAULT_CAMEL_VERSION_FALLBACK, KAOTO_EXECUTOR_TYPE_SETTING_ID } from '../constants';

export interface IExecutorHandler {
	checkJbangOnPath(): Promise<boolean>;
	checkJavaOnPath(): Promise<boolean>;
	checkJBangTrustedSources(): Promise<void>;
	checkCamelJBangPlugins(): Promise<void>;
	setExecutorAvailable(available: boolean): Promise<void>;
}

/**
 * Ensure executor is available and configured.
 * Handles both JBang and Camel Launcher setup with status bar feedback.
 * @param context - Extension context
 * @param contextHandler - Executor handler providing tool checks and availability control
 * @param forceReinitialize - Force re-initialization even if executor is already available
 */
export async function ensureExecutorAvailable(
	context: vscode.ExtensionContext,
	contextHandler: IExecutorHandler,
	forceReinitialize: boolean = false,
): Promise<void> {
	await contextHandler.setExecutorAvailable(false);

	try {
		if (forceReinitialize) {
			CamelExecutorFactory.resetExecutor();
			KaotoOutputChannel.logInfo('Executor cache reset for re-initialization');
		}

		const config = vscode.workspace.getConfiguration();
		const executorType = config.get<string>(KAOTO_EXECUTOR_TYPE_SETTING_ID, 'jbang');

		if (executorType === 'jbang') {
			KaotoOutputChannel.logInfo('Checking JBang availability...');

			const resolvedJbang = await contextHandler.checkJbangOnPath();

			if (!resolvedJbang) {
				KaotoOutputChannel.logWarning('JBang not found on PATH');
				vscode.window.setStatusBarMessage('$(warning) Kaoto: JBang not found', 5000);
				await contextHandler.setExecutorAvailable(false);
				return;
			}

			await contextHandler.checkJBangTrustedSources();
			await contextHandler.checkCamelJBangPlugins();

			KaotoOutputChannel.logInfo('JBang is ready');
			vscode.window.setStatusBarMessage('$(check) Kaoto: JBang ready', 3000);
			await contextHandler.setExecutorAvailable(true);
		} else if (executorType === 'camel-launcher') {
			KaotoOutputChannel.logInfo('Checking Java availability...');

			const javaAvailable = await contextHandler.checkJavaOnPath();

			if (!javaAvailable) {
				KaotoOutputChannel.logWarning('Java not found on PATH');
				vscode.window.setStatusBarMessage('$(warning) Kaoto: Java not found', 5000);
				await contextHandler.setExecutorAvailable(false);
				return;
			}

			const catalogService = KaotoCatalogService.getInstance();
			const catalog = await catalogService.getSelectedIntegrationCatalog();
			const version = catalogService.getCamelVersionForCLI(catalog, 'camel-launcher') || DEFAULT_CAMEL_VERSION_FALLBACK;
			const downloader = new CamelLauncherDownloader(context);

			KaotoOutputChannel.logInfo(`Downloading Camel Launcher ${version}...`);
			const statusBarMessage = vscode.window.setStatusBarMessage(`Kaoto: Preparing Camel Launcher ${version}...`);
			try {
				const launcherPath = await downloader.ensureLauncher(version);
				KaotoOutputChannel.logInfo(`Camel Launcher ${version} ready at: ${launcherPath}`);
				vscode.window.setStatusBarMessage('$(check) Kaoto: Camel Launcher ready', 3000);
				await contextHandler.setExecutorAvailable(true);
			} finally {
				statusBarMessage.dispose();
			}
		}
	} catch (error) {
		const isLauncherNotFound = error instanceof Error && error.name === 'LauncherNotFoundError';

		if (isLauncherNotFound) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			KaotoOutputChannel.logWarning(errorMessage);
			vscode.window.showWarningMessage(errorMessage);
		} else {
			const errorMessage = error instanceof Error ? error.message : String(error);
			KaotoOutputChannel.logError('Failed to setup executor', error);
			vscode.window.showWarningMessage(`Failed to setup executor: ${errorMessage}. It will be configured when first needed.`);
		}

		await contextHandler.setExecutorAvailable(false);
	}
}
