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
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { clickWhenClickable, dismissHoverOverlay, openAndSwitchToKaotoFrame, switchToKaotoFrame } from '../utils/editor';
import { KaotoCanvas } from '../pageObjects/KaotoCanvas';
import { KaotoEditor } from '../pageObjects/KaotoEditor';
import { EditorTabs } from '../pageObjects/EditorTabs';
import { dismissBlockingModal } from '../utils/workbench';

describe('Toggle Source Code', function () {
	this.timeout(30_000);

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
		const groupsNum = await waitForEditorGroupsLength(2);
		expect(groupsNum).to.equal(2);

		const editor = new TextEditor(await editorView.getEditorGroup(1));
		// Ensure the editor is focused so the status bar updates its cursor position.
		// On slow CI runners (especially Windows) the status bar may not reflect a
		// valid "Ln X, Col Y" within the library's default 5 s timeout unless the
		// editor is explicitly activated first.
		await editor.click();

		let text = '';
		await editor.getDriver().wait(
			async () => {
				try {
					text = await editor.getTextAtLine(1);
					return true;
				} catch {
					return false;
				}
			},
			10_000,
			'Text editor was not ready within 10s',
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

	it('synchronizes step IDs in both directions without remounting the properties panel', async function () {
		const driver = VSBrowser.instance.driver;
		await waitForEditorGroupsLength(2);
		const original = await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8');
		await editorView.openEditor(CAMEL_FILE, 0);
		const canvas = await switchToKaotoFrame(driver, true, CAMEL_FILE);
		let propertiesHeaderId = '';
		try {
			const log = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.0.log');
			await dismissHoverOverlay(driver);
			await clickWhenClickable(driver, log);
			await KaotoEditor.waitForPropertyPanel(driver);
			await clickWhenClickable(driver, await driver.findElement(By.id('All')));
			const id = await driver.findElement(By.css('input[name="#.id"]'));
			await driver.wait(until.elementIsVisible(id), 5_000, 'Step ID field did not become visible');
			propertiesHeaderId = await driver.findElement(By.css('[data-testid="close-side-bar"]')).getId();
			await id.sendKeys('log-from-properties', Key.TAB);
		} finally {
			await canvas.kaotoWebview.switchBack();
		}
		const source = new TextEditor(await editorView.getEditorGroup(1));
		await source.click();
		await driver.wait(
			async () => (await source.getText()).includes('id: log-from-properties'),
			5_000,
			'Step ID was not synchronized into the source editor',
		);
		expect(await source.isDirty()).to.equal(true);
		expect(await canvas.kaotoEditor.isDirty()).to.equal(true);
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);

		await source.setText((await source.getText()).replace('log-from-properties', 'log-from-source'));
		await editorView.openEditor(CAMEL_FILE, 0);
		const refreshed = await switchToKaotoFrame(driver, false, CAMEL_FILE);
		try {
			await driver.wait(
				async () => {
					const inputs = await driver.findElements(By.css('input[name="#.id"]'));
					return inputs.length === 1 && (await inputs[0].isDisplayed()) && (await inputs[0].getAttribute('value')) === 'log-from-source';
				},
				5_000,
				'Properties panel did not stay open with the ID from source',
			);
			expect(await driver.findElement(By.css('[data-testid="close-side-bar"]')).getId(), 'Properties header was remounted').to.equal(propertiesHeaderId);
		} finally {
			await refreshed.kaotoWebview.switchBack();
		}
	});

	for (const hasRouteId of [true, false]) {
		it(`keeps properties open for source-only edits (explicit route ID: ${hasRouteId})`, async function () {
			this.timeout(60_000);
			const driver = VSBrowser.instance.driver;
			await editorView.closeAllEditors();
			const filename = 'source-refresh.camel.yaml';
			const original = await readFile(path.join(WORKSPACE_FOLDER, CAMEL_FILE), 'utf8');
			const sourceText = hasRouteId ? original : original.replace('    id: camelroute51\n', '');
			await writeFile(path.join(temporaryFolder, filename), sourceText);
			const canvas = await openAndSwitchToKaotoFrame(temporaryFolder, filename, driver, true);
			const log = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.0.log');
			await dismissHoverOverlay(driver);
			await clickWhenClickable(driver, log);
			await KaotoEditor.waitForPropertyPanel(driver);
			await clickWhenClickable(driver, await driver.findElement(By.id('All')));
			const headerId = await driver.findElement(By.css('[data-testid="close-side-bar"]')).getId();
			await canvas.kaotoWebview.switchBack();
			await clickEditorAction(editorView, actionTitle);
			await waitForEditorGroupsLength(2);
			const source = new TextEditor(await editorView.getEditorGroup(1));
			await source.click();
			await source.setText(sourceText.replace('- log:\n', '- log:\n            id: source-only-id\n'));
			await editorView.openEditor(filename, 0);
			const refreshed = await switchToKaotoFrame(driver, false, filename);
			try {
				await driver.wait(
					async () => {
						const inputs = await driver.findElements(By.css('input[name="#.id"]'));
						return inputs.length === 1 && (await inputs[0].getAttribute('value')) === 'source-only-id';
					},
					5_000,
					'Properties panel closed or failed to refresh after a source-only edit',
				);
				expect(await driver.findElement(By.css('[data-testid="close-side-bar"]')).getId()).to.equal(headerId);
			} finally {
				await refreshed.kaotoWebview.switchBack();
			}
		});
	}

	it('refreshes a setBody expression without replacing its subform', async function () {
		this.timeout(60_000);
		const driver = VSBrowser.instance.driver;
		await editorView.closeAllEditors();
		const filename = 'expression-refresh.camel.yaml';
		const original = [
			'- route:',
			'    from:',
			'      uri: timer:test',
			'      steps:',
			'        - setBody:',
			'            expression:',
			'              simple:',
			'                expression: before',
			'',
		].join('\n');
		await writeFile(path.join(temporaryFolder, filename), original);
		const canvas = await openAndSwitchToKaotoFrame(temporaryFolder, filename, driver, true);
		const setBody = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.0.setBody');
		await dismissHoverOverlay(driver);
		await clickWhenClickable(driver, setBody);
		await KaotoEditor.waitForPropertyPanel(driver);
		await clickWhenClickable(driver, await driver.findElement(By.id('All')));
		const expression = await driver.wait(until.elementLocated(By.css('textarea[name="simple.expression"]')), 5_000);
		const expressionId = await expression.getId();
		await canvas.kaotoWebview.switchBack();
		await clickEditorAction(editorView, actionTitle);
		await waitForEditorGroupsLength(2);
		const source = new TextEditor(await editorView.getEditorGroup(1));
		await source.click();
		await source.setText(original.replace('expression: before', 'expression: after'));
		await editorView.openEditor(filename, 0);
		const refreshed = await switchToKaotoFrame(driver, false, filename);
		try {
			await driver.wait(
				async () => {
					const inputs = await driver.findElements(By.css('textarea[name="simple.expression"]'));
					return inputs.length === 1 && (await inputs[0].getAttribute('value')) === 'after';
				},
				5_000,
				'Expression did not refresh from source',
			);
			expect(await driver.findElement(By.css('textarea[name="simple.expression"]')).getId(), 'Expression input was remounted').to.equal(expressionId);
		} finally {
			await refreshed.kaotoWebview.switchBack();
		}
	});

	it('refreshes AMQP endpoint properties without showing loading placeholders', async function () {
		this.timeout(60_000);
		const driver = VSBrowser.instance.driver;
		await editorView.closeAllEditors();
		const filename = 'amqp-refresh.camel.yaml';
		const original = [
			'- route:',
			'    from:',
			'      uri: timer:test',
			'      steps:',
			'        - to:',
			'            uri: amqp',
			'            parameters:',
			'              destinationName: before',
			'              connectionFactory: "#factory"',
			'',
		].join('\n');
		await writeFile(path.join(temporaryFolder, filename), original);
		const canvas = await openAndSwitchToKaotoFrame(temporaryFolder, filename, driver, true);
		const amqp = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.0.to');
		await dismissHoverOverlay(driver);
		await clickWhenClickable(driver, amqp);
		await KaotoEditor.waitForPropertyPanel(driver);
		await clickWhenClickable(driver, await driver.findElement(By.id('All')));
		await canvas.kaotoWebview.switchBack();
		await clickEditorAction(editorView, actionTitle);
		await waitForEditorGroupsLength(2);
		const observed = await switchToKaotoFrame(driver, false, filename);
		const connectionFactory = By.css('input[aria-label="Connection Factory"]');
		await driver.wait(until.elementLocated(connectionFactory), 5_000);
		await driver.wait(async () => (await driver.findElements(By.css('.canvas-form [aria-label="Loading"]'))).length === 0, 5_000);
		const connectionFactoryId = await driver.findElement(connectionFactory).getId();
		// Observe transient placeholders too: the same input can be hidden by Suspense
		// and restored between two WebDriver polls without changing its element ID.
		await driver.executeScript(`
			const observation = { loadingShown: false };
			const observer = new MutationObserver((records) => {
				for (const record of records) {
					for (const node of record.addedNodes) {
						if (node instanceof Element &&
							(node.matches('[aria-label="Loading"]') || node.querySelector('[aria-label="Loading"]'))) {
							observation.loadingShown = true;
						}
					}
				}
			});
			observer.observe(document.querySelector('.canvas-form'), { childList: true, subtree: true });
			window.__kaotoEndpointObservation = { observation, observer };
		`);
		await observed.kaotoWebview.switchBack();
		const source = new TextEditor(await editorView.getEditorGroup(1));
		await source.click();
		await source.setText(original.replace('destinationName: before', 'destinationName: after'));
		await editorView.openEditor(filename, 0);
		const refreshed = await switchToKaotoFrame(driver, false, filename);
		try {
			await driver.wait(
				async () => {
					const inputs = await driver.findElements(By.css('input[aria-label="Destination Name"]'));
					return inputs.length === 1 && (await inputs[0].getAttribute('value')) === 'after';
				},
				5_000,
				'AMQP destination did not refresh from source',
			);
			expect(await driver.findElement(connectionFactory).getId(), 'Connection Factory input was remounted').to.equal(connectionFactoryId);
			expect(
				await driver.executeScript('return window.__kaotoEndpointObservation.observation.loadingShown;'),
				'Endpoint properties showed a loading placeholder',
			).to.equal(false);
		} finally {
			await driver.executeScript('window.__kaotoEndpointObservation.observer.disconnect(); delete window.__kaotoEndpointObservation;');
			await refreshed.kaotoWebview.switchBack();
		}
	});

	it('refreshes a newly created bean from source without reloading its details', async function () {
		this.timeout(60_000);
		const driver = VSBrowser.instance.driver;
		await waitForEditorGroupsLength(2);
		await editorView.openEditor(CAMEL_FILE, 0);
		const canvas = await switchToKaotoFrame(driver, true, CAMEL_FILE);
		await new EditorTabs().switchToTab('Beans editor');
		await EditorTabs.waitForBeansTab(driver);
		await driver.findElement(By.css('[data-testid="metadata-add-Beans-btn"]')).click();
		await driver.findElement(By.css('input[name="#.name"]')).sendKeys('myBean', Key.TAB);
		await driver.findElement(By.css('input[name="#.type"]')).sendKeys('org.example.MyBean', Key.TAB);
		await driver.findElement(By.css('[data-testid="#.properties__add"]')).click();
		await driver.findElement(By.css('input[placeholder="Write a key"]')).sendKeys('message', Key.TAB);
		const property = By.css('input[placeholder="Write a value"]');
		await driver.findElement(property).sendKeys('before', Key.TAB);
		const propertyId = await driver.findElement(property).getId();
		await driver.executeScript(`
			const observation = { loadingShown: false };
			const observer = new MutationObserver((records) => {
				observation.loadingShown ||= records.some((record) =>
					Array.from(record.addedNodes).some((node) => node instanceof Element &&
						(node.matches('[aria-label="Loading"]') || node.querySelector('[aria-label="Loading"]'))));
			});
			observer.observe(document.querySelector('#envelope-app'), { childList: true, subtree: true });
			window.__kaotoBeansObservation = { observation, observer };
		`);
		await canvas.kaotoWebview.switchBack();
		const source = new TextEditor(await editorView.getEditorGroup(1));
		await source.click();
		let sourceText = '';
		await driver.wait(
			async () => {
				sourceText = await source.getText();
				return sourceText.includes('myBean') && sourceText.includes('before');
			},
			5_000,
			'New bean was not synchronized to source',
		);
		await source.setText(sourceText.replace('before', 'after'));
		await editorView.openEditor(CAMEL_FILE, 0);
		const refreshed = await switchToKaotoFrame(driver, false, CAMEL_FILE);
		try {
			await driver.wait(
				async () => (await driver.findElement(property).getAttribute('value')) === 'after',
				5_000,
				'Bean properties did not refresh from source',
			);
			expect(await driver.findElement(property).getId(), 'Bean property input was remounted').to.equal(propertyId);
			expect(
				await driver.executeScript('return window.__kaotoBeansObservation.observation.loadingShown;'),
				'Beans page showed a loading placeholder',
			).to.equal(false);
			await driver.findElement(property).sendKeys('-edited', Key.TAB);
		} finally {
			await driver.executeScript('window.__kaotoBeansObservation.observer.disconnect(); delete window.__kaotoBeansObservation;');
			await refreshed.kaotoWebview.switchBack();
		}
		await source.click();
		await driver.wait(async () => (await source.getText()).includes('after-edited'), 5_000, 'Bean edits stopped updating source after an external change');
	});

	for (const rest of [
		{ type: 'Configuration', node: '[id$="::restConfiguration"]', property: 'host', before: 'localhost', after: 'example.org' },
		{ type: 'Service', node: '[id="rest-1::rest"]', property: 'path', before: '/api', after: '/api/v2' },
		{ type: 'Service ID', node: '[id="rest-1::rest"]', property: 'id', before: 'rest-1', after: 'renamed-rest' },
		{ type: 'Operation', node: '[id="rest-1::rest.get.0"]', property: 'path', before: '/users', after: '/people' },
	]) {
		it(`refreshes REST ${rest.type} from source without reloading its form`, async function () {
			this.timeout(60_000);
			const driver = VSBrowser.instance.driver;
			await waitForEditorGroupsLength(2);
			const source = new TextEditor(await editorView.getEditorGroup(1));
			const original =
				(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')) +
				[
					'',
					'- restConfiguration:',
					'    host: localhost',
					'- rest:',
					'    id: rest-1',
					'    path: /api',
					'    get:',
					'      - id: get-1',
					'        path: /users',
					'        to:',
					'          uri: direct:before',
					'',
				].join('\n');
			await source.setText(original);
			await editorView.openEditor(CAMEL_FILE, 0);
			const canvas = await switchToKaotoFrame(driver, false, CAMEL_FILE);
			await new EditorTabs().switchToTab('Rest editor');
			const treeNode = await driver.wait(until.elementLocated(By.css(`.rest-tree ${rest.node}`)), 5_000);
			await clickWhenClickable(driver, await treeNode.findElement(By.id(`${await treeNode.getAttribute('id')}__label`)));
			const property = By.css(`input[name="#.${rest.property}"]`);
			await driver.wait(until.elementLocated(property), 5_000);
			expect(await driver.findElement(property).getAttribute('value'), 'Wrong REST tree selection').to.equal(rest.before);
			await driver.wait(async () => (await driver.findElements(By.css('.rest-right-panel [aria-label="Loading"]'))).length === 0, 5_000);
			const propertyId = await driver.findElement(property).getId();
			const endpoint = By.css('input[aria-label="Endpoint Name"]');
			const endpointId = rest.type === 'Operation' ? await driver.findElement(endpoint).getId() : undefined;
			await driver.executeScript(`
				const observation = { loadingShown: false };
				const observer = new MutationObserver((records) => {
					observation.loadingShown ||= records.some((record) =>
						Array.from(record.addedNodes).some((node) => node instanceof Element &&
							(node.matches('[aria-label="Loading"]') || node.querySelector('[aria-label="Loading"]'))));
				});
				observer.observe(document.querySelector('#envelope-app'), { childList: true, subtree: true });
				window.__kaotoRestObservation = { observation, observer };
			`);
			await canvas.kaotoWebview.switchBack();
			await source.click();
			await source.setText(original.replace(rest.before, rest.after).replace('direct:before', 'direct:after'));
			await editorView.openEditor(CAMEL_FILE, 0);
			const refreshed = await switchToKaotoFrame(driver, false, CAMEL_FILE);
			try {
				await driver.wait(
					async () => (await driver.findElement(property).getAttribute('value')) === rest.after,
					5_000,
					'REST property did not refresh',
				);
				expect(await driver.findElement(property).getId(), 'REST property input was remounted').to.equal(propertyId);
				if (rest.property === 'id') {
					expect(await driver.findElement(By.css('.rest-tree')).getText()).to.contain(rest.after);
				}
				if (endpointId) {
					await driver.wait(
						async () => (await driver.findElement(endpoint).getAttribute('value')) === 'after',
						5_000,
						'REST endpoint did not refresh',
					);
					expect(await driver.findElement(endpoint).getId(), 'REST endpoint input was remounted').to.equal(endpointId);
				}
				expect(
					await driver.executeScript('return window.__kaotoRestObservation.observation.loadingShown;'),
					'REST form showed a loading placeholder',
				).to.equal(false);
				await driver.findElement(property).sendKeys(Key.END, '-edited', Key.TAB);
				if (rest.property === 'id') {
					await driver.wait(
						async () => (await driver.findElement(By.css('.rest-tree')).getText()).includes(`${rest.after}-edited`),
						5_000,
						'REST service label did not follow the ID edited in the form',
					);
					expect(await driver.findElement(By.css('.form-rest-title')).getText()).to.contain(`${rest.after}-edited`);
				}
			} finally {
				await driver.executeScript('window.__kaotoRestObservation.observer.disconnect(); delete window.__kaotoRestObservation;');
				await refreshed.kaotoWebview.switchBack();
			}
			await source.click();
			await driver.wait(async () => (await source.getText()).includes(`${rest.after}-edited`), 5_000, 'REST edits stopped updating source');
		});
	}

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
		const source = new TextEditor(await new EditorView().getEditorGroup(1));
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
		expect(await editor.getText()).to.equal(original);
		expect(await readFile(path.join(temporaryFolder, CAMEL_FILE), 'utf8')).to.equal(original);

		await clickCanvasHistory('Redo');
		await driver.wait(async () => (await editor.isDirty()) && (await kaotoEditor.isDirty()), 5_000, 'Redo should dirty both editors');
		await editor.click();
		expect(await editor.getText()).to.equal(updated);

		// The global command palette can focus the other group when a webview is open.
		await editor.focus();
		await editor.typeText(Key.chord(os.platform() === 'darwin' ? Key.META : Key.CONTROL, 'z'));
		await driver.wait(async () => !(await editor.isDirty()) && !(await kaotoEditor.isDirty()), 5_000, 'Source Undo should clear both dirty markers');
		await clickCanvasHistory('Redo');
		await driver.wait(async () => (await editor.isDirty()) && (await kaotoEditor.isDirty()), 5_000, 'Canvas Redo should restore the source edit');
		await editor.click();
		expect(await editor.getText()).to.equal(updated);
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
			await clickWhenClickable(driver, await driver.findElement(By.id('All')));
			const id = await driver.findElement(By.css('input[name="#.id"]'));
			await driver.wait(until.elementIsVisible(id), 5_000);
			await id.sendKeys('x', Key.TAB);
		} finally {
			await canvas.kaotoWebview.switchBack();
		}
		const source = new TextEditor(await editorView.getEditorGroup(1));
		await source.click();
		await driver.wait(async () => (await source.getText()).includes('id: x'), 5_000, 'Property edit did not reach the source');
		await clickCanvasHistory('Undo');
		await driver.wait(async () => !(await source.isDirty()) && !(await canvas.kaotoEditor.isDirty()), 5_000, 'Undo should clear both dirty markers');
		await source.click();
		expect(await source.getText()).to.equal(original);
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
		await driver.wait(() => existsSync(destination), 5_000, 'Save As target was not created');
		expect(await readFile(destination, 'utf8')).to.equal(updated);
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
		expect(await new TextEditor(await editorView.getEditorGroup(1)).isDirty()).to.equal(false);
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
		const editor = new TextEditor(await editorView.getEditorGroup(1));
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
