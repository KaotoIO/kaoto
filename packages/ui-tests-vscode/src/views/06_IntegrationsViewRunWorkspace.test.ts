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
import { join } from 'path';
import { EditorView, ViewControl, ViewSection, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { killTerminal, waitUntilTerminalHasText } from '../utils/terminal';
import { collapseItemsInsideTreeStructuredView, expandViews, getKaotoViewControl, getViewActionButton } from '../utils/tree-view';
import { expect } from 'chai';

describe('Integrations View', function () {
	this.timeout(600_000); // 10 minutes

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view', 'routes');

	let driver: WebDriver;
	let kaotoViewContainer: ViewControl | undefined;
	let integrationsSection: ViewSection | undefined;

	const beforeFn = async function (resource: string, waitForActivation: boolean = false) {
		await openResourcesAndWaitForActivation(resource, waitForActivation);
		const control = await getKaotoViewControl();
		kaotoViewContainer = control.kaotoViewContainer;
		integrationsSection = await control.kaotoView?.getContent().getSection('Integrations');
		await expandViews(control.kaotoView, 'Integrations');

		// collapse all items inside integrations section
		await collapseItemsInsideTreeStructuredView(integrationsSection);
	};

	before(async function () {
		driver = VSBrowser.instance.driver;
		await beforeFn(WORKSPACE_FOLDER);
	});

	after(async function () {
		await collapseItemsInsideTreeStructuredView(integrationsSection);
		await kaotoViewContainer?.closeView();
		await new EditorView().closeAllEditors();
	});

	describe(`Check 'Run: Workspace' button functionality`, function () {
		after(async function () {
			await killTerminal();
		});

		it('button is available', async function () {
			const button = await getViewActionButton(kaotoViewContainer, integrationsSection, 'Run: Workspace');
			expect(button).to.not.be.undefined;
		});

		// prettier-ignore
		it(`click button`, async function () { // NOSONAR - intentional action step: success means no exception thrown; a click that fails will throw and fail the test
			const button = await getViewActionButton(kaotoViewContainer, integrationsSection, 'Run: Workspace');
			await button?.click();
		});

		// prettier-ignore
		it(`check all workspace routes are running`, async function () { // NOSONAR - waitUntilTerminalHasText throws on timeout, acting as the assertion
			await waitUntilTerminalHasText(driver, ['Routes startup', 'Hello Root Route', 'Hello Route A', 'Hello Route B', 'Hello Route BB'], 4_000, 180_000);
		});
	});

	describe(`Check 'Run: All Workspaces' button functionality`, function () {
		const WORKSPACE_FILE = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view', 'routes.code-workspace');

		before(async function () {
			await beforeFn(WORKSPACE_FILE, true);
		});

		it('button is available', async function () {
			const button = await getViewActionButton(kaotoViewContainer, integrationsSection, 'Run: All Workspaces');
			expect(button).to.not.be.undefined;
		});

		// prettier-ignore
		it(`click button`, async function () { // NOSONAR - intentional action step: success means no exception thrown; a click that fails will throw and fail the test
			if (process.platform === 'win32') {
				// temporarily skip on Windows because it is really unstable
				// failing with JBang error: 'The process cannot access the file because it is being used by another process.'
				this.skip();
			}

			const button = await getViewActionButton(kaotoViewContainer, integrationsSection, 'Run: All Workspaces');
			await button?.click();
		});

		const expectedMessages = [
			{ workspace: 'folderB', messages: ['Hello Route B', 'Hello Route BB'] },
			{ workspace: 'folderA', messages: ['Hello Route A'] },
		];

		// prettier-ignore
		for (const { workspace, messages } of expectedMessages) {
			it(`check ${workspace} workspace routes are running`, async function () { // NOSONAR - waitUntilTerminalHasText throws on timeout, acting as the assertion
				if (process.platform === 'win32') {
					// temporarily skip on Windows because it is really unstable
					// failing with JBang error: 'The process cannot access the file because it is being used by another process.'
					this.skip();
				}
				await waitUntilTerminalHasText(driver, ['Routes startup', ...messages], 4_000, 180_000);
				await killTerminal(); // terminate the running workspace integrations
			});
		}
	});
});
