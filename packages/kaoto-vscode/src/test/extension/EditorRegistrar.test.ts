import { assert } from 'chai';
import * as vscode from 'vscode';
import { EditorRegistrar } from '../../extension/registrars/EditorRegistrar';

suite('EditorRegistrar', function () {
	test('rejects command registration errors without throwing synchronously', async function () {
		const error = new Error('Command already registered');
		const originalRegisterCommand = vscode.commands.registerCommand;
		const registrar = new EditorRegistrar(
			{ subscriptions: [] } as unknown as vscode.ExtensionContext,
			{ activeDocumentUri: undefined, applyHistory: () => Promise.resolve() },
			undefined,
		);

		try {
			vscode.commands.registerCommand = () => {
				throw error;
			};

			const result = registrar.registerToggleSourceCode();

			assert.instanceOf(result, Promise);
			await result.then(
				() => assert.fail('Expected command registration to reject'),
				(reason: unknown) => assert.strictEqual(reason, error),
			);
		} finally {
			vscode.commands.registerCommand = originalRegisterCommand;
		}
	});
});
