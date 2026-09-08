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
import { expect } from 'chai';
import { join } from 'path';
import { after, EditorView, TreeItem, ViewControl, ViewItemAction, ViewSection, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { activateTerminalView, killTerminal } from '../utils/terminal';
import { collapseItemsInsideTreeStructuredView, expandViews, getKaotoViewControl, getTreeItem, getTreeItemActionButton } from '../utils/tree-view';

describe('Deployments View', function () {
	this.timeout(600_000); // 10 minutes

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view');

	let driver: WebDriver;
	let kaotoViewContainer: ViewControl | undefined;
	let deploymentsSection: ViewSection | undefined;
	let integrationsSection: ViewSection | undefined;

	before(async function () {
		this.timeout(180_000);
		driver = VSBrowser.instance.driver;
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER, false);

		const control = await getKaotoViewControl();
		kaotoViewContainer = control.kaotoViewContainer;
		deploymentsSection = await control.kaotoView?.getContent().getSection('Deployments');
		integrationsSection = await control.kaotoView?.getContent().getSection('Integrations');
		await expandViews(control.kaotoView, 'Deployments', 'Integrations');

		await collapseItemsInsideTreeStructuredView(integrationsSection);
	});

	after(async function () {
		await kaotoViewContainer?.closeView();
		await new EditorView().closeAllEditors();
		await killTerminal(); // kill sample2
		await killTerminal(); // kill kaoto
	});

	const parameters = [
		{ label: 'sample2', file: 'sample2.camel.yaml', message: 'Hello World', route: 'route-1151' },
		{ label: 'kaoto', file: 'kaoto.camel.xml', message: 'Hello Camel', route: 'route-1643' },
	];

	const routeManipulations = [
		{ state: 'Stopped', button: 'Stop', allowedButtons: ['Start'], terminalText: 'Stopped' },
		{ state: 'Started', button: 'Start', allowedButtons: ['Suspend', 'Stop'], terminalText: 'Started' },
		{ state: 'Suspended', button: 'Suspend', allowedButtons: ['Resume', 'Stop'], terminalText: 'Suspended' },
		// Camel does not emit a new "Started route-XXX" log line on resume, so there is no
		// terminal text to assert on; the route state and button checks below are sufficient.
		{ state: 'Started', button: 'Resume', allowedButtons: ['Suspend', 'Stop'], terminalText: null },
	];

	parameters.forEach((p) => {
		describe(`Manipulate '${p.file}' routes`, function () {
			it(`run '${p.file}' integration`, async function () {
				const item = await getTreeItem(driver, integrationsSection, p.file);
				expect(item).to.not.be.undefined;
				const run = await getTreeItemActionButton(kaotoViewContainer, item as TreeItem, 'Run');
				await run?.click();
			});

			it(`check '${p.file}' is running`, async function () {
				const integration = await getTreeItem(driver, deploymentsSection, p.label, 30_000);
				expect(integration).to.not.be.undefined;
			});

			routeManipulations.forEach((rm) => {
				it(`click '${rm.button}' on ${p.route}`, async function () {
					const textToLookFor = rm.terminalText !== null ? `${rm.terminalText} ${p.route}` : null;
					const initialCount = textToLookFor !== null ? await getInitialTerminalOccurrences(textToLookFor) : 0;

					await clickRouteActionButton(rm.button);

					if (textToLookFor !== null) {
						await waitUntilTerminalHasMoreOccurrences(textToLookFor, initialCount);
					}
					await waitUntilRouteHasState(rm.state);
					await waitUntilRouteHasButtons(rm.allowedButtons);
				});
			});
		});

		/**
		 * Reads the current terminal occurrence count for `text`.
		 * Used by the post-action polling loop — failures are treated as 0
		 * so the poll keeps retrying without aborting the wait.
		 */
		async function getTerminalOccurrences(text: string): Promise<number> {
			try {
				const terminal = await activateTerminalView();
				const terminalText = await terminal.getText();
				return terminalText.split(text).length - 1;
			} catch (err) {
				return 0;
			}
		}

		/**
		 * Reads the terminal occurrence count before an action fires.
		 * Retries on transient errors (e.g. terminal not yet visible) so that
		 * a read failure does not silently produce initialCount = 0 and allow
		 * the post-action assertion to pass vacuously.
		 * Throws if a clean read cannot be obtained within `timeout` ms.
		 */
		async function getInitialTerminalOccurrences(text: string, interval = 500, timeout = 15_000): Promise<number> {
			const deadline = Date.now() + timeout;
			let lastErr: unknown;
			while (Date.now() < deadline) {
				try {
					const terminal = await activateTerminalView();
					const terminalText = await terminal.getText();
					return terminalText.split(text).length - 1;
				} catch (err) {
					lastErr = err;
					await driver.sleep(interval);
				}
			}
			throw new Error(`getInitialTerminalOccurrences: could not read terminal for "${text}" within ${timeout}ms. Last error: ${lastErr}`);
		}

		async function waitUntilTerminalHasMoreOccurrences(text: string, initialCount: number, interval = 1000, timeout = 30000): Promise<void> {
			await driver.wait(
				async function () {
					try {
						const currentCount = await getTerminalOccurrences(text);
						return currentCount > initialCount;
					} catch (err) {
						return false;
					}
				},
				timeout,
				`Failed waiting for terminal to have more than ${initialCount} occurrences of "${text}"`,
				interval,
			);
		}

		async function clickRouteActionButton(action: string, timeout = 30_000): Promise<void> {
			let clicked = false;
			await driver.wait(
				async () => {
					try {
						const route = await getTreeItem(driver, deploymentsSection, p.route, 5_000);
						expect(route).to.not.be.undefined;

						await route?.click();
						const btn = await getTreeItemActionButton(kaotoViewContainer, route as TreeItem, action, 2_000);
						expect(btn, `'${action}' action button should be available for ${p.route}`).to.not.be.undefined;

						await btn?.click();
						clicked = true;
						return true;
					} catch (err) {
						return false;
					}
				},
				timeout,
				`Timeout: failed to click '${action}' on ${p.route}`,
				500,
			);

			expect(clicked, `Failed to click '${action}' on ${p.route}`).to.be.true;
			await driver.sleep(1_000);
		}

		async function waitUntilRouteHasState(state: string, interval = 500, timeout = 30_000): Promise<void> {
			await driver.wait(
				async function () {
					try {
						const route = await getTreeItem(driver, deploymentsSection, p.route, 5_000);
						expect(route).to.not.be.undefined;
						const description = await route?.getDescription();
						return description?.startsWith(state);
					} catch (err) {
						return false;
					}
				},
				timeout,
				`Timeout: route is not in an expected state - "${state}"`,
				interval,
			);
		}

		async function waitUntilRouteHasButtons(expectedButtons: string[], interval = 500, timeout = 30_000): Promise<void> {
			let buttonsLabels: string[] = [];
			await driver.wait(
				async function () {
					try {
						const route = await getTreeItem(driver, deploymentsSection, p.route, 5_000);
						expect(route).to.not.be.undefined;

						await route?.click();
						const buttons = (await route?.getActionButtons()) as ViewItemAction[];
						buttonsLabels = await Promise.all(buttons.map((btn) => btn.getLabel()));
						return expectedButtons.every((button) => buttonsLabels.includes(button)) && buttonsLabels.length === expectedButtons.length;
					} catch (err) {
						buttonsLabels = [];
						return false;
					}
				},
				timeout,
				`Timeout: route action buttons ${expectedButtons.join(', ')} were not visible. Actual: ${buttonsLabels.join(', ')}`,
				interval,
			);

			expect(buttonsLabels).to.have.members(expectedButtons);
		}
	});
});
