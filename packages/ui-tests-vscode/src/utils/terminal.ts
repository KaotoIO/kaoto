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

import { BottomBarPanel, TerminalView, WebDriver } from 'vscode-extension-tester';

/**
 * Checks if the terminal view has the specified texts in the given textArray.
 * @param driver The WebDriver instance to use.
 * @param textArray An array of strings representing the texts to search for in the terminal view.
 * @param interval (Optional) The interval in milliseconds to wait between checks. Default is 2000ms.
 * @param timeout (Optional) The timeout in milliseconds. Default is 60000ms.
 * @returns A Promise that resolves to a boolean indicating whether the terminal view has the texts or not.
 */
export async function waitUntilTerminalHasText(driver: WebDriver, textArray: string[], interval = 2000, timeout = 60000): Promise<void> {
	await driver.sleep(interval);
	await driver.wait(
		async function () {
			// prettier-ignore
			try {
				const terminal = await activateTerminalView();
				const terminalText = await terminal.getText();
				for (const text of textArray) {
					if (!terminalText.includes(text)) {
						return false;
					}
				}
				return true;
			} catch (err) { // NOSONAR
				return false;
			}
		},
		timeout,
		`Failed while waiting on terminal to has text: ${textArray}`,
		interval,
	);
}

/**
 * Click on button to kill running process in Terminal View
 */
export async function killTerminal(): Promise<void> {
	await (await activateTerminalView()).killTerminal();
}

/**
 * Ensures Terminal View is opened and focused
 * @returns A Promise that resolves to TerminalView instance.
 */
export async function activateTerminalView(): Promise<TerminalView> {
	return await new BottomBarPanel().openTerminalView();
}
