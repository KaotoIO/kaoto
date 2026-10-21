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
import { checkTopologyLoaded, switchToKaotoFrame } from '../utils/editor';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { collapseItemsInsideTreeStructuredView, expandFolderItemsInTreeStructuredView, expandViews, getKaotoViewControl } from '../utils/tree-view';

describe('Integrations View', function () {
	this.timeout(60_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view');

	let kaotoViewContainer: ViewControl | undefined;
	let integrationsSection: ViewSection | undefined;
	let items: TreeItem[] | undefined;
	let labels: string[];

	before(async function () {
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER, false);

		const control = await getKaotoViewControl();
		kaotoViewContainer = control.kaotoViewContainer;

		integrationsSection = await control.kaotoView?.getContent().getSection('Integrations');
		await expandViews(control.kaotoView, 'Integrations');

		// expand folders
		await expandFolderItemsInTreeStructuredView(integrationsSection, 'kamelets', 'pipes', 'others');

		items = await integrationsSection?.getDriver().wait(
			async () => {
				const items = await integrationsSection?.getVisibleItems();
				if (items && items?.length > 0) {
					return items as TreeItem[];
				} else {
					return undefined;
				}
			},
			5_000,
			'Integrations section items were not loaded properly',
			500,
		);

		if (items) {
			labels = await Promise.all(items.map((item) => item.getLabel()));
		}
	});

	after(async function () {
		await collapseItemsInsideTreeStructuredView(integrationsSection);
		await kaotoViewContainer?.closeView();
		await new EditorView().closeAllEditors();
	});

	it('items are displayed', async function () {
		expect(labels).to.not.be.empty;
	});

	it('camel routes (*.camel.xml) loaded', async function () {
		const xmlRoutes = labels.filter((label) => label.includes('.camel.xml'));

		expect(xmlRoutes).to.not.be.empty;
		expect(xmlRoutes).to.have.lengthOf(2);
		expect(xmlRoutes).to.include.members(['sample.camel.xml', 'kaoto.camel.xml']);
	});

	it('camel routes (*.camel.yaml) loaded', async function () {
		const yamlRoutes = labels.filter((label) => label.includes('.camel.yaml'));

		expect(yamlRoutes).to.not.be.empty;
		expect(yamlRoutes).to.have.lengthOf(3);
		expect(yamlRoutes).to.include.members(['sample1.camel.yaml', 'sample2.camel.yaml', 'sample3.camel.yaml']);
	});

	it('pipes (*.pipe.yaml | *-pipe.yaml) loaded', async function () {
		const pipes = labels.filter((label) => label.includes('.pipe.yaml') || label.includes('-pipe.yaml'));

		expect(pipes).to.not.be.empty;
		expect(pipes).to.have.lengthOf(2);
		expect(pipes).to.include.members(['pipe1.pipe.yaml', 'pipe2-pipe.yaml']);
	});

	it('kamelets (*.kamelet.yaml) loaded', async function () {
		const kamelets = labels.filter((label) => label.includes('.kamelet.yaml'));

		expect(kamelets).to.not.be.empty;
		expect(kamelets).to.have.lengthOf(1);
		expect(kamelets).to.contain('kam1.kamelet.yaml');
	});

	it('routes are parsed and displayed', async function () {
		const routes = labels.filter((label) => label.startsWith('route-'));
		expect(routes).to.not.be.empty;
		expect(routes).to.have.lengthOf(10);

		const route = (await integrationsSection?.findItem('route-2700')) as TreeItem;
		expect(route).to.not.be.undefined;
		expect(await route.getLabel()).to.be.equal('route-2700');
	});

	it('click on file opens Kaoto editor', async function () {
		const sample2 = (await integrationsSection?.findItem('sample2.camel.yaml')) as TreeItem;
		await sample2.click();

		const driver = sample2.getDriver();
		await driver.wait(
			async () => {
				const editor = await new EditorView().getActiveTab();
				return (await editor?.getTitle()) === 'sample2.camel.yaml';
			},
			5_000,
			`Cannot open file 'sample2.camel.yaml'`,
			500,
		);

		const { kaotoWebview } = await switchToKaotoFrame(driver, true);
		await checkTopologyLoaded(driver, 20_000);

		await kaotoWebview.switchBack();
	});
});
