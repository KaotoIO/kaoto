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

import { By, InputBox, ModalDialog, WebDriver } from 'vscode-extension-tester';

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
