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

import { resolve } from 'node:path';
import { ActivityBar, By, ExtensionsViewItem, ExtensionsViewSection, StatusBar, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { getNotificationMessages, getStatusBarItemLabel, waitForProblem } from './workbench';

/** The folder or workspace that the last call of openResourcesAndWaitForActivation opened. */
let openedResource: string | undefined;

export async function openResourcesAndWaitForActivation(
	path: string,
	waitForActivation: boolean = true,
	timeout: number = 150_000,
	interval: number = 2_500,
): Promise<void> {
	// Opening the folder that is already open does not reload the window: the extension stays active
	// and shows no status bar message to wait for. The open and the pause still run, because they keep
	// the next click on the Kaoto view apart from the after hook's click that closed it: VS Code ignores
	// a click on a view container within 300 ms of the previous one.
	const resource = resolve(path);
	const alreadyOpen = openedResource === resource;
	// Forget the last folder first: when the open or the activation wait fails, the window may already
	// show the new one.
	openedResource = undefined;
	await VSBrowser.instance.openResources(path, async () => {
		await VSBrowser.instance.driver.sleep(interval);
		if (waitForActivation && !alreadyOpen) {
			await waitForExtensionActivation('Kaoto', timeout, interval);
		}
	});
	openedResource = resource;
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
export async function waitForExtensionActivation(extensionName: string = 'Kaoto', timeout: number = 150_000, interval: number = 2_500): Promise<void> {
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

/** The status bar item of the Camel Language Server has this in its label */
const CAMEL_LANGUAGE_SERVER = 'Camel Language Server';

/**
 * Wait until the status bar item of the Camel Language Server says that it runs. The item shows only while the active tab
 * is a file that the server serves, and the server starts only when the setting kaoto.lsp.enabled is on.
 *
 * Fails at once when the item says that the server failed to start. The error then gives the state of the server, see
 * describeCamelLanguageServer.
 *
 * @param driver The WebDriver instance.
 * @param timeout Time to wait in ms; the first start downloads the server JAR.
 */
export async function waitForCamelLanguageServer(driver: WebDriver, timeout: number): Promise<void> {
	let status: string | undefined;
	try {
		await driver.wait(
			async () => {
				// the status bar re-renders the item when its text changes
				status = (await getStatusBarItemLabel(CAMEL_LANGUAGE_SERVER).catch(() => undefined)) ?? status;
				if (status?.includes('failed to start')) {
					throw new Error('The Camel Language Server failed to start');
				}
				return status?.includes('is running') === true;
			},
			timeout,
			`The Camel Language Server was not running within ${timeout} ms`,
			1_000,
		);
	} catch (error) {
		throw new Error(`${(error as Error).message}. ${await describeCamelLanguageServer(status)}`, { cause: error });
	}
}

/**
 * Wait until the Problems view lists a problem of the file that contains the message, as waitForProblem does. When none
 * shows up, the error also gives the state of the Camel Language Server, see describeCamelLanguageServer.
 *
 * @param driver The WebDriver instance.
 * @param fileName Name of the file, see getProblems.
 * @param message Text of the diagnostic, such as "Unknown option".
 * @param timeout Time to wait in ms.
 */
export async function waitForCamelLanguageServerDiagnostic(driver: WebDriver, fileName: string, message: string, timeout: number): Promise<void> {
	try {
		await waitForProblem(driver, fileName, message, timeout);
	} catch (error) {
		throw new Error(`${(error as Error).message}. ${await describeCamelLanguageServer()}`, { cause: error });
	}
}

/**
 * Describe the state of the Camel Language Server for an error: the label of its status bar item and the notifications,
 * which tell why the server does not run or report, such as a missing Java or a failed download. Best effort, as it only
 * adds to an error.
 *
 * @param lastStatus The last label of the status bar item that the caller saw, for when the item no longer shows.
 */
async function describeCamelLanguageServer(lastStatus?: string): Promise<string> {
	const status = (await getStatusBarItemLabel(CAMEL_LANGUAGE_SERVER).catch(() => undefined)) ?? lastStatus;
	const notifications = await getNotificationMessages().catch((): string[] => []);
	return `Its status bar item: ${status ?? 'not shown'}. Notifications: ${notifications.join(' | ') || 'none'}`;
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
