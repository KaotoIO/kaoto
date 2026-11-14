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
import { By, EditorView, Key, TextEditor, until, VSBrowser, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';
import * as os from 'os';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { clickWhenClickable, dismissHoverOverlay, openAndSwitchToKaotoFrame, switchToKaotoFrame } from '../utils/editor';
import { KaotoCanvas } from '../pageObjects/KaotoCanvas';
import { KaotoEditor } from '../pageObjects/KaotoEditor';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { dismissBlockingModal } from '../utils/workbench';

describe('Toggle Source Code', function () {
	this.timeout(60_000);

	const WORKSPACE_FOLDER: string = path.join(__dirname, '../../test Fixture with speci@l chars');
	const CAMEL_FILE: string = 'my.camel.yaml';

	let editorView: EditorView;
	let temporaryFolder: string;

	before(async function () {
		temporaryFolder = await mkdtemp(path.join(os.tmpdir(), 'kaoto-source-'));
	});

	after(async function () {
		await rm(temporaryFolder, { recursive: true, force: true });
	});

	let actionTitle = 'Open Source Code';
	if (os.platform() === 'darwin') {
		actionTitle += ' (⌘K V)';
	} else {
		actionTitle += ' (Ctrl+K V)';
	}

	before(async function () {
		this.timeout(180_000);
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER);
	});

	beforeEach(async function () {
		editorView = new EditorView();
		await copyFile(path.join(WORKSPACE_FOLDER, CAMEL_FILE), path.join(temporaryFolder, CAMEL_FILE));
		const { kaotoWebview } = await openAndSwitchToKaotoFrame(temporaryFolder, CAMEL_FILE, VSBrowser.instance.driver, true);
		await kaotoWebview.switchBack();
		await clickEditorAction(editorView, actionTitle);
	});

	afterEach(async function () {
		const driver = VSBrowser.instance.driver;
		await driver.switchTo().defaultContent();
		await new Workbench().executeCommand('workbench.action.closeAllEditors');
		await driver.wait(
			async () => {
				await dismissBlockingModal(driver);
				return (await new EditorView().getOpenEditorTitles()).length === 0;
			},
			5_000,
			'Temporary editors were not closed',
		);
	});

	it('open text editor to the side', async function () {
		const groupsNum = await waitForEditorGroupsLength(2, 10_000);
		expect(groupsNum).to.equal(2);

		const editor = await getSourceEditor();
		// Read the rendered source directly; getTextAtLine also drives the command
		// palette and clipboard and waits for status-bar cursor coordinates.
		let text = '';
		await editor.getDriver().wait(
			async () => {
				try {
					text = await editor.findElement(By.css('.view-lines .view-line')).getText();
					return text.includes('- route:');
				} catch {
					return false;
				}
			},
			20_000,
			'Source editor did not render the route within 20s',
		);
		expect(text).contains('- route:');
	});

	it('close text editor', async function () {
		await waitForEditorGroupsLength(2);
		await editorView.openEditor(CAMEL_FILE, 1); // re-activate editor
		await clickEditorAction(editorView, 'Close Source Code', 1);

		const groupsNum = await waitForEditorGroupsLength(1);
		expect(groupsNum).to.equal(1);
	});

	it('synchronizes step IDs between the properties panel and source editor', async function () {
		const driver = VSBrowser.instance.driver;
		await waitForEditorGroupsLength(2);
		const original = await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8');
		await editorView.openEditor(CAMEL_FILE, 0);
		const canvas = await switchToKaotoFrame(driver, true, CAMEL_FILE);
		try {
			const log = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.0.log');
			await dismissHoverOverlay(driver);
			await clickWhenClickable(driver, log);
			await KaotoEditor.waitForPropertyPanel(driver);
			await clickWhenClickable(driver, await driver.findElement(By.css('[data-testid="tab-All"]')));
			const id = await driver.findElement(By.css('input[name="#.id"]'));
			await driver.wait(until.elementIsVisible(id), 5_000, 'Step ID field did not become visible');
			await id.sendKeys('log-from-properties', Key.TAB);
		} finally {
			await canvas.kaotoWebview.switchBack();
		}
		const source = await getSourceEditor();
		await source.click();
		await driver.wait(
			async () => (await source.getText()).includes('id: log-from-properties'),
			5_000,
			'Step ID was not synchronized into the source editor',
		);
		expect(await source.isDirty()).to.equal(true);
		expect(await canvas.kaotoEditor.isDirty()).to.equal(true);
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);

		// Change the route ID as well so the canvas exposes when this source update has arrived.
		await source.setText((await source.getText()).replace('log-from-properties', 'log-from-source').replace('camelroute51', 'source-synced-route'));
		await editorView.openEditor(CAMEL_FILE, 0);
		const refreshed = await switchToKaotoFrame(driver, false, CAMEL_FILE);
		try {
			await KaotoEditor.waitForIntegrationName(driver, 'source-synced-route');
			const log = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.0.log');
			await dismissHoverOverlay(driver);
			await clickWhenClickable(driver, log);
			await KaotoEditor.waitForPropertyPanel(driver);
			await clickWhenClickable(driver, await driver.findElement(By.css('[data-testid="tab-All"]')));
			await driver.wait(
				async () => {
					const inputs = await driver.findElements(By.css('input[name="#.id"]'));
					return inputs.length === 1 && (await inputs[0].isDisplayed()) && (await inputs[0].getAttribute('value')) === 'log-from-source';
				},
				5_000,
				'Properties panel did not show the ID from source after reopening',
			);
		} finally {
			await refreshed.kaotoWebview.switchBack();
		}
	});

	it('saves source changes and restores the same canvas after window reload', async function () {
		const driver = VSBrowser.instance.driver;
		const routePath = path.join(temporaryFolder, CAMEL_FILE);
		const { editor, kaotoEditor, updated } = await editSourceRoute('source-updated');

		await editorView.openEditor(CAMEL_FILE, 1);
		await editor.save();
		await driver.wait(async () => (await readFile(routePath, 'utf8')) === updated, 5_000, 'Source edits were not saved');
		expect(await editor.isDirty()).to.equal(false);
		await driver.wait(async () => !(await kaotoEditor.isDirty()), 5_000, 'Graphical editor was not marked saved');

		await reloadWindow();
		const afterReload = await switchToKaotoFrame(driver, true, CAMEL_FILE);
		try {
			await KaotoEditor.waitForIntegrationName(driver, 'source-updated');
		} finally {
			await afterReload.kaotoWebview.switchBack();
		}
		expect(await readFile(routePath, 'utf8')).to.equal(updated);
	});

	it('restores unsaved shared content and both dirty markers after window reload', async function () {
		const driver = VSBrowser.instance.driver;
		const { original } = await editSourceRoute('unsaved-shared-route');
		await reloadWindow();
		const reopened = await switchToKaotoFrame(driver, false, CAMEL_FILE);
		try {
			await KaotoEditor.waitForIntegrationName(driver, 'unsaved-shared-route');
		} finally {
			await reopened.kaotoWebview.switchBack();
		}
		const source = await getSourceEditor();
		expect(await source.isDirty()).to.equal(true);
		expect(await reopened.kaotoEditor.isDirty()).to.equal(true);
		await source.click();
		expect(await source.getText()).to.include('unsaved-shared-route');
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);
	});

	it('saving the canvas also saves and clears the dirty source editor', async function () {
		const { editor, kaotoEditor, updated } = await editSourceRoute('saved-from-canvas');
		expect(await editor.isDirty()).to.equal(true);
		expect(await kaotoEditor.isDirty()).to.equal(true);
		await kaotoEditor.save();
		await VSBrowser.instance.driver.wait(
			async () => !(await editor.isDirty()) && !(await kaotoEditor.isDirty()),
			5_000,
			'Both editors should be clean after saving the canvas',
		);
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(updated);
	});

	it('shares native Undo and Redo between the canvas and source without saving', async function () {
		const driver = VSBrowser.instance.driver;
		const { editor, kaotoEditor, original, updated } = await editSourceRoute('shared-history-route');
		await clickCanvasHistory('Undo');
		await driver.wait(async () => !(await editor.isDirty()) && !(await kaotoEditor.isDirty()), 5_000, 'Undo should clear both dirty markers');
		await editor.click();
		// TextEditor.getText() reads the clipboard, which uses CRLF on Windows.
		expect((await editor.getText()).replaceAll('\r\n', '\n')).to.equal(original.replaceAll('\r\n', '\n'));
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);

		await clickCanvasHistory('Redo');
		await driver.wait(async () => (await editor.isDirty()) && (await kaotoEditor.isDirty()), 5_000, 'Redo should dirty both editors');
		await editor.click();
		expect((await editor.getText()).replaceAll('\r\n', '\n')).to.equal(updated.replaceAll('\r\n', '\n'));

		// The global command palette can focus the other group when a webview is open.
		await editor.focus();
		await editor.typeText(Key.chord(os.platform() === 'darwin' ? Key.META : Key.CONTROL, 'z'));
		await driver.wait(async () => !(await editor.isDirty()) && !(await kaotoEditor.isDirty()), 5_000, 'Source Undo should clear both dirty markers');
		await clickCanvasHistory('Redo');
		await driver.wait(async () => (await editor.isDirty()) && (await kaotoEditor.isDirty()), 5_000, 'Canvas Redo should restore the source edit');
		await editor.click();
		expect((await editor.getText()).replaceAll('\r\n', '\n')).to.equal(updated.replaceAll('\r\n', '\n'));
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);
	});

	it('clears both dirty markers after undoing a properties-panel edit and retains Redo', async function () {
		const driver = VSBrowser.instance.driver;
		const original = await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8');
		await editorView.openEditor(CAMEL_FILE, 0);
		const canvas = await switchToKaotoFrame(driver, true, CAMEL_FILE);
		try {
			const log = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.0.log');
			await dismissHoverOverlay(driver);
			await clickWhenClickable(driver, log);
			await KaotoEditor.waitForPropertyPanel(driver);
			await clickWhenClickable(driver, await driver.findElement(By.css('[data-testid="tab-All"]')));
			const id = await driver.findElement(By.css('input[name="#.id"]'));
			await driver.wait(until.elementIsVisible(id), 5_000);
			await id.sendKeys('x', Key.TAB);
		} finally {
			await canvas.kaotoWebview.switchBack();
		}
		const source = await getSourceEditor();
		await source.click();
		await driver.wait(async () => (await source.getText()).includes('id: x'), 5_000, 'Property edit did not reach the source');
		await clickCanvasHistory('Undo');
		await driver.wait(async () => !(await source.isDirty()) && !(await canvas.kaotoEditor.isDirty()), 5_000, 'Undo should clear both dirty markers');
		await source.click();
		expect((await source.getText()).replaceAll('\r\n', '\n')).to.equal(original.replaceAll('\r\n', '\n'));
		await clickCanvasHistory('Redo');
		await driver.wait(async () => (await source.isDirty()) && (await canvas.kaotoEditor.isDirty()), 5_000, 'Redo should dirty both editors');
		await source.click();
		expect(await source.getText()).to.include('id: x');
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);
	});

	async function clickCanvasHistory(command: 'Undo' | 'Redo') {
		const driver = VSBrowser.instance.driver;
		await editorView.openEditor(CAMEL_FILE, 0);
		const canvas = await switchToKaotoFrame(driver, false, CAMEL_FILE);
		try {
			await clickWhenClickable(driver, await driver.findElement(By.css(`button[aria-label="${command}"]`)));
		} finally {
			await canvas.kaotoWebview.switchBack();
		}
	}

	it('Save As writes the target and opens it in the existing graphical editor', async function () {
		const driver = VSBrowser.instance.driver;
		const { kaotoEditor, original, updated } = await editSourceRoute('save-as-route');
		const destination = path.join(temporaryFolder, 'copy.camel.yaml');
		const input = await kaotoEditor.saveAs();
		await input.setText(destination);
		await input.confirm();
		// Save As creates the target before it writes the route, so wait for the content, not the file. A wait
		// that times out falls through to the assertion, which shows the difference or the read error.
		await driver.wait(async () => (await readFile(destination, 'utf8').catch(() => '')) === updated, 5_000).catch(() => undefined);
		expect(await readFile(destination, 'utf8'), 'Save As did not write the edited route to the target').to.equal(updated);
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);
		await driver.wait(async () => (await new EditorView().getOpenEditorTitles()).includes('copy.camel.yaml'), 5_000, 'Save As target tab was not opened');
		const reopened = await switchToKaotoFrame(driver, true, 'copy.camel.yaml');
		try {
			await KaotoEditor.waitForIntegrationName(driver, 'save-as-route');
		} finally {
			await reopened.kaotoWebview.switchBack();
		}
	});

	it('reverts the canvas content and clears the dirty marker', async function () {
		const driver = VSBrowser.instance.driver;
		const { original } = await editSourceRoute('unsaved-route');
		await new Workbench().executeCommand('workbench.action.files.revert');
		const reverted = await switchToKaotoFrame(driver, false, CAMEL_FILE);
		try {
			await KaotoEditor.waitForIntegrationName(driver, 'camelroute51');
		} finally {
			await reverted.kaotoWebview.switchBack();
		}
		expect(await reverted.kaotoEditor.isDirty()).to.equal(false);
		expect(await (await getSourceEditor()).isDirty()).to.equal(false);
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);
	});

	async function reloadWindow() {
		const driver = VSBrowser.instance.driver;
		const previousWorkbench = await driver.findElement(By.css('.monaco-workbench'));
		await new Workbench().executeCommand('workbench.action.reloadWindow');
		await driver.wait(until.stalenessOf(previousWorkbench), 10_000, 'The previous workbench was not disposed on reload').catch((error: unknown) => {
			// ChromeDriver may report a removed workbench as a missing element or a node from the previous document.
			if (
				!(error instanceof Error) ||
				(error.name !== 'NoSuchElementError' && !error.message.includes('Node with given id does not belong to the document'))
			) {
				throw error;
			}
		});
		await driver.wait(until.elementLocated(By.css('.monaco-workbench')), 10_000, 'The workbench did not return after reload');
	}

	async function editSourceRoute(routeId: string) {
		const driver = VSBrowser.instance.driver;
		const routePath = path.join(temporaryFolder, CAMEL_FILE);
		const original = await readFile(routePath, 'utf8');
		const updated = original.replace('camelroute51', routeId);
		const editor = await getSourceEditor();
		await editor.setText(updated);
		await driver.wait(() => editor.isDirty(), 5_000, 'Source edit was not reflected in the dirty marker');
		expect(await editor.isDirty()).to.equal(true);
		expect(await readFile(routePath, 'utf8')).to.equal(original);
		await editorView.openEditor(CAMEL_FILE, 0);
		const canvas = await switchToKaotoFrame(driver, false, CAMEL_FILE);
		try {
			await KaotoEditor.waitForIntegrationName(driver, routeId);
		} finally {
			await canvas.kaotoWebview.switchBack();
		}
		return { editor, ...canvas, original, updated };
	}

	/**
	 * Returns the source editor of the second editor group once VS Code has rendered it. A TextEditor looks its
	 * element up only when it is built, and Open Source Code or a window reload returns before the editor renders.
	 */
	async function getSourceEditor(timeout: number = 15_000): Promise<TextEditor> {
		let editor: TextEditor | undefined;
		await VSBrowser.instance.driver.wait(
			async () => {
				try {
					const groups = await new EditorView().getEditorGroups();
					if (groups.length < 2) {
						return false;
					}
					const candidate = new TextEditor(groups[1]);
					if ((await candidate.findElements(By.css('.monaco-editor .view-lines .view-line'))).length === 0) {
						return false;
					}
					editor = candidate;
					return true;
				} catch (error) {
					// The editor can still be missing from the group or be replaced while VS Code renders it. Any
					// other error, such as a lost WebDriver session, ends the wait with its own message.
					if (error instanceof Error && (error.name === 'NoSuchElementError' || error.name === 'StaleElementReferenceError')) {
						return false;
					}
					throw error;
				}
			},
			timeout,
			`The source editor did not render in the second editor group within ${timeout}ms`,
		);
		return editor!;
	}

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
