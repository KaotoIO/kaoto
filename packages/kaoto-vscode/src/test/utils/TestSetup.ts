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
 * Absolute path of the workspace folder opened for the tests.
 * It is a per-run copy of the fixture folder, see .vscode-test.mjs
 */
export function getTestWorkspaceFolder(): string {
	const folder = vscode.workspace.workspaceFolders?.[0];
	if (!folder) {
		throw new Error('No workspace folder available for testing');
	}
	return folder.uri.fsPath;
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
