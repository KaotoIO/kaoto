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

import { ActivityBar, By, ExtensionsViewItem, ExtensionsViewSection, StatusBar, VSBrowser } from 'vscode-extension-tester';

export async function openResourcesAndWaitForActivation(
	path: string,
	waitForActivation: boolean = true,
	timeout: number = 150_000,
	interval: number = 2_500,
): Promise<void> {
	await VSBrowser.instance.openResources(path, async () => {
		await VSBrowser.instance.driver.sleep(interval);
		if (waitForActivation) {
			await waitForExtensionActivation('Kaoto', timeout, interval);
		}
	});
}

/**
 * Waits for the extension to be fully activated.
 *
 * Uses status bar messages as the primary detection mechanism:
 * 1. "Kaoto: ..." in-progress messages indicate activation is ongoing
 * 2. "Kaoto: ... ready" or "not found" indicate activation finished
 * 3. Messages disappeared after being seen means "ready" was shown between polls
 * 4. No messages ever seen falls back to Extensions view activation time check
 *
 * @param extensionName Display name of the extension to check
 * @param timeout Maximum time to wait for activation in milliseconds
 * @param interval Polling interval in milliseconds
 */
export async function waitForExtensionActivation(extensionName: string, timeout: number, interval: number): Promise<void> {
	const driver = VSBrowser.instance.driver;
	let sawKaotoMessage = false;

	await driver.wait(
		async function () {
			const statusResult = await getKaotoStatusBarState();

			if (statusResult === 'ready') {
				return true;
			}

			if (statusResult === 'in-progress') {
				sawKaotoMessage = true;
				return false;
			}

			// No Kaoto status bar messages found
			if (sawKaotoMessage) {
				// Previously saw activation messages but now they're gone --
				// the transient "ready" message appeared and disappeared between polls
				return true;
			}

			// Never saw any Kaoto messages -- fall back to Extensions view check
			return await extensionIsActivated(extensionName);
		},
		timeout,
		`Extension '${extensionName}' was not activated within ${timeout}ms. ` +
			`Check that the extension activates properly and status bar messages complete.`,
		interval,
	);
}

type KaotoStatusBarState = 'ready' | 'in-progress' | 'none';

/**
 * Checks status bar items for Kaoto activation messages.
 *
 * @returns 'in-progress' if an activation message is found (e.g. "Kaoto: Checking JBang...")
 * @returns 'ready' if a completion message is found (e.g. "Kaoto: JBang ready", "Kaoto: JBang not found")
 * @returns 'none' if no Kaoto messages are present in the status bar
 */
async function getKaotoStatusBarState(): Promise<KaotoStatusBarState> {
	// prettier-ignore
	try {
		const statusBar = new StatusBar();
		const statusBarItems = await statusBar.getItems();

		for (const item of statusBarItems) {
			const text = await item.getText();
			if (text.includes('Kaoto:')) {
				if (text.includes('ready') || text.includes('not found')) {
					return 'ready';
				}
				return 'in-progress';
			}
		}
		return 'none';
	} catch (error) { // NOSONAR - Polling loop: swallowing the error is intentional — catch returns 'none' as a fallback; driver.wait retries until timeout
		return 'none';
	}
}

/**
 * Open the extension page.
 * @param name Display name of the extension.
 * @param timeout Timeout in ms.
 * @returns A tuple -- marketplace and ExtensionViewItem object tied with the extension.
 */
async function openExtensionPage(name: string, timeout: number): Promise<ExtensionsViewItem> {
	let item: ExtensionsViewItem;
	const driver = VSBrowser.instance.driver;

	await driver.wait(
		async () => {
			// prettier-ignore
			try {
				const extensionsView = await (await new ActivityBar().getViewControl('Extensions'))?.openView();
				const marketplace = (await extensionsView?.getContent().getSection('Installed')) as ExtensionsViewSection;
				item = (await marketplace.findItem(`@installed ${name}`)) as ExtensionsViewItem;
				return true;
			} catch (e) { // NOSONAR - Polling loop inside driver.wait: returns false to trigger a retry; driver.wait throws TimeoutError if deadline exceeded
				return false;
			}
		},
		timeout,
		'Page was not rendered',
	);
	return item!;
}

async function extensionIsActivated(displayName: string): Promise<boolean> {
	let extensionControl = await new ActivityBar().getViewControl('Extensions');
	// prettier-ignore
	try {
		const item = await openExtensionPage(displayName, 10_000);
		const activationTime = await item?.findElement(By.className('activationTime'));
		if (activationTime) {
			await extensionControl?.closeView();
			return true;
		} else {
			await extensionControl?.closeView();
			return false;
		}
	} catch (err) { // NOSONAR - openExtensionPage or findElement may throw while the page is not yet rendered; returning false is intentional
		await extensionControl?.closeView();
		return false;
	}
}
