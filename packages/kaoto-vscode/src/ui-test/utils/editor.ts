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

import { assert } from 'chai';
import * as path from 'path'; // NOSONAR
import { ActivityBar, By, createWaitHelper, CustomEditor, EditorView, VSBrowser, WebDriver, WebElement, WebView } from 'vscode-extension-tester';
import { KaotoEditor } from '../pageObjects/KaotoEditor';
import { kaotoLocators } from '../pageObjects/locators';
import { dismissBlockingModal } from './workbench';

export async function openAndSwitchToKaotoFrame(
	workspaceFolder: string,
	fileNameToOpen: string,
	driver: WebDriver,
	checkNotDirty: boolean,
	timeout: number = 10_000,
	interval: number = 2_000,
): Promise<{ kaotoWebview: WebView; kaotoEditor: CustomEditor }> {
	await VSBrowser.instance.openResources(path.join(workspaceFolder, fileNameToOpen), async () => {
		await driver.sleep(interval);
		// Only wait for the editor tab to exist. It is deliberately not required to be the
		// *active* one here: a panel opened during extension activation (the "What's New"
		// webview, which uses `ViewColumn.Active`) can take focus and never hand it back,
		// which used to fail this wait outright. Making the Kaoto editor active is
		// `switchToKaotoFrame`'s job, where it can be retried and verified.
		await driver.wait(
			async () => (await new EditorView().getOpenEditorTitles()).includes(fileNameToOpen),
			timeout,
			`Cannot open file '${fileNameToOpen}' in ${timeout}ms`,
			interval,
		);
	});
	return await switchToKaotoFrame(driver, checkNotDirty, fileNameToOpen);
}

/**
 * Switch the driver into the Kaoto editor webview.
 *
 * Two ExTester behaviors make a naive `switchToFrame()` unreliable, so the result is
 * always verified before it is handed back:
 *
 * 1. `WebviewMixin.switchToFrame()` does `if (!view) return;` -- when no webview iframe
 *    matches it resolves successfully without switching, leaving the driver in the
 *    workbench DOM.
 * 2. `WebView.getViewToSwitchTo()` picks the iframe with the largest rect overlap with
 *    the editor. Two webviews stacked in one editor group (for instance the Kaoto editor
 *    plus the "What's New" panel, which opens with `ViewColumn.Active`) have identical
 *    rects, so geometry cannot tell them apart.
 *
 * Both failures otherwise surface much later as a `NoSuchElementError` naming a valid
 * Kaoto selector. Checking for `#envelope-app` -- the Kaoto webview root, absent from the
 * workbench DOM and from every other webview -- turns them into an immediate, honest error.
 *
 * @param driver The WebDriver instance.
 * @param checkNotDirty Assert the editor is not dirty when opening it.
 * @param expectedTitle Title of the editor tab the webview belongs to, when known.
 */
export async function switchToKaotoFrame(
	driver: WebDriver,
	checkNotDirty: boolean,
	expectedTitle?: string,
): Promise<{ kaotoWebview: WebView; kaotoEditor: CustomEditor }> {
	let kaotoEditor = new CustomEditor();
	let kaotoWebview: WebView = kaotoEditor.getWebView();
	await driver.wait(
		async () => {
			try {
				await ensureKaotoEditorIsActive(expectedTitle);
				kaotoEditor = new CustomEditor();
				kaotoWebview = kaotoEditor.getWebView();
				await kaotoWebview.switchToFrame(10_000);
				if (await isInsideKaotoWebview(driver)) {
					if (checkNotDirty) {
						await kaotoWebview.switchBack();
						assert.isFalse(await kaotoEditor.isDirty(), 'The Kaoto editor should not be dirty when opening it.');
						await kaotoWebview.switchToFrame(10_000);
					}
					return true;
				}
				// Landed in the workbench DOM or in a foreign webview -- get back out and retry.
				await kaotoWebview.switchBack();
				return false;
			} catch (exception) {
				console.log('failed to switch to frame ' + exception);
				return false;
			}
		},
		30000,
		'Failed to switch to the Kaoto editor webview',
		1000,
	);
	return { kaotoWebview, kaotoEditor };
}

/**
 * Whether the driver is currently inside the Kaoto editor webview.
 *
 * Requires the driver to already be switched into a frame; returns false when it is
 * still in the workbench document or inside some other extension's webview.
 */
async function isInsideKaotoWebview(driver: WebDriver): Promise<boolean> {
	const envelope = await driver.findElements(By.css(kaotoLocators.KaotoEditor.envelopeApp));
	return envelope.length > 0;
}

/**
 * Make sure the Kaoto editor -- not some other panel that stole focus -- is the active tab
 * before its webview is resolved, since `new CustomEditor()` binds to whatever is active.
 *
 * Only acts when the active tab is not already the expected one, so a suite that is behaving
 * normally pays nothing and VS Code is not fought for focus once per second. Focusing is best
 * effort: this runs inside a retry loop, and `#envelope-app` is what ultimately decides
 * success, so a transient failure here is worth another attempt rather than an exception.
 *
 * Callers that do not know which tab to expect skip this entirely and rely on the
 * `#envelope-app` verification alone.
 */
async function ensureKaotoEditorIsActive(expectedTitle?: string): Promise<void> {
	if (expectedTitle === undefined) {
		return;
	}
	try {
		const activeTab = await new EditorView().getActiveTab();
		if ((await activeTab?.getTitle()) === expectedTitle) {
			return;
		}
		await new EditorView().openEditor(expectedTitle);
	} catch (exception) {
		console.log(`failed to focus editor '${expectedTitle}' ` + exception);
	}
}

export async function checkEmptyCanvasLoaded(driver: WebDriver, timeout: number = 10_000) {
	await KaotoEditor.waitForEmptyCanvas(driver, timeout);
}

export async function checkTopologyLoaded(driver: WebDriver, timeout: number = 10_000) {
	await KaotoEditor.waitForTopology(driver, timeout);
}

export async function closeEditor(title: string, save?: boolean) {
	await new EditorView().closeEditor(title);
	await dismissBlockingModal(VSBrowser.instance.driver, save ? 'Save' : "Don't Save");
}

export async function dismissHoverOverlay(driver: WebDriver) {
	const waitHelper = createWaitHelper(driver);
	const hoverContents = await driver.findElements(By.css('.hover-contents'));
	for (const hoverContent of hoverContents) {
		if (await hoverContent.isDisplayed()) {
			await driver
				.actions()
				.move({ x: 5, y: 5, origin: driver.findElement(By.css('body')) })
				.perform();
			await waitHelper.forNotVisible(hoverContent, { timeout: 2_000, message: 'Hover overlay is still visible' });
			break;
		}
	}
}

export async function clickWhenClickable(driver: WebDriver, element: WebElement, timeout = 5_000) {
	const waitHelper = createWaitHelper(driver);
	await waitHelper.forVisible(element, { timeout });
	await waitHelper.forEnabled(element, { timeout });
	await waitHelper.forStable(element, { timeout });
	await waitHelper.forClickable(element, { timeout });
	await element.click();
}

/**
 * Workaround for https://github.com/KaotoIO/kaoto/issues/2571
 */
export async function workaroundToRedrawContextualMenu(kaotoWebview: WebView) {
	await kaotoWebview.switchBack();
	const explorerView = await new ActivityBar().getViewControl('Explorer');
	await explorerView?.openView();
	await explorerView?.getDriver().sleep(500);
	await explorerView?.closeView();
	await explorerView?.getDriver().sleep(500);
	await kaotoWebview.switchToFrame();
}
