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
import { after, before, EditorView, TreeItem, ViewControl, ViewSection, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { killTerminal, waitUntilTerminalHasText } from '../utils/terminal';
import {
	collapseItemsInsideTreeStructuredView,
	expandFolderItemsInTreeStructuredView,
	expandViews,
	getKaotoViewControl,
	getTreeItem,
	getTreeItemActionButton,
} from '../utils/tree-view';

/**
 * Note:
 * - OC login needs to be done before executing this test for deployment into OpenShift
 * - Linux Only for a Deploy part
 */
describe('Integrations View', function () {
	this.timeout(1200_000); // 20 minutes

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view');

	let driver: WebDriver;
	let kaotoViewContainer: ViewControl | undefined;
	let integrationsSection: ViewSection | undefined;

	before(async function () {
		driver = VSBrowser.instance.driver;
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER, false);

		const control = await getKaotoViewControl();
		kaotoViewContainer = control.kaotoViewContainer;
		integrationsSection = await control.kaotoView?.getContent().getSection('Integrations');
		await expandViews(control.kaotoView, 'Integrations');

		// expand folders
		await expandFolderItemsInTreeStructuredView(integrationsSection, 'pipes', 'others');
	});

	after(async function () {
		await collapseItemsInsideTreeStructuredView(integrationsSection);
		await kaotoViewContainer?.closeView();
		await new EditorView().closeAllEditors();
	});

	const buttons = [
		{ label: 'Run', interval: 4_000, timeout: 180_000 },
		{ label: 'Deploy', interval: 10_000, timeout: 900_000 },
	];

	buttons.forEach((btn) => {
		it(`'${btn.label}' button is available`, async function () {
			const item = await getTreeItem(driver, integrationsSection, 'pipe1.pipe.yaml');
			const button = await item?.getActionButton(btn.label);
			expect(button).to.not.be.undefined;
		});
	});

	buttons.forEach((btn) => {
		describe(`Click '${btn.label}' button`, function () {
			after(async function () {
				await killTerminal();
				await new EditorView().closeAllEditors();
			});

			it(`check 'sample2.camel.yaml' is running`, async function () {
				if (btn.label === 'Deploy' && process.platform !== 'linux') {
					this.skip();
				}
				const item = await getTreeItem(driver, integrationsSection, 'sample2.camel.yaml');
				expect(item).to.not.be.undefined;
				const button = await getTreeItemActionButton(kaotoViewContainer, item as TreeItem, btn.label);
				await button?.click();

				await waitUntilTerminalHasText(driver, ['Routes startup', 'Hello World'], btn.interval, btn.timeout);
			});
		});
	});
});
