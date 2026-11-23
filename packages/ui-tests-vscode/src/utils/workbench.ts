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

import {
	BottomBarPanel,
	By,
	InputBox,
	MarkerType,
	ModalDialog,
	NotificationType,
	ProblemsView,
	StatusBar,
	WebDriver,
	Workbench,
} from 'vscode-extension-tester';

/**
 * Dismiss a modal dialog if one is currently blocking the workbench.
 *
 * VS Code renders modals behind a full-window backdrop (`.monaco-dialog-modal-block`)
 * that swallows every click. A single undismissed dialog therefore fails every later
 * test in the run with `ElementClickInterceptedError`, naming whatever element that
 * test happened to click rather than anything to do with the real cause -- and the
 * suites that only *read* the UI keep passing, which makes the pattern hard to spot.
 *
 * The tests hit this with the "Do you want to save the changes you made to
 * settings.json?" prompt, because the settings helpers rewrite `settings.json` on disk
 * while VS Code still has it open.
 *
 * Best effort and safe to call unconditionally: it returns immediately when no dialog
 * is up, and reports whether it dismissed one.
 *
 * Falls back to 'Cancel' rather than to the opposite answer when the preferred button is
 * missing: 'Cancel' still clears the backdrop, while answering "Don't Save" to a caller
 * that asked to save would silently discard the change the test depends on.
 *
 * @param driver The WebDriver instance.
 * @param preferredButton Button to press when the dialog offers it.
 * @returns true when a dialog was dismissed.
 */
export async function dismissBlockingModal(driver: WebDriver, preferredButton: string = "Don't Save"): Promise<boolean> {
	if ((await driver.findElements(By.css('.monaco-dialog-modal-block'))).length === 0) {
		return false;
	}
	for (const button of [preferredButton, 'Cancel']) {
		try {
			await new ModalDialog().pushButton(button);
			return true;
		} catch {
			// dialog does not offer this button, try the next one
		}
	}
	console.log('a modal dialog is blocking the workbench and could not be dismissed');
	return false;
}

/**
 * Handle input path selection
 * When the provided path is not exactly formatted to the OS specificities, there is first a `Select` button and then a `Confirm`
 * See also https://github.com/redhat-developer/vscode-extension-tester/issues/1778
 * @param input The input box to handle the path selection.
 */
export async function handleInputPathSelection(input: InputBox): Promise<void> {
	const nextButton = await input.findElement(By.className('monaco-button'));
	if (nextButton && (await nextButton.getText()) === 'Select') {
		await input.confirm(); // confirm the path selection
	}
}

/**
 * Click the status bar item that shows the selected Camel catalog, which opens the catalog picker.
 *
 * @param driver The WebDriver instance.
 */
export async function clickCatalogStatusBarItem(driver: WebDriver): Promise<void> {
	const statusBar = new StatusBar();
	const catalogItem = await driver.wait(
		async () => {
			const items = await statusBar.getItems();
			for (const item of items) {
				const text = await item.getText();
				if (text.includes('Camel')) {
					return item;
				}
			}
			return undefined;
		},
		10_000,
		'Catalog status bar item containing "Camel" was not found',
	);
	if (!catalogItem) {
		throw new Error('Catalog status bar item containing "Camel" was not found');
	}
	await catalogItem.click();
}

/**
 * Read the accessible label of a status bar item, which gives its text and its tooltip, such as
 * "check Camel LS, Camel Language Server is running".
 *
 * The status bar re-renders an item when its text changes, so a caller that polls should expect a stale element error.
 *
 * @param text Text that the label contains, such as the tooltip or the name of the item.
 * @returns The label of the first item that contains the text, or undefined while no item does.
 */
export async function getStatusBarItemLabel(text: string): Promise<string | undefined> {
	for (const item of await new StatusBar().getItems()) {
		const label = await item.getAttribute('aria-label');
		if (label?.includes(text)) {
			return label;
		}
	}
	return undefined;
}

/**
 * Read the messages of the notifications. Opens the notifications center and closes it again, also when a read fails.
 *
 * A notification that closes while it is read, such as the progress of a download, is left out, and the messages of the
 * others are kept.
 *
 * @param type Type of the notifications to read.
 * @returns The messages, such as "Could not download Camel Language Server 1.36.0: HTTP 429 for https://...".
 */
export async function getNotificationMessages(type: NotificationType = NotificationType.Any): Promise<string[]> {
	const center = await new Workbench().openNotificationsCenter();
	try {
		const notifications = await center.getNotifications(type);
		const reads = await Promise.allSettled(notifications.map((notification) => notification.getMessage()));
		return reads.filter((read) => read.status === 'fulfilled').map((read) => read.value);
	} finally {
		await center.close();
	}
}

/**
 * Wait until the Problems view lists a problem of the file that contains the message. Opens the Problems view.
 *
 * @param driver The WebDriver instance.
 * @param fileName Name of the file, see getProblems.
 * @param message Text of the problem, such as "Unknown option".
 * @param timeout Time to wait in ms.
 */
export async function waitForProblem(driver: WebDriver, fileName: string, message: string, timeout: number): Promise<void> {
	const problemsView = await new BottomBarPanel().openProblemsView();
	let problems: string[] = [];
	try {
		await driver.wait(
			async () => {
				// the view re-renders its rows while problems come in
				problems = await getProblems(problemsView, fileName).catch(() => problems);
				return problems.some((problem) => problem.includes(message));
			},
			timeout,
			`The Problems view listed no "${message}" problem for ${fileName} within ${timeout} ms`,
			1_000,
		);
	} catch (error) {
		throw new Error(`${(error as Error).message}. Its problems of the file: ${problems.join(' | ') || 'none'}`, { cause: error });
	}
}

/**
 * Read the problems that the Problems view lists under the file. The view tells files apart by their name and a folder
 * relative to the workspace, so give the files that a test checks names that no other file with problems has.
 *
 * @param problemsView The open Problems view.
 * @param fileName Name of the file, such as "application.properties".
 * @returns The accessible labels of the problems, such as
 * "Error: Unknown option at line 9 and character 9. generated by Apache Camel validation".
 */
export async function getProblems(problemsView: ProblemsView, fileName: string): Promise<string[]> {
	const markers = await problemsView.getAllVisibleMarkers(MarkerType.Any);
	const rows = await Promise.all(markers.map(async (marker) => ({ type: await marker.getType(), label: await marker.getText() })));
	const problems: string[] = [];
	let inFile = false;
	for (const { type, label } of rows) {
		if (type === MarkerType.File) {
			// "<count> problems in file <name> of folder <folder>"
			inFile = label.includes(` in file ${fileName} of folder `);
		} else if (inFile) {
			problems.push(label);
		}
	}
	return problems;
}
