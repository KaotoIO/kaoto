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
import { EditorView, TreeItem, ViewControl, ViewSection } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { collapseItemsInsideTreeStructuredView, expandFolderItemsInTreeStructuredView, expandViews, getKaotoViewControl } from '../utils/tree-view';

describe('Tests View', function () {
	this.timeout(60_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view', 'example-tests');

	const CITRUS_TEST_FILE_SUFFIXES: string[] = ['.citrus.yaml', '.citrus.test.yaml', '.citrus.it.yaml', '.citrus-test.yaml', '.citrus-it.yaml'];

	const CITRUS_TEST_FILE_LABELS: string[] = CITRUS_TEST_FILE_SUFFIXES.map((suffix) => `myTest${suffix}`);

	let kaotoViewContainer: ViewControl | undefined;
	let testsSection: ViewSection | undefined;
	let items: TreeItem[] | undefined;
	let labels: string[];

	before(async function () {
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER);

		const control = await getKaotoViewControl();
		kaotoViewContainer = control.kaotoViewContainer;
		testsSection = await control.kaotoView?.getContent().getSection('Tests');
		await expandViews(control.kaotoView, 'Tests');

		// expand folders
		await expandFolderItemsInTreeStructuredView(testsSection, 'test');

		items = await testsSection?.getDriver().wait(
			async () => {
				const items = await testsSection?.getVisibleItems();
				if (items && items?.length > 0) {
					return items as TreeItem[];
				} else {
					return undefined;
				}
			},
			5_000,
			'Tests section items were not loaded properly',
			500,
		);

		if (items) {
			labels = await Promise.all(items.map((item) => item.getLabel()));
		}
	});

	after(async function () {
		await collapseItemsInsideTreeStructuredView(testsSection);
		await kaotoViewContainer?.closeView();
		await new EditorView().closeAllEditors();
	});

	it('items are displayed', async function () {
		expect(labels).to.not.be.empty;
		expect(labels).to.include.members(CITRUS_TEST_FILE_LABELS);
	});

	it('citrus-application.properties loaded', async function () {
		const properties = labels.find((label) => label === 'citrus-application.properties');

		expect(properties).to.not.be.undefined;
		expect(properties).to.equal('citrus-application.properties');
	});
});
