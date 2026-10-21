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
import fs from 'fs';
import { after, before, EditorView, InputBox, ViewControl, ViewPanelActionDropdown, ViewSection, VSBrowser, WebDriver } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import {
	collapseItemsInsideTreeStructuredView,
	expandFolderItemsInTreeStructuredView,
	expandViews,
	getKaotoViewControl,
	getTreeItem,
} from '../utils/tree-view';
import { handleInputPathSelection } from '../utils/workbench';

describe('Tests View', function () {
	this.timeout(240_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view', 'example-tests');

	let driver: WebDriver;
	let kaotoViewContainer: ViewControl | undefined;
	let testsSection: ViewSection | undefined;
	let newFileButton: ViewPanelActionDropdown | undefined;

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

	it(`'New Citrus Test...' button is available`, async function () {
		newFileButton = (await testsSection?.getAction('New Citrus Test...')) as ViewPanelActionDropdown;
		expect(newFileButton).to.not.be.undefined;
	});

	describe(`Click 'New Citrus Test...' button`, function () {
		const CITRUS_TEST_FILE: string = 'newTest.citrus.yaml';

		let input: InputBox;

		before(async function () {
			newFileButton = await driver.wait(
				async function () {
					await driver.actions().move({ origin: testsSection, duration: 1_000 }).perform(); // move mouse to bring auto-hided buttons visible again
					await driver.sleep(500); // wait for the buttons to be visible
					return (await testsSection?.getAction('New Citrus Test...')) as ViewPanelActionDropdown;
				},
				10_000,
				`'New Citrus Test...' button was not found!`,
			);
		});

		after(async function () {
			await new EditorView().closeAllEditors();
			await fs.promises.rm(join(WORKSPACE_FOLDER, 'test', CITRUS_TEST_FILE), { force: true });
		});

		it(`Check new 'Citrus Test' can be created`, async function () {
			await newFileButton?.safeClick();

			input = await InputBox.create(30_000);
			await input.setText(WORKSPACE_FOLDER);
			await input.confirm();
			await handleInputPathSelection(input);

			input = await InputBox.create(30_000);
			await input.setText('newTest');
			await input.confirm();

			const newTest = await getTreeItem(driver, testsSection, CITRUS_TEST_FILE, 120_000);
			expect(newTest).to.not.be.undefined;
		});
	});
});
