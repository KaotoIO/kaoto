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
 * Page object for the Kaoto webview editor.
 *
 * Provides high-level helpers for checking editor state (empty canvas,
 * topology loaded, property panel) and interacting with the side bar.
 *
 * All DOM interactions happen inside the webview frame — callers must have
 * already switched into the frame before constructing/using this object.
 */
export class KaotoEditor extends AbstractElement {
	constructor() {
		super(KaotoEditor.locators.KaotoEditor.constructor);
	}

	// ─── State checks ──────────────────────────────────────────────────────────

	/**
	 * Wait until the "empty canvas" placeholder is visible (no routes loaded).
	 */
	static async waitForEmptyCanvas(driver: WebDriver, timeout = 10_000): Promise<void> {
		await driver.wait(until.elementLocated(By.xpath(kaotoLocators.KaotoEditor.emptyCanvas)), timeout, 'Empty Kaoto Canvas was not loaded properly');
	}

	/**
	 * Wait until the topology (route graph) is visible.
	 */
	static async waitForTopology(driver: WebDriver, timeout = 10_000): Promise<void> {
		await driver.wait(until.elementLocated(By.xpath(kaotoLocators.KaotoEditor.topology)), timeout, 'Kaoto topology was not loaded properly');
		await driver.sleep(1_000); // stabilize — topology re-renders briefly on macOS CI
	}

	// ─── Property panel ────────────────────────────────────────────────────────

	/**
	 * Wait for a node's property panel card to appear.
	 */
	static async waitForPropertyPanel(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.wait(until.elementLocated(By.className(kaotoLocators.KaotoEditor.propertyPanelCard)), timeout, 'Property panel was not opened');
	}

	/**
	 * Click the "close side bar" button to dismiss the property panel.
	 * Returns once the property panel card has disappeared.
	 */
	static async closePropertyPanel(driver: WebDriver, timeout = 5_000): Promise<void> {
		const closeBtn = await driver.findElement(By.xpath(kaotoLocators.KaotoEditor.closeSideBar));
		await driver.wait(async () => (await closeBtn.isDisplayed()) && (await closeBtn.isEnabled()), timeout, 'Close button is not displayed!');
		// Small buffer — the button may not react if clicked immediately after appearing
		await driver.sleep(100);
		await closeBtn.click();
	}

	/**
	 * Assert the property panel card is **not** present.
	 * Throws if the card is still visible after `timeout` ms.
	 */
	static async waitForPropertyPanelClosed(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.sleep(1_000);
		try {
			await driver.wait(until.elementLocated(By.className(kaotoLocators.KaotoEditor.propertyPanelCard)), timeout);
			throw new Error('Property panel was not closed!');
		} catch (error) {
			if (error instanceof Error && error.name !== 'TimeoutError') {
				throw error;
			}
		}
	}

	// ─── Navigation ────────────────────────────────────────────────────────────

	/**
	 * Click the "Design" tab link inside the DataMapper editor to return to the
	 * design canvas.
	 */
	static async clickDesignTab(driver: WebDriver): Promise<void> {
		await (await driver.findElement(By.css(kaotoLocators.KaotoDesignTab.link))).click();
	}

	// ─── Integration name ──────────────────────────────────────────────────────

	/**
	 * Wait until the integration name appears in the top bar.
	 */
	static async waitForIntegrationName(driver: WebDriver, name: string, timeout = 5_000): Promise<void> {
		await driver.wait(
			until.elementLocated(By.xpath(kaotoLocators.KaotoEditor.flowsListRouteId(name))),
			timeout,
			`Unable to locate integration name '${name}' in top bar!`,
		);
	}
}
