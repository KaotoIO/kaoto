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
import { after, before, EditorView, InputBox, ModalDialog, NotificationType, VSBrowser, WebDriver, WebView, Workbench } from 'vscode-extension-tester';
import { checkTopologyLoaded, openAndSwitchToKaotoFrame, switchToKaotoFrame } from '../utils/editor';
import { clickCatalogStatusBarItem } from '../utils/workbench';
import { join } from 'path';
import { rmSync } from 'fs';
import { expect } from 'chai';
import { CatalogModal } from '../pageObjects';
import { openResourcesAndWaitForActivation } from '../utils/extension';

describe('User Settings', function () {
	this.timeout(240_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars');

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

	describe('Default catalogs', function () {
		afterEach(async function () {
			try {
				await kaotoWebview.switchBack();
				await VSBrowser.instance.waitForWorkbench(5_000);
			} catch {
				// probably test not failed in Kaoto UI, just continue
			}
			await new EditorView().closeAllEditors();
		});

		after(async function () {
			rmSync(join(WORKSPACE_FOLDER, '.vscode'), { recursive: true, force: true });
		});

		beforeEach(async function () {
			kaotoWebview = (await openAndSwitchToKaotoFrame(WORKSPACE_FOLDER, 'my.camel.yaml', driver, true)).kaotoWebview;
			await checkTopologyLoaded(driver);
		});

		it(`Select 'community' catalog and check "Red Hat" components are not available`, async function () {
			this.timeout(90_000);

			// switch back from Kaoto webview to interact with VS Code status bar
			await kaotoWebview.switchBack();
			await VSBrowser.instance.waitForWorkbench(5_000);

			// open catalog picker via status bar and select a community 'Main' runtime catalog
			await clickCatalogStatusBarItem(driver);
			const input = await InputBox.create(5_000);
			const picks = await input.getQuickPicks();

			// find and select the first 'Camel Main' item that is NOT a Red Hat version
			for (const pick of picks) {
				const label = await pick.getLabel();
				if (label.startsWith('Camel Main') && !label.toLowerCase().includes('redhat')) {
					await pick.select();
					break;
				}
			}

			// wait for the "Reopen" notification and click it
			await clickReopenNotification();

			// switch back to Kaoto webview frame after editor reload
			kaotoWebview = (await switchToKaotoFrame(driver, false)).kaotoWebview;
			await checkTopologyLoaded(driver, 15_000);

			const catalogWindow = await CatalogModal.open(driver, 15_000).then((w) => CatalogModal.switchToListView(driver, w, 10_000));

			const providers = await CatalogModal.getProviderNames(driver, catalogWindow);
			expect(providers).to.not.contain('Red Hat');
			expect(providers).to.contain('Community');

			// check first component does not contain 'Red Hat' flag
			const provider = await CatalogModal.getFirstItemProvider(catalogWindow);
			expect(provider).to.not.be.equal('Red Hat');

			// switch catalog window back to gallery view
			await CatalogModal.switchToGalleryView(driver, catalogWindow);
			await CatalogModal.close(catalogWindow);
		});

		it(`Select 'redhat' catalog and check new components are available`, async function () {
			this.timeout(90_000);

			// switch back from Kaoto webview to interact with VS Code status bar
			await kaotoWebview.switchBack();
			await VSBrowser.instance.waitForWorkbench(5_000);

			// open catalog picker via status bar and select a Red Hat catalog
			await clickCatalogStatusBarItem(driver);
			const input = await InputBox.create(5_000);
			const picks = await input.getQuickPicks();

			// find and select the first catalog with 'redhat' in the version
			for (const pick of picks) {
				const label = await pick.getLabel();
				if (label.toLowerCase().includes('redhat')) {
					await pick.select();
					break;
				}
			}

			// wait for the "Reopen" notification and click it
			await clickReopenNotification();

			// switch back to Kaoto webview frame after editor reload
			kaotoWebview = (await switchToKaotoFrame(driver, false)).kaotoWebview;
			await checkTopologyLoaded(driver, 15_000);

			const catalogWindow = await CatalogModal.open(driver, 15_000).then((w) => CatalogModal.switchToListView(driver, w, 10_000));

			const providers = await CatalogModal.getProviderNames(driver, catalogWindow);
			expect(providers).to.contain('Red Hat');
			expect(providers).to.contain('Community');

			await CatalogModal.toggleProvider(driver, catalogWindow, 'Community'); // uncheck 'Community' provider

			// check first component contains 'Red Hat' flag
			const provider = await CatalogModal.getFirstItemProvider(catalogWindow);
			expect(provider).to.be.equal('Red Hat');

			// switch catalog window back to gallery view
			await CatalogModal.switchToGalleryView(driver, catalogWindow);
			await CatalogModal.close(catalogWindow);
		});
	});

	async function clickReopenNotification(): Promise<void> {
		await driver.wait(
			async () => {
				try {
					const notificationsCenter = await new Workbench().openNotificationsCenter();
					const notifications = await notificationsCenter.getNotifications(NotificationType.Info);
					for (const notification of notifications) {
						const message = await notification.getMessage();
						if (message.includes('Reopen editor to apply changes')) {
							await notification.takeAction('Reopen');
							return true;
						}
					}
					return false;
				} catch {
					return false;
				}
			},
			15_000,
			'Notification with "Reopen" button was not found after catalog change',
			1_000,
		);
		await driver.sleep(1_000); // allow editor to reopen
	}
});
