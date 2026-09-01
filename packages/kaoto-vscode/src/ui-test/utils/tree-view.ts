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

import { ActivityBar, SideBarView, TreeItem, ViewControl, ViewItemAction, ViewPanelAction, ViewSection, WebDriver } from 'vscode-extension-tester';

export async function getTreeItem(
	driver: WebDriver,
	section: ViewSection | undefined,
	filename: string,
	timeout: number = 30_000,
): Promise<TreeItem | undefined> {
	return await driver.wait(
		async function () {
			try {
				return (await section?.findItem(filename)) as TreeItem;
			} catch (error) {
				return undefined;
			}
		},
		timeout,
		`${filename} was not found within ${await section?.getTitle()} view!`,
		500,
	);
}

/**
 * Expand folder items in Tree Structured View
 * @param treeStructuredSection The Tree Structured View section.
 * @param folderNames The names of the folders to expand.
 * @returns A Promise that resolves when the folders are expanded.
 */
export async function expandFolderItemsInTreeStructuredView(treeStructuredSection: ViewSection | undefined, ...folderNames: string[]): Promise<void> {
	for (const folderName of folderNames) {
		const folderItem = await treeStructuredSection?.findItem(folderName);
		await folderItem?.click();
		await treeStructuredSection?.getDriver().sleep(50);
	}
}

/**
 * Collapse items inside Integrations View
 * @param treeStructuredSection The Tree Structured View section.
 * @returns A Promise that resolves when the items are collapsed.
 */
export async function collapseItemsInsideTreeStructuredView(treeStructuredSection: ViewSection | undefined): Promise<void> {
	const driver = treeStructuredSection?.getDriver();
	if (driver) {
		const collapseItems = await driver.wait(
			async function () {
				await driver.actions().move({ origin: treeStructuredSection, duration: 1_000 }).perform(); // move mouse to bring auto-hided buttons visible again
				await driver.sleep(500); // wait for the buttons to be visible
				return await treeStructuredSection?.getAction('Collapse All');
			},
			5_000,
			`'Collapse All' button was not found!`,
		);
		await collapseItems?.click();
	} else {
		throw new Error('Driver not found');
	}
}

/**
 * Get action button from view section
 * @param section The view section.
 * @param action The action to get the button for.
 * @param timeout The timeout in milliseconds.
 * @returns A Promise that resolves to the action button or undefined if not found.
 */
export async function getViewActionButton(
	kaotoViewContainer: ViewControl | undefined,
	section: ViewSection | undefined,
	action: string,
	timeout: number = 5_000,
): Promise<ViewPanelAction | undefined> {
	await reopenKaotoView(kaotoViewContainer);

	const driver = section?.getDriver();
	if (driver) {
		return await driver.wait(
			async function () {
				await driver.actions().move({ origin: section, duration: 1_000 }).perform(); // move mouse to bring auto-hided buttons visible again
				await driver.sleep(500); // wait for the buttons to be visible
				return await section?.getAction(action);
			},
			timeout,
			`'${action}' action button was not found!`,
			500,
		);
	} else {
		return undefined;
	}
}

export async function getTreeItemActionButton(
	kaotoViewContainer: ViewControl | undefined,
	treeItem: TreeItem,
	action: string,
	timeout: number = 5_000,
): Promise<ViewItemAction | undefined> {
	await reopenKaotoView(kaotoViewContainer);

	const driver = treeItem.getDriver();
	return await driver.wait(
		async function () {
			await driver.actions().move({ origin: treeItem, duration: 1_000 }).perform(); // move mouse to bring auto-hided buttons visible again
			await driver.sleep(500); // wait for the buttons to be visible
			return await treeItem.getActionButton(action);
		},
		timeout,
		`'${action}' action button was not found!`,
		500,
	);
}

/**
 * Reopen Kaoto view to workaround 'stale element reference: stale element not found in the current frame' ExTester issue
 * @param kaotoViewContainer The Kaoto view container.
 * @returns A Promise that resolves when the view is reopened.
 */
async function reopenKaotoView(kaotoViewContainer: ViewControl | undefined): Promise<void> {
	await kaotoViewContainer?.closeView();
	await kaotoViewContainer?.getDriver().sleep(500);
	await kaotoViewContainer?.openView();
}

/**
 * Close views by name
 * @param kaotoViewContainer The Kaoto view container.
 * @param views The names of the views to collapse.
 * @returns A Promise that resolves when the views are closed.
 */
export async function collapseViews(kaotoView: SideBarView | undefined, ...views: string[]): Promise<void> {
	if (kaotoView) {
		for (const view of views) {
			const section = await kaotoView.getContent().getSection(view);
			if (section) {
				await section.collapse();
				await kaotoView.getContent().getDriver().sleep(50);
			}
		}
	}
}

/**
 * Expand views by name
 * @param kaotoViewContainer The Kaoto view container.
 * @param views The names of the views to expand.
 * @returns A Promise that resolves when the views are expanded.
 */
export async function expandViews(kaotoView: SideBarView | undefined, ...views: string[]): Promise<void> {
	if (kaotoView) {
		for (const view of views) {
			const section = await kaotoView.getContent().getSection(view);
			await section?.expand();
			await section?.getDriver().wait(
				async () => {
					const items = await section?.getVisibleItems();
					if (items && items?.length > 0) {
						return items as TreeItem[];
					} else {
						return undefined;
					}
				},
				5_000,
				`${view} section items were not loaded properly`,
				500,
			);
		}
	}
}

/**
 * Get Kaoto view control and collapse all views
 * @returns A Promise that resolves to the Kaoto view control.
 */
export async function getKaotoViewControl(): Promise<{ kaotoViewContainer: ViewControl | undefined; kaotoView: SideBarView | undefined }> {
	const kaotoViewContainer = await new ActivityBar().getViewControl('Kaoto');
	const kaotoView = await kaotoViewContainer?.openView();
	await collapseViews(kaotoView, 'Integrations', 'Deployments', 'OpenAPI', 'Tests', 'Help & Feedback');
	return { kaotoViewContainer, kaotoView };
}
