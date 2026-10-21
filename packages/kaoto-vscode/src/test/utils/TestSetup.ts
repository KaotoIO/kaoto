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
 * Close every editor left open by earlier tests, discarding unsaved changes.
 * Reverting first avoids the save confirmation, which would block the run.
 */
export async function closeAllEditors(): Promise<void> {
	let remaining = vscode.window.tabGroups.all.reduce((count, group) => count + group.tabs.length, 0);
	while (remaining > 0) {
		await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
		const left = vscode.window.tabGroups.all.reduce((count, group) => count + group.tabs.length, 0);
		if (left >= remaining) {
			throw new Error(`Could not close the remaining ${left} editor tab(s)`);
		}
		remaining = left;
	}
}

/**
 * Snapshot the KaotoCatalogService singleton; every `new KaotoCatalogService()` replaces it.
 * Call the returned function to put the previous instance back.
 */
export function preserveKaotoCatalogServiceInstance(): () => void {
	const holder = KaotoCatalogService as unknown as { instance: KaotoCatalogService | undefined };
	const previous = holder.instance;
	return () => {
		holder.instance = previous;
	};
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
