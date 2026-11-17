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
import { By, EditorView, Key, until, VSBrowser, WebDriver, WebView } from 'vscode-extension-tester';
import * as path from 'path';
import * as os from 'os';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import { expect } from 'chai';
import { clickWhenClickable, closeEditor, dismissHoverOverlay, openAndSwitchToKaotoFrame } from '../utils/editor';
import { KaotoCanvas, KaotoEditor } from '../pageObjects';

describe('Property panel loading test', function () {
	this.timeout(60_000);

	const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars');

	let driver: WebDriver;
	let kaotoWebview: WebView;

	before(async function () {
		this.timeout(60_000);
		driver = VSBrowser.instance.driver;
	});

	after(async function () {
		if (kaotoWebview) {
			try {
				await kaotoWebview.switchBack();
			} catch {
				// already on the VS Code frame — switchBack is a no-op in that case
			}
		}
		await new EditorView().closeAllEditors();
	});

	it('loads, resizes to minimum width and closes the property panel without horizontal scrollbars', async function () {
		kaotoWebview = (await openAndSwitchToKaotoFrame(workspaceFolder, 'my.camel.yaml', driver, true)).kaotoWebview;

		const timerNode = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from');
		await dismissHoverOverlay(driver);
		await clickWhenClickable(driver, timerNode);

		await KaotoEditor.waitForPropertyPanel(driver);
		const panel = await driver.findElement(By.id('topology-resize-panel'));
		const splitter = await panel.findElement(By.css('[role="separator"]'));
		let previousWidth = (await panel.getRect()).width;
		for (const { direction, steps } of [
			{ direction: null, steps: 0 },
			{ direction: Key.ARROW_RIGHT, steps: 100 },
			{ direction: Key.ARROW_LEFT, steps: 60 },
		]) {
			if (direction) {
				await splitter.sendKeys(...Array<string>(steps).fill(direction), Key.ENTER);
				await driver.wait(
					async () => {
						const width = (await panel.getRect()).width;
						return direction === Key.ARROW_LEFT ? width > previousWidth : width < previousWidth;
					},
					5_000,
					'Property panel did not resize',
				);
				previousWidth = (await panel.getRect()).width;
				if (direction === Key.ARROW_RIGHT) {
					expect(previousWidth, 'Property panel minimum width').to.be.closeTo(210, 1);
				}
			}
			// Checks the scrollbars that are drawn, not scrollWidth against clientWidth: the UI tests zoom VS Code out, so
			// those rounded values can differ by a pixel without any overflow. A drawn horizontal scrollbar takes space
			// below the content, so the box is taller than its content area and borders.
			await driver.wait(
				() =>
					driver.executeScript<boolean>((element: HTMLElement) => {
						const containers = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];
						return containers.every((container) => {
							const style = getComputedStyle(container);
							if (!['auto', 'scroll'].includes(style.overflowX)) {
								return true;
							}
							const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
							return container.offsetHeight - container.clientHeight - borders < 1;
						});
					}, panel),
				5_000,
				'Property panel or a nested container has a horizontal scrollbar',
			);
		}
		await panel.findElement(By.css('[data-testid="tab-All"]')).click();
		// Only the group headings: the collapsed groups also hold info, combo box and menu buttons with aria-expanded,
		// and pressing Enter on those opens their popovers and menus over the fields
		const groupToggles = await panel.findElements(By.css('.kaoto-form__expandable-group .cds--accordion__heading[aria-expanded="false"]'));
		for (const toggle of groupToggles) {
			await toggle.sendKeys(Key.ENTER);
		}
		const body = await panel.findElement(By.css('.canvas-form__body'));
		// Checks what the user sees: the form body scrolls inside the panel, and scrolled to its end it shows the last
		// field. It does not add up scrollTop, clientHeight and scrollHeight, whose rounding differs once the UI tests zoom
		// VS Code out. When the whole form fits, as on a large screen, the last field is visible without scrolling.
		await driver.wait(
			() =>
				driver.executeScript<boolean>(
					(element: HTMLElement, container: HTMLElement) => {
						element.scrollTop = element.scrollHeight;
						const controls = Array.from(element.querySelectorAll<HTMLElement>('input, textarea, select, button')).filter(
							(control) => control.getBoundingClientRect().height > 0,
						);
						const lastControl = controls.at(-1);
						if (!lastControl) {
							return false;
						}
						const bodyRect = element.getBoundingClientRect();
						const panelRect = container.getBoundingClientRect();
						const lastRect = lastControl.getBoundingClientRect();
						return (
							['auto', 'scroll'].includes(getComputedStyle(element).overflowY) &&
							bodyRect.bottom <= panelRect.bottom + 1 &&
							lastRect.top >= bodyRect.top - 1 &&
							lastRect.bottom <= bodyRect.bottom + 1
						);
					},
					body,
					panel,
				),
			5_000,
			'Property panel cannot scroll vertically to the last fields',
		);
		await KaotoEditor.closePropertyPanel(driver);
		await KaotoEditor.waitForPropertyPanelClosed(driver);
	});

	it('selects an added Avro step and opens its properties with one component mode toolbar', async function () {
		const temporaryFolder = await mkdtemp(path.join(os.tmpdir(), 'kaoto-avro-properties-'));
		const filename = 'avro.camel.yaml';
		try {
			await driver.switchTo().defaultContent();
			await new EditorView().closeAllEditors();
			await copyFile(path.join(workspaceFolder, 'my.camel.yaml'), path.join(temporaryFolder, filename));
			kaotoWebview = (await openAndSwitchToKaotoFrame(temporaryFolder, filename, driver, true)).kaotoWebview;

			const addStep = await driver.wait(
				until.elementLocated(By.css('[data-testid="placeholder-node__route.from.steps.1.placeholder"] .placeholder-node__container__image')),
				5_000,
				'Add step placeholder did not appear',
			);
			await clickWhenClickable(driver, addStep);
			await KaotoCanvas.filterCatalogAndSelectTile(driver, 'avro', 'avro');
			await KaotoEditor.waitForPropertyPanel(driver);
			const selectedAvro = By.css('[data-testid="custom-node__route.from.steps.1.to"][data-selected="true"]');
			await driver.wait(until.elementLocated(selectedAvro), 5_000, 'New Avro step was not selected automatically');
			expect(await driver.findElement(By.id('topology-resize-panel')).getText()).to.contain('Avro RPC');

			for (const id of ['avro-first', 'avro-second']) {
				if (id === 'avro-second') {
					const avro = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.1.to');
					await dismissHoverOverlay(driver);
					await clickWhenClickable(driver, avro);
				}
				await KaotoEditor.waitForPropertyPanel(driver);
				await clickWhenClickable(driver, await driver.findElement(By.css('[data-testid="tab-All"]')));

				const toolbar = By.css('[aria-label="Component Mode Toggle Group"]');
				expect(await driver.findElements(toolbar), 'Component mode toolbar before editing').to.have.length(1);
				const idInput = await driver.findElement(By.css('input[name="#.id"]'));
				await idInput.clear();
				await idInput.sendKeys(id, Key.TAB);
				expect(await driver.findElements(toolbar), 'Component mode toolbar after editing').to.have.length(1);
				await KaotoEditor.closePropertyPanel(driver);
				await KaotoEditor.waitForPropertyPanelClosed(driver);
			}
		} finally {
			await driver.switchTo().defaultContent();
			await closeEditor(filename, false);
			await rm(temporaryFolder, { recursive: true, force: true });
		}
	});
});
