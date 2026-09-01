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
import { AbstractElement, By, until, WebDriver } from 'vscode-extension-tester';
import { kaotoLocators } from './locators';

/**
 * Page object for the Kaoto editor tab bar.
 *
 * Represents the row of tabs at the top of the Kaoto editor webview:
 * "Design", "Beans", "DataMapper".
 *
 * Must be used inside the webview frame.
 */
export class EditorTabs extends AbstractElement {
	constructor() {
		super(EditorTabs.locators.EditorTabs.constructor);
	}

	// ─── Active tab ────────────────────────────────────────────────────────────

	/**
	 * Return the text label of the currently active tab (e.g. "Design").
	 */
	async getActiveTabName(): Promise<string> {
		const tabsList = await this.getDriver().findElement(By.className(kaotoLocators.EditorTabs.tabsList));
		const activeBtn = await tabsList.findElement(By.xpath(kaotoLocators.EditorTabs.activeTabXpath));
		const textEl = await activeBtn.findElement(By.className(kaotoLocators.EditorTabs.tabsItemText));
		return textEl.getText();
	}

	// ─── Navigation ────────────────────────────────────────────────────────────

	/**
	 * Click the tab identified by its `aria-label` attribute.
	 *
	 * @param label  Tab aria-label, e.g. "Design canvas", "Beans editor", "DataMapper"
	 */
	async switchToTab(label: string): Promise<void> {
		const tabsList = await this.getDriver().findElement(By.className(kaotoLocators.EditorTabs.tabsList));
		await tabsList.findElement(By.xpath(kaotoLocators.EditorTabs.tabByLabel(label))).click();
	}

	// ─── Assertions ────────────────────────────────────────────────────────────

	/**
	 * Wait until the topology (Design canvas) is visible — indicates the Design
	 * tab has fully loaded.
	 */
	static async waitForDesignTab(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.wait(until.elementLocated(By.xpath(kaotoLocators.KaotoEditor.topology)), timeout, 'Design canvas was not loaded properly!');
	}

	/**
	 * Wait until both Beans editor panels are visible.
	 */
	static async waitForBeansTab(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.wait(until.elementLocated(By.className(kaotoLocators.BeansEditor.listView)), timeout, 'Beans "list" view was not loaded properly!');
		await driver.wait(until.elementLocated(By.className(kaotoLocators.BeansEditor.detailsView)), timeout, 'Beans "details" view was not loaded properly!');
	}

	/**
	 * Wait until the DataMapper "how-to" content is visible.
	 */
	static async waitForDataMapperTab(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.wait(
			until.elementLocated(By.className(kaotoLocators.DataMapperEditor.howTo)),
			timeout,
			'DataMapper "howTo" content was not loaded properly!',
		);
	}
}
