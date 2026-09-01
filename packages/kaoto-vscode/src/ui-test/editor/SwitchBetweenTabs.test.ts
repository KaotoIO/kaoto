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
import { By, EditorView, until, VSBrowser, WebDriver, WebView } from 'vscode-extension-tester';
import { openAndSwitchToKaotoFrame } from '../utils/editor';
import { join } from 'path';
import { expect } from 'chai';
import { EditorTabs, kaotoLocators } from '../pageObjects';

describe('Switching between editor tabs', function () {
	this.timeout(90_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars');

	let driver: WebDriver;
	let kaotoWebview: WebView;

	before(function () {
		driver = VSBrowser.instance.driver;
	});

	after(async function () {
		await kaotoWebview.switchBack();
		await new EditorView().closeAllEditors();
	});

	it('Open "my.camel.yaml" file and check "Design" tab is active by default', async function () {
		kaotoWebview = (await openAndSwitchToKaotoFrame(WORKSPACE_FOLDER, 'my.camel.yaml', driver, true)).kaotoWebview;
		await driver.wait(until.elementLocated(By.className(kaotoLocators.EditorTabs.tabsList)), 5_000, 'Editor tabs are not displayed properly!');
		const tabs = new EditorTabs();
		expect(await tabs.getActiveTabName()).to.equal('Design');
	});

	it('Switch to "Beans" tab and check it is active', async function () {
		const tabs = new EditorTabs();
		await tabs.switchToTab('Beans editor');
		await EditorTabs.waitForBeansTab(driver);
		expect(await tabs.getActiveTabName()).to.equal('Beans');
	});

	it('Switch to "DataMapper" tab and check it is active', async function () {
		const tabs = new EditorTabs();
		await tabs.switchToTab('DataMapper');
		await EditorTabs.waitForDataMapperTab(driver);
		expect(await tabs.getActiveTabName()).to.equal('DataMapper');
	});

	it('Switch back to "Design" tab and check it is active', async function () {
		const tabs = new EditorTabs();
		await tabs.switchToTab('Design canvas');
		await EditorTabs.waitForDesignTab(driver);
		expect(await tabs.getActiveTabName()).to.equal('Design');
	});
});
