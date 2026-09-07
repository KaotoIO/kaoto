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
import { join } from 'path'; //NOSONAR
import { after, before, EditorView, TreeItem, ViewControl, ViewSection, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation } from './extension';
import { killTerminal, waitUntilTerminalHasText } from './terminal';
import {
	collapseItemsInsideTreeStructuredView,
	expandFolderItemsInTreeStructuredView,
	expandViews,
	getKaotoViewControl,
	getTreeItem,
	getTreeItemActionButton,
} from './tree-view';

/** Register the same integration assertions for local execution and Linux deployment. */
export function integrationRunTests(label: 'Run' | 'Deploy'): void {
	describe(`Integrations View: ${label}`, function () {
		this.timeout(1_200_000);
		const workspaceFolder = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view');
		let driver: WebDriver;
		let kaotoViewContainer: ViewControl | undefined;
		let integrationsSection: ViewSection | undefined;

		before(async function () {
			driver = VSBrowser.instance.driver;
			await openResourcesAndWaitForActivation(workspaceFolder, false);
			const control = await getKaotoViewControl();
			kaotoViewContainer = control.kaotoViewContainer;
			integrationsSection = await control.kaotoView?.getContent().getSection('Integrations');
			await expandViews(control.kaotoView, 'Integrations');
			await expandFolderItemsInTreeStructuredView(integrationsSection, 'pipes', 'others');
		});

		after(async function () {
			await collapseItemsInsideTreeStructuredView(integrationsSection);
			await kaotoViewContainer?.closeView();
			await new EditorView().closeAllEditors();
		});

		it(`'${label}' button is available`, async function () {
			const item = await getTreeItem(driver, integrationsSection, 'pipe1.pipe.yaml');
			const button = await item?.getActionButton(label);
			expect(button).to.not.be.undefined;
		});

		describe(`Click '${label}' button`, function () {
			after(async function () {
				await killTerminal();
				await new EditorView().closeAllEditors();
			});

			it(`check 'sample2.camel.yaml' is running`, async function () {
				if (label === 'Deploy' && process.platform !== 'linux') {
					this.skip();
				}
				const item = await getTreeItem(driver, integrationsSection, 'sample2.camel.yaml');
				expect(item).to.not.be.undefined;
				const button = await getTreeItemActionButton(kaotoViewContainer, item as TreeItem, label);
				await button?.click();
				await waitUntilTerminalHasText(
					driver,
					['Routes startup', 'Hello World'],
					label === 'Deploy' ? 10_000 : 4_000,
					label === 'Deploy' ? 900_000 : 180_000,
				);
			});
		});
	});
}
