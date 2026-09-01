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
import { EditorView, TextEditor, VSBrowser } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';
import * as os from 'os';

describe('Toggle Source Code', function () {
	this.timeout(30_000);

	const WORKSPACE_FOLDER: string = path.join(__dirname, '../../test Fixture with speci@l chars');
	const CAMEL_FILE: string = 'my.camel.yaml';

	let editorView: EditorView;

	let actionTitle = 'Open Source Code';
	if (os.platform() === 'darwin') {
		actionTitle += ' (⌘K V)';
	} else {
		actionTitle += ' (Ctrl+K V)';
	}

	beforeEach(async function () {
		await VSBrowser.instance.openResources(path.join(WORKSPACE_FOLDER, CAMEL_FILE), async (timeout: number = 5_000, interval: number = 1_000) => {
			await VSBrowser.instance.driver.sleep(interval);
			await VSBrowser.instance.driver.wait(
				async () => {
					const editor = await new EditorView().getActiveTab();
					return (await editor?.getTitle()) === CAMEL_FILE;
				},
				timeout,
				`Cannot open file '${CAMEL_FILE}' in ${timeout}ms`,
				interval,
			);
		});
		editorView = new EditorView();
		await clickEditorAction(editorView, actionTitle);
	});

	afterEach(async function () {
		await editorView.closeAllEditors();
	});

	it('open text editor to the side', async function () {
		const groupsNum = await waitForEditorGroupsLength(2);
		expect(groupsNum).to.equal(2);

		const editor = new TextEditor(await editorView.getEditorGroup(1));
		expect(await editor.getTextAtLine(1)).contains('- route:');
	});

	it('close text editor', async function () {
		await waitForEditorGroupsLength(2);
		await editorView.openEditor(CAMEL_FILE, 1); // re-activate editor
		await clickEditorAction(editorView, 'Close Source Code', 1);

		const groupsNum = await waitForEditorGroupsLength(1);
		expect(groupsNum).to.equal(1);
	});

	async function waitForEditorGroupsLength(length: number, timeout: number = 5_000): Promise<number> {
		// Re-fetch EditorView and swallow transient stale element errors while VS Code re-renders groups
		const driver = editorView.getDriver();
		await driver.wait(
			async () => {
				try {
					const view = new EditorView();
					const currentLength = (await view.getEditorGroups()).length;
					return currentLength === length;
				} catch (err) {
					return false;
				}
			},
			timeout,
			`The editor group length (expected: ${length}) was not satisfied.`,
		);
		return (await new EditorView().getEditorGroups()).length;
	}

	async function clickEditorAction(
		editorView: EditorView,
		actionLabel: string,
		groupIndex?: number,
		timeout: number = 5_000,
		interval: number = 1_500,
	): Promise<void> {
		await editorView.getDriver().sleep(interval);
		await editorView.getDriver().wait(
			async () => {
				try {
					const action = await editorView.getAction(actionLabel, groupIndex);
					if (action !== undefined) {
						await action.click();
						return true;
					} else {
						return false;
					}
				} catch {
					return false;
				}
			},
			timeout,
			`Cannot click on editor action button in ${timeout}ms`,
			interval,
		);
	}
});
