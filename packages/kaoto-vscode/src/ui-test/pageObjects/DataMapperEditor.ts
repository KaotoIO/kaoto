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
import { AbstractElement, By, InputBox, until, WebDriver, WebView } from 'vscode-extension-tester';
import { kaotoLocators } from './locators';

/**
 * Page object for the Kaoto DataMapper editor.
 *
 * Provides helpers for:
 * - Opening the DataMapper from a canvas node
 * - Attaching an XSD schema for the source body
 * - Waiting for the DataMapper "how-to" content (empty state)
 *
 * Must be used inside the webview frame (except where noted).
 */
export class DataMapperEditor extends AbstractElement {
	constructor() {
		super(DataMapperEditor.locators.DataMapperEditor.constructor);
	}

	// ─── Open DataMapper ───────────────────────────────────────────────────────

	/**
	 * Click a DataMapper canvas node and then click the
	 * "Click to launch the Kaoto DataMapper editor" button.
	 *
	 * @param nodeSelector  CSS selector that uniquely identifies the DataMapper node
	 */
	static async openFromNode(driver: WebDriver, nodeSelector: string, timeout = 5_000): Promise<void> {
		const node = await driver.findElement(By.css(nodeSelector));
		await node.click();
		await driver.wait(
			until.elementLocated(By.css(kaotoLocators.DataMapperEditor.openEditorButton)),
			timeout,
			'Cannot find the button to open the DataMapper',
		);
		await (await driver.findElement(By.css(kaotoLocators.DataMapperEditor.openEditorButton))).click();
	}

	// ─── Schema attachment ────────────────────────────────────────────────────

	/**
	 * Click the "Attach schema" button for a given target (e.g.
	 * `"sourceBody-Body"`) and go through the file-picker flow to select
	 * an XSD file by name.
	 *
	 * The method temporarily leaves the webview frame to interact with the
	 * VS Code InputBox.
	 *
	 * @param driver
	 * @param kaotoWebview  The active WebView — needed to switch frames
	 * @param target        The target suffix used in the button's data-testid
	 * @param xsdFileName   File name to type into the InputBox filter
	 */
	static async attachXsdSchema(driver: WebDriver, kaotoWebview: WebView, target: string, xsdFileName: string): Promise<void> {
		// Click the attach button inside the webview
		await driver.wait(
			until.elementLocated(By.css(kaotoLocators.DataMapperEditor.attachSchemaButton(target))),
			5_000,
			'Cannot find the button to attach the schema',
		);
		await (await driver.findElement(By.css(kaotoLocators.DataMapperEditor.attachSchemaButton(target)))).click();

		// Wait for the attach-schema modal
		await DataMapperEditor.waitForAttachSchemaModal(driver);

		// Click the "File" button to open the VS Code file picker
		const schemaButton = await driver.findElement(By.xpath(kaotoLocators.DataMapperEditor.attachSchemaFileButton));
		await schemaButton.click();

		// Leave webview to interact with VS Code InputBox
		await kaotoWebview.switchBack();
		const xsdInputBox = await InputBox.create(10_000);
		await xsdInputBox.setText(xsdFileName);

		try {
			const checkboxes = await xsdInputBox.getCheckboxes();
			if (checkboxes.length > 0) {
				await checkboxes[0].select();
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (!/NoSuchElement/i.test(message) && !/checkbox/i.test(message)) {
				throw error;
			}
			// Fallback for Kaoto <2.10.0 (no checkboxes in InputBox)
		}
		await xsdInputBox.confirm();

		// Switch back into the webview
		await kaotoWebview.switchToFrame();

		// Confirm attachment in the modal
		await DataMapperEditor.waitForAttachSchemaModal(driver);
		const attachButton = await driver.findElement(By.xpath(kaotoLocators.DataMapperEditor.attachSchemaAttachButton));
		await attachButton.click();
	}

	/**
	 * Wait for the attach-schema modal dialog to appear.
	 */
	static async waitForAttachSchemaModal(driver: WebDriver, timeout = 3_000): Promise<void> {
		await driver.wait(until.elementLocated(By.xpath(kaotoLocators.DataMapperEditor.attachSchemaModal)), timeout, 'Cannot find XSD schema modal dialog');
	}

	/**
	 * Wait for the XSD source field to appear after a successful schema attach.
	 */
	static async waitForSourceField(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.wait(
			until.elementLocated(By.xpath(kaotoLocators.DataMapperEditor.sourceFieldByTestId)),
			timeout,
			'Root of the imported XSD is not displayed in the UI',
		);
	}

	/**
	 * Wait for the DataMapper "how-to" empty-state content to be visible.
	 */
	static async waitForHowToContent(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.wait(
			until.elementLocated(By.className(kaotoLocators.DataMapperEditor.howTo)),
			timeout,
			'DataMapper "howTo" content was not loaded properly!',
		);
	}
}
