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
import { AbstractElement, By, Key, until, WebDriver, WebElement } from 'vscode-extension-tester';
import { kaotoLocators } from './locators';

/**
 * Page object for the Kaoto Catalog modal dialog.
 *
 * Opened by clicking the catalog button in the topology control bar.
 * Provides helpers for:
 * - Opening and closing the modal
 * - Switching between List and Gallery layouts
 * - Reading catalog item providers
 * - Filtering by provider
 *
 * Must be used inside the webview frame.
 */
export class CatalogModal extends AbstractElement {
	constructor() {
		super(CatalogModal.locators.CatalogModal.constructor);
	}

	// ─── Open / close ──────────────────────────────────────────────────────────

	/**
	 * Click the topology-control-bar catalog button and wait for the modal.
	 * Returns the catalog modal `WebElement`.
	 */
	static async open(driver: WebDriver, timeout = 10_000): Promise<WebElement> {
		const catalogBtn = await driver.wait(
			until.elementLocated(By.xpath(kaotoLocators.CatalogModal.catalogButton)),
			timeout,
			'Catalog button was not located',
		);
		await driver.wait(until.elementIsVisible(catalogBtn), timeout, 'Catalog button was not visible');
		await driver.wait(until.elementIsEnabled(catalogBtn), timeout, 'Catalog button was not enabled');
		await catalogBtn.click();

		await driver.wait(until.elementLocated(By.xpath(kaotoLocators.CatalogModal.window)), timeout);
		return driver.findElement(By.xpath(kaotoLocators.CatalogModal.window));
	}

	/**
	 * Close the catalog modal.
	 */
	static async close(catalogWindow: WebElement): Promise<void> {
		await catalogWindow.findElement(By.xpath(kaotoLocators.CatalogModal.closeButton)).click();
	}

	// ─── Layout switching ─────────────────────────────────────────────────────

	/**
	 * Switch the catalog to List view and wait for the list to appear.
	 * Returns the modal element.
	 */
	static async switchToListView(driver: WebDriver, catalogWindow: WebElement, timeout = 10_000): Promise<WebElement> {
		await catalogWindow.findElement(By.xpath(kaotoLocators.CatalogModal.listButton)).click();
		await driver.wait(until.elementLocated(By.className(kaotoLocators.CatalogModal.list)), timeout);
		return catalogWindow;
	}

	/**
	 * Switch the catalog back to Gallery view and wait for the gallery to appear.
	 */
	static async switchToGalleryView(driver: WebDriver, catalogWindow: WebElement, timeout = 5_000): Promise<void> {
		try {
			await catalogWindow.findElement(By.xpath(kaotoLocators.CatalogModal.galleryButton)).click();
			await driver.wait(until.elementLocated(By.className(kaotoLocators.CatalogModal.gallery)), timeout);
		} catch {
			// Workaround: hover text for the list button can overlap the gallery button
			await driver.actions().sendKeys(Key.ENTER).perform();
			await catalogWindow.findElement(By.xpath(kaotoLocators.CatalogModal.galleryButton)).click();
			await driver.wait(until.elementLocated(By.className(kaotoLocators.CatalogModal.gallery)), timeout);
		}
	}

	// ─── Provider filter ──────────────────────────────────────────────────────

	/**
	 * Open or close the provider filter dropdown.
	 *
	 * @param open  `true` to open and wait for the menu; `false` to close it.
	 */
	static async toggleProviderDropdown(driver: WebDriver, catalogWindow: WebElement, open: boolean, timeout = 5_000): Promise<void> {
		const dropdown = await catalogWindow.findElement(By.xpath(kaotoLocators.CatalogModal.providerFilterDropdown));
		await dropdown.click();
		await driver.sleep(1_000); // allow DOM to reflect changes

		if (open) {
			await driver.wait(until.elementLocated(By.id(kaotoLocators.CatalogModal.providerSelectMenu)), timeout);
		} else {
			const menu = await driver.findElements(By.id(kaotoLocators.CatalogModal.providerSelectMenu));
			if (menu.length > 0) {
				await driver.wait(until.stalenessOf(menu[0]), timeout);
			}
		}
	}

	/**
	 * Return the list of provider names shown in the provider filter menu.
	 */
	static async getProviderNames(driver: WebDriver, catalogWindow: WebElement): Promise<string[]> {
		await CatalogModal.toggleProviderDropdown(driver, catalogWindow, true);

		const menu = await catalogWindow.findElement(By.id(kaotoLocators.CatalogModal.providerSelectMenu));
		const items = await menu.findElements(By.className(kaotoLocators.CatalogModal.providerMenuListItem));
		const labels = await Promise.all(items.map((item) => item.getText()));

		await CatalogModal.toggleProviderDropdown(driver, catalogWindow, false);
		return labels;
	}

	/**
	 * Toggle the checkbox for a given provider in the provider filter menu.
	 *
	 * @param provider  Provider label shown in the menu, e.g. "Community", "Red Hat"
	 */
	static async toggleProvider(driver: WebDriver, catalogWindow: WebElement, provider: string): Promise<void> {
		await CatalogModal.toggleProviderDropdown(driver, catalogWindow, true);

		const menu = await catalogWindow.findElement(By.id(kaotoLocators.CatalogModal.providerSelectMenu));
		const item = await menu.findElement(By.xpath(kaotoLocators.CatalogModal.providerItem(provider)));
		await item.click();

		await CatalogModal.toggleProviderDropdown(driver, catalogWindow, false);
	}

	// ─── List item inspection ─────────────────────────────────────────────────

	/**
	 * Return the provider label string of the first visible catalog item in
	 * List view.
	 */
	static async getFirstItemProvider(catalogWindow: WebElement): Promise<string> {
		const listItem = await catalogWindow
			.findElement(By.className(kaotoLocators.CatalogModal.list))
			.findElement(By.className(kaotoLocators.CatalogModal.listItemRow));
		return listItem.findElement(By.className(kaotoLocators.CatalogModal.listItemProvider)).getText();
	}
}
