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
import * as path from 'path';
import { checkTopologyLoaded, closeEditor, openAndSwitchToKaotoFrame, workaroundToRedrawContextualMenu } from '../utils/editor';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { resetUserSettings } from '../utils/settings';
import { expandFolderItemsInTreeStructuredView, getTreeItem } from '../utils/tree-view';
import {
	EditorView,
	VSBrowser,
	WebDriver,
	Workbench,
	NotificationType,
	WebView,
	ActivityBar,
	TextEditor,
	CheckboxSetting,
	before,
} from 'vscode-extension-tester';
import { KaotoCanvas } from '../pageObjects';
import { assert, expect } from 'chai';
import * as fs from 'fs';

describe('Maven dependency update pom.xml', function () {
	this.timeout(180_000);

	const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars', 'camel-maven-quarkus-project');

	let driver: WebDriver;
	let kaotoWebview: WebView;

	before(async function () {
		driver = VSBrowser.instance.driver;
		await openResourcesAndWaitForActivation(workspaceFolder);

		await new Workbench().openNotificationsCenter().then(async (notificationsCenter) => await notificationsCenter.clearAllNotifications());

		// make pom.xml dirty
		await VSBrowser.instance.openResources(path.join(workspaceFolder, 'pom.xml'), async () => {
			await driver.wait(
				async () => {
					const editorTitles = await new EditorView().getOpenEditorTitles();
					return editorTitles.includes('pom.xml');
				},
				5000,
				'Pom.xml is not opened',
			);
		});
		const pomEditor = (await new EditorView().openEditor('pom.xml')) as TextEditor;
		await pomEditor.typeTextAt(1, 20, ' ');
	});

	const addComponentAndSave = async () => {
		kaotoWebview = (
			await openAndSwitchToKaotoFrame(path.join(workspaceFolder, 'src/main/resources/camel'), 'my-camel-quarkus-route.camel.yaml', driver, true)
		).kaotoWebview;

		await checkTopologyLoaded(driver);
		await addSqlComponentStep();

		// save editor
		await kaotoWebview.switchBack();
		await new Workbench().executeCommand('File: Save');
	};

	const checkDependenciesInPomXml = (dependencies: string[]) => {
		const pomXml = fs.readFileSync(path.join(workspaceFolder, 'pom.xml'), 'utf8');
		for (const dependency of dependencies) {
			assert.include(pomXml, `<artifactId>${dependency}</artifactId>`);
		}
	};

	const waitForNotifications = async () => {
		// wait till the notification is shown
		await waitForNotification(
			true,
			'Updating Camel dependencies in pom.xml',
			'Timeout waiting for the notification of the Maven dependency update',
			5000,
			100,
		);

		// wait till dependency update finishes
		await waitForNotification(
			false,
			'Updating Camel dependencies in pom.xml',
			'Timeout waiting for the notification of the Maven dependency update',
			40_000,
			1_000,
		);
	};

	describe('update on save test', function () {
		after(async function () {
			await deleteSqlComponentStep();
			await new EditorView().closeAllEditors();
			removeSqlDependencyFromPomXml();
		});

		it('should invoke the update of the Maven dependencies when a step is added', async function () {
			await addComponentAndSave();

			await waitForNotification(
				true,
				'The pom.xml file has unsaved changes. Please save it before updating Camel dependencies.',
				'Timeout waiting for the notification of the unsaved changes in pom.xml',
				5000,
				100,
				NotificationType.Warning,
			);

			const notificationsCenter = await new Workbench().openNotificationsCenter();
			const notifications = await notificationsCenter.getNotifications(NotificationType.Warning);
			let camelDependenciesUpdateNotification;
			for (const notification of notifications) {
				const message = await notification.getMessage();
				if (message.includes('The pom.xml file has unsaved changes. Please save it before updating Camel dependencies.')) {
					camelDependenciesUpdateNotification = notification;
					break;
				}
			}
			await camelDependenciesUpdateNotification?.takeAction('Save and Continue');

			await waitForNotifications();
		});

		it('pom.xml should be updated with the new dependencies', async function () {
			checkDependenciesInPomXml(['camel-quarkus-sql']);
		});
	});

	describe('update manually test', function () {
		before(async function () {
			// disable auto update on save
			const settings = await new Workbench().openSettings();
			const checkboxSetting = await driver.wait(
				async () => {
					return (await settings.findSetting('On Save', 'Kaoto', 'Maven', 'Dependencies Update')) as CheckboxSetting;
				},
				5_000,
				'Looking for "Kaoto > Maven > Dependencies Update: On Save" checkbox.',
			);
			await checkboxSetting.setValue(false);
			await driver.sleep(1_000); // stabilize tests which are sometimes failing on macOS CI
			await closeEditor('Settings', true);
		});

		after(async function () {
			await deleteSqlComponentStep();
			await new EditorView().closeAllEditors();
			removeSqlDependencyFromPomXml();
			resetUserSettings('kaoto.maven.dependenciesUpdate.onSave');
		});

		it('should update the Maven dependencies when the context menu is invoked', async function () {
			await addComponentAndSave();

			// invoke the context menu dependencies update
			const kaotoController = await new ActivityBar().getViewControl('Kaoto');
			const kaotoView = await kaotoController?.openView();
			const integrationsSection = await kaotoView?.getContent().getSection('Integrations');

			// expand folders
			await expandFolderItemsInTreeStructuredView(integrationsSection, 'src', 'main', 'resources', 'camel');

			// click Update Camel Dependencies button
			const item = await getTreeItem(driver, integrationsSection, 'my-camel-quarkus-route.camel.yaml');
			expect(item).to.not.be.undefined;
			const contextMenu = await item?.openContextMenu();
			const updateDependenciesButton = await contextMenu?.getItem('Update Camel Dependencies');
			await updateDependenciesButton?.click();

			// close Kaoto view
			await kaotoController?.closeView();

			await waitForNotifications();
		});

		it('pom.xml should be updated with the new dependencies', async function () {
			checkDependenciesInPomXml(['camel-quarkus-sql']);
		});
	});

	/**
	 * Remove dependencies added for SQL component from the pom.xml file
	 */
	function removeSqlDependencyFromPomXml() {
		const pomXml = fs.readFileSync(path.join(workspaceFolder, 'pom.xml'), 'utf8');
		// Remove the entire <dependency> block for camel-quarkus-sql
		const dependencyRegexSql =
			/<dependency>\s*<groupId>org\.apache\.camel\.quarkus<\/groupId>\s*<artifactId>camel-quarkus-sql<\/artifactId>[\s\S]*?<\/dependency>\s*/g;
		const dependencyRegexYamlDsl =
			/<dependency>\s*<groupId>org\.apache\.camel\.quarkus<\/groupId>\s*<artifactId>camel-quarkus-yaml-dsl<\/artifactId>[\s\S]*?<\/dependency>\s*/g;

		let updatedPomXml = pomXml.replace(dependencyRegexSql, '');
		updatedPomXml = updatedPomXml.replace(dependencyRegexYamlDsl, '');

		fs.writeFileSync(path.join(workspaceFolder, 'pom.xml'), updatedPomXml);
	}

	/**
	 * Wait for a notification to be shown or not.
	 * @param shouldContain - true if the notification should be shown, false if it should not be shown
	 * @param message - the message of the notification
	 * @param errorMessage - the error message to be shown if the notification is not shown
	 * @param timeout - the timeout to wait for the notification
	 * @param interval - the interval to wait for the notification
	 */
	async function waitForNotification(
		shouldContain: boolean,
		message: string,
		errorMessage: string = 'Timeout waiting for the notification of the Maven dependency update',
		timeout: number = 5_000,
		interval: number = 500,
		notificationType: NotificationType = NotificationType.Info,
	) {
		await driver.wait(
			async () => {
				try {
					const notificationsCenter = await new Workbench().openNotificationsCenter();
					const notifications = await notificationsCenter.getNotifications(notificationType);
					const messages = await Promise.all(notifications.map(async (notification) => await notification.getMessage()));
					return shouldContain ? messages.some((msg) => msg === message) : !messages.some((msg) => msg === message); // if shouldContain is true, we wait for the message to be present, otherwise we wait for the message to be absent
				} catch {
					return false;
				}
			},
			timeout,
			errorMessage,
			interval,
		);
	}

	/**
	 * Add the SQL component step to the topology.
	 */
	async function addSqlComponentStep() {
		// hover over edge to show add step button and click Add Step button
		const edgeSelector = 'g[data-id^="my-camel-quarkus-route|route.from.steps.0.setBody >>> route.from.steps.1.log"]';
		const addStepButton = await KaotoCanvas.getAddStepButton(driver, edgeSelector);
		await addStepButton.click();

		// filter catalog and select SQL component
		await KaotoCanvas.filterCatalogAndSelectTile(driver, 'sql', 'sql');
	}

	/**
	 * Delete the SQL component step from the topology.
	 */
	async function deleteSqlComponentStep() {
		// activate and switch to Kaoto editor
		kaotoWebview = (
			await openAndSwitchToKaotoFrame(path.join(workspaceFolder, 'src/main/resources/camel'), 'my-camel-quarkus-route.camel.yaml', driver, true)
		).kaotoWebview;

		// right click on SQL component node
		const sqlNode = await KaotoCanvas.findNodeByCss(driver, 'custom-node__sql', 'sql');
		await KaotoCanvas.openContextMenu(driver, sqlNode);

		await workaroundToRedrawContextualMenu(kaotoWebview);

		// click Delete button
		await KaotoCanvas.clickDeleteInContextMenu(driver);

		// save editor
		await kaotoWebview.switchBack();
		try {
			await new Workbench().executeCommand('File: Save');
		} catch {
			// Sometimes there is an ElementNotInteractableError: element not interactable
			await new Workbench().executeCommand('File: Save');
		}
	}
});
