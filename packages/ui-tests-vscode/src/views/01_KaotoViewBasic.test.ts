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
import { SideBarView, ViewControl, ViewItem, ViewSection } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { expandViews, getKaotoViewControl } from '../utils/tree-view';

describe('Kaoto View Container', function () {
	this.timeout(180_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars', 'kaoto-view');

	let kaotoViewContainer: ViewControl | undefined;
	let kaotoView: SideBarView | undefined;
	let helpFeedbackSection: ViewSection | undefined;
	let integrationsSection: ViewSection | undefined;
	let deploymentsSection: ViewSection | undefined;
	let testsSection: ViewSection | undefined;
	let openAPISection: ViewSection | undefined;

	before(async function () {
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER);
		const control = await getKaotoViewControl();
		kaotoViewContainer = control.kaotoViewContainer;
		await expandViews(control.kaotoView, 'Integrations', 'Deployments', 'Tests', 'Help & Feedback');
	});

	after(async function () {
		await kaotoViewContainer?.closeView();
	});

	it('is available in Activity Bar', async function () {
		expect(kaotoViewContainer).to.not.be.undefined;

		const title = await kaotoViewContainer?.getTitle();
		expect(title).to.equal('Kaoto');
	});

	it('can be activated', async function () {
		kaotoView = await kaotoViewContainer?.openView();
		expect(kaotoView).to.not.be.undefined;
	});

	describe('Integrations view', function () {
		after(async function () {
			await integrationsSection?.collapse();
		});

		it('is present', async function () {
			integrationsSection = await kaotoView?.getContent().getSection('Integrations');
			expect(integrationsSection).to.not.be.undefined;
		});
	});

	describe('Deployments view', function () {
		after(async function () {
			await deploymentsSection?.collapse();
		});

		it('is present', async function () {
			deploymentsSection = await kaotoView?.getContent().getSection('Deployments');
			expect(deploymentsSection).to.not.be.undefined;
		});
	});

	describe('OpenAPI view', function () {
		after(async function () {
			await openAPISection?.collapse();
		});

		it('is present', async function () {
			openAPISection = await kaotoView?.getContent().getSection('OpenAPI');
			expect(openAPISection).to.not.be.undefined;
		});
	});

	describe('Tests view', function () {
		after(async function () {
			await testsSection?.collapse();
		});

		it('is present', async function () {
			testsSection = await kaotoView?.getContent().getSection('Tests');
			expect(testsSection).to.not.be.undefined;
		});
	});

	describe('Help & Feedback view', function () {
		after(async function () {
			await helpFeedbackSection?.collapse();
		});

		it('is present', async function () {
			helpFeedbackSection = await kaotoView?.getContent().getSection('Help & Feedback');
			expect(helpFeedbackSection).to.not.be.undefined;
		});

		it('content check', async function () {
			const items = (await helpFeedbackSection?.getVisibleItems()) as ViewItem[];
			const labels = await Promise.all(items.map((item) => item.getText()));
			expect(labels).to.not.be.empty;
		});
	});
});
