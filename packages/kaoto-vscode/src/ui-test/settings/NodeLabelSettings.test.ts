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
import { ActivityBar, after, before, ComboSetting, VSBrowser, WebDriver, WebView, Workbench } from 'vscode-extension-tester';
import { KaotoCanvas } from '../pageObjects';
import { checkTopologyLoaded, closeEditor, openAndSwitchToKaotoFrame } from '../utils/editor';
import { resetUserSettings } from '../utils/settings';
import { dismissBlockingModal } from '../utils/workbench';

describe('User Settings', function () {
	this.timeout(90_000);

	const WORKSPACE_FOLDER = join(__dirname, '../../test Fixture with speci@l chars');
	const LABEL_SETTINGS_ID = 'kaoto.nodeLabel';

	let driver: WebDriver;
	let kaotoWebview: WebView;

	before(async function () {
		driver = VSBrowser.instance.driver;

		// provide the Node Label using Settings UI editor
		const settings = await new Workbench().openSettings();
		const textSetting = await driver.wait(
			async () => {
				return (await settings.findSetting('Node Label', 'Kaoto')) as ComboSetting;
			},
			10_000,
			'Looking for "Kaoto > Node Label" combo setting.',
		);
		await textSetting.setValue('id');
		await driver.sleep(1_000); // stabilize tests which are sometimes failing on macOS CI
		await closeEditor('Settings', true);

		// close sidebar
		await (await new ActivityBar().getViewControl('Explorer'))?.closeView();

		// open the integration file using Kaoto editor
		kaotoWebview = (await openAndSwitchToKaotoFrame(WORKSPACE_FOLDER, 'my.camel.yaml', driver, true)).kaotoWebview;
		await checkTopologyLoaded(driver);
	});

	after(async function () {
		if (kaotoWebview !== undefined) {
			try {
				await kaotoWebview.switchBack();
			} catch {
				// probably test not failed in Kaoto UI, just continue
			}
		}
		resetUserSettings(LABEL_SETTINGS_ID);
		// the editor in this step needs to be closed using command palette
		// because in some cases, specially on Windows, there was hover displayed which was blocking the editor close button
		await new Workbench().executeCommand('View: Close Editor');
		// resetUserSettings rewrites settings.json on disk while VS Code still has it open, so
		// closing can raise "Do you want to save the changes you made to settings.json?". Left up,
		// its backdrop blocks every click for the rest of the run.
		await dismissBlockingModal(driver);
	});

	it(`Check 'id' Node Label is used instead of default 'description'`, async function () {
		this.timeout(60_000);
		const timer = await KaotoCanvas.findNodeLabelText(driver, 'custom-node__route.from', 10_000);
		const label = await timer.getText();

		expect(label.split('\n')).to.contains('timerID');
	});
});
