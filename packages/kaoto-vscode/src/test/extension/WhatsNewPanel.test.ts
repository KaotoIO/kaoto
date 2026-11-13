/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
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
import { assert } from 'chai';
import * as vscode from 'vscode';
import { VIEW_WHATS_NEW } from '../../constants';
import { WhatsNewPanel } from '../../extension/WhatsNewPanel';
import { getExtensionUri } from '../utils/TestSetup';

suite('WhatsNewPanel', function () {
	const originalWindow = {
		createWebviewPanel: vscode.window.createWebviewPanel,
	};
	let context: vscode.ExtensionContext;
	let panels: vscode.WebviewPanel[];

	suiteSetup(function () {
		// show() reads only the extension URI of the context.
		context = { extensionUri: getExtensionUri() } as vscode.ExtensionContext;
	});

	setup(function () {
		panels = [];
		// Create the real panel and keep it, so the tests can read what the user would see.
		(vscode.window as unknown as Record<string, unknown>).createWebviewPanel = (...args: Parameters<typeof vscode.window.createWebviewPanel>) => {
			const panel = originalWindow.createWebviewPanel(...args);
			panels.push(panel);
			return panel;
		};
	});

	teardown(function () {
		Object.assign(vscode.window, originalWindow);
		panels.forEach((panel) => panel.dispose());
	});

	test('opens the page of the major and minor version from the assets folder', async function () {
		const pageFolder = vscode.Uri.joinPath(getExtensionUri(), 'assets', 'resources', 'whats-new', '2.14');
		const markdown = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(pageFolder, 'index.md')));
		const page = await vscode.commands.executeCommand<string>('markdown.api.render', markdown);

		await WhatsNewPanel.show(context, '2.14.3');

		assert.lengthOf(panels, 1);
		assert.strictEqual(panels[0].viewType, VIEW_WHATS_NEW);
		assert.strictEqual(panels[0].title, "What's New in Kaoto 2.14");
		assert.deepEqual(panels[0].webview.options.localResourceRoots?.map(String), [pageFolder.toString()]);
		assert.include(panels[0].webview.html, page);
	});

	test('opens nothing for a version without a page', async function () {
		await WhatsNewPanel.show(context, '0.0.0-dev');

		assert.isEmpty(panels);
	});
});
