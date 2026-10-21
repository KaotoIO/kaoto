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
import { EditorView, VSBrowser, WebDriver, WebView } from 'vscode-extension-tester';
import * as path from 'path';
import { clickWhenClickable, dismissHoverOverlay, openAndSwitchToKaotoFrame } from '../utils/editor';
import { KaotoCanvas, KaotoEditor } from '../pageObjects';

describe('Property panel loading test', function () {
	this.timeout(60_000);

	const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars');

	let driver: WebDriver;
	let kaotoWebview: WebView;

	before(async function () {
		this.timeout(60_000);
		driver = VSBrowser.instance.driver;
	});

	after(async function () {
		if (kaotoWebview) {
			try {
				await kaotoWebview.switchBack();
			} catch {
				// already on the VS Code frame — switchBack is a no-op in that case
			}
		}
		await new EditorView().closeAllEditors();
	});

	it('Open "choice.camel.yaml" file and check property panel is loading and closing', async function () {
		kaotoWebview = (await openAndSwitchToKaotoFrame(workspaceFolder, 'choice.camel.yaml', driver, true)).kaotoWebview;

		const logNode = await KaotoCanvas.findNodeByInnerTestId(driver, 'route.from.steps.0.choice.when.0.steps.0.log');
		await dismissHoverOverlay(driver);
		await clickWhenClickable(driver, logNode);

		await KaotoEditor.waitForPropertyPanel(driver);
		await KaotoEditor.closePropertyPanel(driver);
		await KaotoEditor.waitForPropertyPanelClosed(driver);
	});
});
