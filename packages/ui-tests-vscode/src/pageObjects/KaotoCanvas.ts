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
import { AbstractElement, By, until, WebDriver, WebElement } from 'vscode-extension-tester';
import { kaotoLocators } from './locators';

/**
 * Page object for Kaoto canvas node interactions.
 *
 * Provides helpers for finding nodes by test-id / node-label, triggering
 * context menus, selecting/deleting steps, and interacting with edges.
 *
 * Must be used inside the webview frame.
 */
export class KaotoCanvas extends AbstractElement {
	constructor() {
		super(By.xpath(`//div[@data-test-id='topology']`));
	}

	// ─── DSL list ──────────────────────────────────────────────────────────────

	/**
	 * Click the "DSL list" button to create a new route from the empty canvas.
	 */
	static async clickDslListButton(driver: WebDriver): Promise<void> {
		await (await driver.findElement(By.xpath(kaotoLocators.KaotoCatalog.dslListButton))).click();
	}

	// ─── Node finders ──────────────────────────────────────────────────────────

	/**
	 * Find a canvas node in Kaoto 2.4+ by the exact data-testid on its inner <div>.
	 * In the current DOM the clickable element is a <foreignObject data-nodelabel="…">
	 * whose child <div> carries the full step path as data-testid
	 * (e.g. "route.from.steps.0.choice.when.0.steps.0.log").
	 */
	static async findNodeByInnerTestId(driver: WebDriver, innerTestId: string, timeout = 5_000): Promise<WebElement> {
		const xpath = kaotoLocators.KaotoNode.byInnerTestId(innerTestId);
		await driver.wait(until.elementLocated(By.xpath(xpath)), timeout, `Node with inner test-id '${innerTestId}' was not found in topology`);
		return driver.findElement(By.xpath(xpath));
	}

	/**
	 * Find a canvas node using a data-testid prefix OR data-nodelabel fallback.
	 * This covers the API change between Kaoto 2.3 (testId) and 2.4+ (nodeLabel).
	 */
	static async findNodeByTestIdOrLabel(driver: WebDriver, testIdPrefix: string, nodeLabel: string, timeout = 5_000): Promise<WebElement> {
		await driver.wait(
			until.elementLocated(By.xpath(kaotoLocators.KaotoNode.byTestIdOrLabel(testIdPrefix, nodeLabel))),
			timeout,
			`Node '${nodeLabel}' was not found in topology`,
		);
		return driver.findElement(By.xpath(kaotoLocators.KaotoNode.byTestIdOrLabel(testIdPrefix, nodeLabel)));
	}

	/**
	 * Find a canvas node by CSS — data-testid prefix OR data-nodelabel.
	 */
	static async findNodeByCss(driver: WebDriver, testIdPrefix: string, nodeLabel: string, timeout = 5_000): Promise<WebElement> {
		const selector = kaotoLocators.KaotoNode.byTestIdPrefixOrNodeLabel(testIdPrefix, nodeLabel);
		await driver.wait(until.elementLocated(By.css(selector)), timeout, `Node '${nodeLabel}' was not found in topology`);
		return driver.findElement(By.css(selector));
	}

	/**
	 * Wait until a node with the given data-nodelabel is present on the canvas.
	 */
	static async waitForNodeByLabel(driver: WebDriver, nodeLabel: string, timeout = 10_000): Promise<void> {
		await driver.wait(
			until.elementLocated(By.xpath(kaotoLocators.KaotoNode.byTestIdOrLabel(`custom-node__${nodeLabel}`, nodeLabel))),
			timeout,
			`'${nodeLabel}' was not found in current topology.`,
		);
	}

	/**
	 * Find the timer/from node (covers Kaoto 2.3 `custom-node__timer` and 2.4+ `custom-node__route.from`).
	 */
	static async findTimerOrFromNode(driver: WebDriver, timeout = 5_000): Promise<WebElement> {
		await driver.wait(until.elementLocated(By.css(kaotoLocators.KaotoNode.timerOrFromNode)), timeout, 'Cannot find the timer/from node');
		return driver.findElement(By.css(kaotoLocators.KaotoNode.timerOrFromNode));
	}

	/**
	 * Find the log node (covers Kaoto 2.3 `custom-node__log` and 2.4+ step-path variant).
	 */
	static async findLogNode(driver: WebDriver, timeout = 5_000): Promise<WebElement> {
		await driver.wait(until.elementLocated(By.css(kaotoLocators.KaotoNode.logNode)), timeout, 'Cannot find the log node');
		return driver.findElement(By.css(kaotoLocators.KaotoNode.logNode));
	}

	// ─── Node label text (for settings tests) ─────────────────────────────────

	/**
	 * Get the label text element of a node by its data-testid.
	 * Used to verify Node Label setting is applied.
	 */
	static async findNodeLabelText(driver: WebDriver, nodeTestId: string, timeout = 10_000): Promise<WebElement> {
		return driver.wait(
			until.elementLocated(By.xpath(kaotoLocators.KaotoNode.labelText(nodeTestId))),
			timeout,
			`Label text for node '${nodeTestId}' was not found`,
		);
	}

	// ─── Context menu ──────────────────────────────────────────────────────────

	/**
	 * Right-click a canvas node and wait for the context menu to appear.
	 */
	static async openContextMenu(driver: WebDriver, node: WebElement, timeout = 5_000): Promise<WebElement> {
		await driver.actions().contextClick(node).perform();
		await driver.wait(until.elementLocated(By.className(kaotoLocators.KaotoContextMenu.menu)), timeout, 'Cannot find the Kaoto context menu');
		return driver.findElement(By.className(kaotoLocators.KaotoContextMenu.menu));
	}

	/**
	 * Click "Replace" in the node context menu.
	 */
	static async clickReplaceInContextMenu(driver: WebDriver): Promise<void> {
		await (await driver.findElement(By.xpath(kaotoLocators.KaotoContextMenu.replaceItem))).click();
	}

	/**
	 * Click "Delete" in the node context menu.
	 */
	static async clickDeleteInContextMenu(driver: WebDriver): Promise<void> {
		await (await driver.findElement(By.css(kaotoLocators.KaotoContextMenu.deleteItem))).click();
	}

	// ─── Step toolbar ──────────────────────────────────────────────────────────

	/**
	 * Wait for the step toolbar to appear and click the reset-view button to
	 * bring all nodes into view before interacting with toolbar actions.
	 */
	static async resetView(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.wait(until.elementLocated(By.css(kaotoLocators.StepToolbar.resetViewButton)), timeout, 'Cannot find the reset view button');
		await (await driver.findElement(By.css(kaotoLocators.StepToolbar.resetViewButton))).click();
	}

	/**
	 * Wait for the step toolbar and click the delete button for a given step.
	 *
	 * @param stepId  The step identifier prefix used in the button's data-testid
	 *                (e.g. "kaoto-datamapper")
	 */
	static async deleteStep(driver: WebDriver, stepId: string, timeout = 5_000): Promise<void> {
		await driver.wait(until.elementLocated(By.xpath(kaotoLocators.StepToolbar.toolbar)), timeout, 'Cannot find the step toolbar');
		await (await driver.findElement(By.css(kaotoLocators.StepToolbar.deleteButton(stepId)))).click();
	}

	/**
	 * Wait for the action-confirmation modal, then click the
	 * "Delete step and file" button.
	 */
	static async confirmDeleteStepAndFile(driver: WebDriver, timeout = 5_000): Promise<void> {
		await driver.wait(until.elementLocated(By.xpath(kaotoLocators.StepToolbar.actionConfirmModal)), timeout, 'Cannot find the modal to confirm deletion');
		await (await driver.findElement(By.css(kaotoLocators.StepToolbar.confirmDeleteStepAndFile))).click();
	}

	// ─── Edge / add-step ──────────────────────────────────────────────────────

	/**
	 * Hover over an edge and return the "Add Step" button element on that edge.
	 *
	 * @param edgeSelector  CSS selector for the edge `<g>` element
	 */
	static async getAddStepButton(driver: WebDriver, edgeSelector: string, timeout = 5_000): Promise<WebElement> {
		await driver.wait(until.elementLocated(By.css(edgeSelector)), timeout);
		const edge = await driver.findElement(By.css(edgeSelector));
		await driver.actions().move({ origin: edge, duration: 2_000 }).perform();
		await driver.wait(until.elementLocated(By.className(kaotoLocators.KaotoEdge.addStepIcon)), timeout);
		return edge.findElement(By.className(kaotoLocators.KaotoEdge.addStepIcon));
	}

	// ─── Catalog filter ────────────────────────────────────────────────────────

	/**
	 * Type a filter term into the catalog filter input and wait for a matching
	 * tile to appear.
	 *
	 * @param driver
	 * @param term    Text to type into the filter (e.g. "sql", "amqp")
	 * @param tileTestId  The `data-testid` value of the expected tile (without
	 *                    the "tile-" prefix), e.g. "sql"
	 */
	static async filterCatalogAndSelectTile(driver: WebDriver, term: string, tileTestId: string, timeout = 5_000): Promise<void> {
		await driver.wait(until.elementLocated(By.className(kaotoLocators.KaotoCatalog.filterTextInput)), timeout);
		const textInput = await driver.findElement(By.className(kaotoLocators.KaotoCatalog.filterTextInput));
		await textInput.click();
		await textInput.clear();
		await textInput.sendKeys(term);

		await driver.wait(until.elementLocated(By.css(kaotoLocators.KaotoCatalog.tileByTestId(tileTestId))), timeout, `Cannot find tile for '${tileTestId}'`);
		await (await driver.findElement(By.css(kaotoLocators.KaotoCatalog.tileByTestId(tileTestId)))).click();
	}
}
