/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
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

describe('Tests View', function () {
	this.timeout(240_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view', 'example-tests');

	let driver: WebDriver;
	let kaotoViewContainer: ViewControl | undefined;
	let testsSection: ViewSection | undefined;

	before(async function () {
		driver = VSBrowser.instance.driver;
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER, false);

		const control = await getKaotoViewControl();
		kaotoViewContainer = control.kaotoViewContainer;
		testsSection = await control.kaotoView?.getContent().getSection('Tests');
		await expandViews(control.kaotoView, 'Tests');

		// expand folders
		await expandFolderItemsInTreeStructuredView(testsSection, 'test');
	});

	after(async function () {
		await collapseItemsInsideTreeStructuredView(testsSection);
		await kaotoViewContainer?.closeView();
		await new EditorView().closeAllEditors();
	});

	describe(`Click 'Run' button`, function () {
		after(async function () {
			await killTerminal();
			await new EditorView().closeAllEditors();
		});

		it(`check 'myTest.citrus.yaml' is running`, async function () {
			const item = await getTreeItem(driver, testsSection, 'myTest.citrus.yaml');
			expect(item).to.not.be.undefined;
			const button = await getTreeItemActionButton(kaotoViewContainer, item as TreeItem, 'Run');
			await button?.click();

			await waitUntilTerminalHasText(driver, ['myTest.citrus', 'Tests finished'], 4_000, 180_000);
		});
	});

	describe(`Click 'Run: Folder' button`, function () {
		after(async function () {
			await killTerminal();
			await new EditorView().closeAllEditors();
		});

		it(`check 'folderA' folder tests are running`, async function () {
			await expandFolderItemsInTreeStructuredView(testsSection, 'folderA', 'folderAA', 'test');

			const item = await getTreeItem(driver, testsSection, 'folderA');
			expect(item).to.not.be.undefined;
			const button = await getTreeItemActionButton(kaotoViewContainer, item as TreeItem, 'Run: Folder');
			await button?.click();

			await waitUntilTerminalHasText(driver, ['myFolderTest.citrus', 'myFolderTest.citrus.test', 'Tests finished'], 4_000, 180_000);
		});
	});
});
