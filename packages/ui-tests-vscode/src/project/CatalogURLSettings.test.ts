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
import { ActivityBar, after, before, EditorView, InputBox, ModalDialog, TextSetting, VSBrowser, WebDriver, WebView, Workbench } from 'vscode-extension-tester';
import { checkTopologyLoaded, closeEditor, openAndSwitchToKaotoFrame } from '../utils/editor';
import { resetUserSettings } from '../utils/settings';
import { clickCatalogStatusBarItem, dismissBlockingModal } from '../utils/workbench';
import { join } from 'path';
import { expect } from 'chai';
import { openResourcesAndWaitForActivation } from '../utils/extension';

describe('User Settings', function () {
	this.timeout(240_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars');
	const CATALOG_URL = 'https://raw.githubusercontent.com/KaotoIO/camel-catalog/refs/heads/main/catalog/index.json';
	const CATALOG_SETTINGS_ID = 'kaoto.catalog.url';

	let driver: WebDriver;
	let kaotoWebview: WebView;

	before(async function () {
		driver = VSBrowser.instance.driver;
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER);
	});

	after(async function () {
		if (kaotoWebview !== undefined) {
			try {
				await kaotoWebview.switchBack();
			} catch {
				// probably test not failed in Kaoto UI, just continue
			}
		}
		try {
			await new EditorView().closeAllEditors();
		} catch {
			// handle modal dialog (e.g. "Save/Don't Save") that blocks editor close
			try {
				const dialog = new ModalDialog();
				await dialog.pushButton("Don't Save");
				await new EditorView().closeAllEditors();
			} catch {
				// if dialog handling also fails, use command palette as last resort
				await new Workbench().executeCommand('View: Close All Editors');
			}
		}
	});

	describe('Custom catalogs', function () {
		before(async function () {
			// provide the Catalog URL using Settings UI editor
			const settings = await new Workbench().openSettings();
			const textSetting = await driver.wait(
				async () => {
					return (await settings.findSetting('Url', 'Kaoto', 'Catalog')) as TextSetting;
				},
				5_000,
				'Looking for "Kaoto > Catalog: Url" text field.',
			);
			await textSetting.setValue(CATALOG_URL);
			await driver.sleep(1_000); // stabilize tests which are sometimes failing on macOS CI
			await closeEditor('Settings', true);

			await driver.wait(
				async () => {
					try {
						const viewControls = await new ActivityBar().getViewControls();
						return viewControls.length > 0;
					} catch {
						return false;
					}
				},
				10_000,
				'The activityBar is not reachable after 5 seconds. Maybe the modal dialog has not been successfully closed previously?',
			);
			// close sidebar
			await (await new ActivityBar().getViewControl('Explorer'))?.closeView();

			// open the integration file using Kaoto editor
			kaotoWebview = (await openAndSwitchToKaotoFrame(WORKSPACE_FOLDER, 'my.camel.yaml', driver, true)).kaotoWebview;
			await checkTopologyLoaded(driver);
		});

		after(async function () {
			if (kaotoWebview !== undefined) {
				try {
					await kaotoWebview.switchBack();
				} catch {
					// probably test not failed in Kaoto UI, just continue
				}
			}
			resetUserSettings(CATALOG_SETTINGS_ID);
			// the editor in this step needs to be closed using command palette
			// because in some cases, specially on Windows, there was hover displayed which was blocking the editor close button
			await new Workbench().executeCommand('View: Close Editor');
			// resetUserSettings rewrites settings.json on disk while VS Code still has it open, so
			// closing can raise "Do you want to save the changes you made to settings.json?". Left up,
			// its backdrop blocks every click for the rest of the run.
			await dismissBlockingModal(driver);
		});

		const runtimeSelectors = ['Main', 'Quarkus', 'Spring Boot'];

		it('Check custom Kaoto catalogs loaded for all runtimes', async function () {
			this.timeout(60_000);

			// switch back from Kaoto webview to interact with VS Code status bar
			await kaotoWebview.switchBack();
			await VSBrowser.instance.waitForWorkbench(5_000);

			// open catalog picker via status bar
			await clickCatalogStatusBarItem(driver);
			const input = await InputBox.create(5_000);
			const picks = await input.getQuickPicks();

			const labels: string[] = [];
			for (const pick of picks) {
				labels.push(await pick.getLabel());
			}

			// verify catalogs for each runtime are present
			for (const runtime of runtimeSelectors) {
				const runtimeItems = labels.filter((label) => label.startsWith(`Camel ${runtime}`));
				expect(runtimeItems.length, `Expected catalog items for runtime '${runtime}'`).to.be.greaterThan(0);
				expect(runtimeItems).to.satisfy((items: string[]) => items.every((item) => item.startsWith(`Camel ${runtime}`)));
			}

			// close the quick pick without selecting
			await input.cancel();

			// switch back into webview frame
			await kaotoWebview.switchToFrame();
		});
	});
});
