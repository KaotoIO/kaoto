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
import { expect, assert } from 'chai';
import { join } from 'path';
import { after, before, EditorView, SideBarView, TreeItem, ViewControl, ViewSection, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { killTerminal, waitUntilTerminalHasText } from '../utils/terminal';
import { expandViews, getKaotoViewControl, getTreeItem, getTreeItemActionButton } from '../utils/tree-view';

describe('Deployments View', function () {
	this.timeout(1_200_000); // 20 minutes

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view');

	let driver: WebDriver;
	let kaotoViewContainer: ViewControl | undefined;
	let kaotoView: SideBarView | undefined;
	let deploymentsSection: ViewSection | undefined;

	before(async function () {
		driver = VSBrowser.instance.driver;
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER);

		const control = await getKaotoViewControl();
		kaotoViewContainer = control.kaotoViewContainer;
		kaotoView = control.kaotoView;

		deploymentsSection = await kaotoView?.getContent().getSection('Deployments');
		await expandViews(kaotoView, 'Deployments');
	});

	after(async function () {
		await kaotoViewContainer?.closeView();
		await new EditorView().closeAllEditors();
	});

	it(`click 'Run' button (Integrations view)`, async function () {
		const integrationsSection = await kaotoView?.getContent().getSection('Integrations');
		await expandViews(kaotoView, 'Integrations');
		const item = await getTreeItem(driver, integrationsSection, 'sample2.camel.yaml');
		expect(item).to.not.be.undefined;
		const button = await getTreeItemActionButton(kaotoViewContainer, item as TreeItem, 'Run');
		await button?.click();

		await waitUntilTerminalHasText(driver, ['Routes startup', 'Hello World'], 4_000, 180_000);
	});

	it(`check 'sample2.camel.yaml' is running`, async function () {
		const item = await getTreeItem(driver, deploymentsSection, 'sample2');
		expect(item).to.not.be.undefined;
	});

	it(`check routes are loaded for running 'sample2.camel.yaml'`, async function () {
		const item = await getTreeItem(driver, deploymentsSection, 'route-1151');
		expect(item).to.not.be.undefined;
	});

	// prettier-ignore
	it(`stop running integration (kill terminal)`, async function () { // NOSONAR - intentional action step: killTerminal throws if it fails; completing without error is the expected outcome
		await killTerminal();
	});

	it(`check 'sample2.camel.yaml' is not running`, async function () {
		try {
			const item = await getTreeItem(driver, deploymentsSection, 'sample2', 5_000);
			expect(item).to.be.undefined;
		} catch (error) {
			if (error instanceof Error && error.name === 'TimeoutError') {
				// correct state, the getTreeItem should have been timed out.
			} else {
				assert.fail();
			}
		}
	});
});
