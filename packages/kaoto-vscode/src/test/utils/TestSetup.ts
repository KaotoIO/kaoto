import * as vscode from 'vscode';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';

/**
 * Get or create extension context for tests
 */
export async function getExtensionContext(): Promise<vscode.ExtensionContext> {
	const extension = vscode.extensions.getExtension('redhat.vscode-kaoto');
	if (!extension) {
		throw new Error('Extension not found');
	}
	await extension.activate();

	// Get context from extension exports or create a minimal mock context
	let context = extension.exports?.context;
	if (!context?.extensionPath) {
		// Create a minimal mock context for tests
		const extensionPath = extension.extensionPath;
		context = {
			extensionPath: extensionPath,
			globalState: {
				get: () => undefined,
				update: async () => {},
				keys: () => [],
				setKeysForSync: () => {},
			},
			workspaceState: {
				get: () => undefined,
				update: async () => {},
				keys: () => [],
				setKeysForSync: () => {},
			},
		} as any;
	}

	return context;
}

/**
 * Initialize KaotoCatalogService for tests
 * This should be called in test setup/suiteSetup
 */
export async function initializeKaotoCatalogService(): Promise<KaotoCatalogService> {
	const context = await getExtensionContext();
	const catalogService = new KaotoCatalogService(context);
	await catalogService.initialize();

	return catalogService;
}
