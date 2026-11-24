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
import * as path from 'node:path';
import { VSBrowser, WebDriver, Workbench } from 'vscode-extension-tester';
import { openResourcesAndWaitForActivation, waitForCamelLanguageServer, waitForCamelLanguageServerDiagnostic } from '../utils/extension';
import { readUserSetting, resetUserSettings, setUserSettingsDirectly } from '../utils/settings';
import { dismissBlockingModal } from '../utils/workbench';

/**
 * The extension downloads the Camel Language Server JAR, starts it with Java and sends it the Kaoto catalog settings.
 * The unit tests replace all of that with a fake client, so these tests check that the packaged extension gets from an
 * opened file to a diagnostic of the real server in the Problems view. They never enter the Kaoto webview.
 */
describe('Camel Language Server', function () {
	this.timeout(60_000);

	const WORKSPACE_FOLDER = path.join(__dirname, '../../test Fixture with speci@l chars');
	/** Its files have a typo in an option name each, which the server reports as an unknown option */
	const FIXTURE_FOLDER = 'camel-language-server';
	/** Paths in the workspace folder, which has more application.properties files in other folders */
	const ROUTE_FILE = `${FIXTURE_FOLDER}/unknown-option.camel.yaml`;
	const PROPERTIES_FILE = `${FIXTURE_FOLDER}/application.properties`;
	const UNKNOWN_OPTION = 'Unknown option';
	const LSP_ENABLED_SETTING_ID = 'kaoto.lsp.enabled';

	let driver: WebDriver;
	let previousLspEnabled: unknown;

	before(async function () {
		this.timeout(180_000);
		driver = VSBrowser.instance.driver;
		// The settings of the test instance turn the server off, so that the other groups neither download nor start it.
		previousLspEnabled = readUserSetting(LSP_ENABLED_SETTING_ID);
		setUserSettingsDirectly(LSP_ENABLED_SETTING_ID, true);
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER);
	});

	after(async function () {
		if (typeof previousLspEnabled === 'boolean') {
			setUserSettingsDirectly(LSP_ENABLED_SETTING_ID, previousLspEnabled);
		} else {
			resetUserSettings(LSP_ENABLED_SETTING_ID);
		}
		await new Workbench().executeCommand('workbench.action.closeAllEditors');
		// in case the Kaoto editor changed the route, which makes VS Code ask whether to save it
		await dismissBlockingModal(driver);
	});

	it('starts the server for a Camel route and shows its diagnostics in the Problems view', async function () {
		// the first start downloads the server JAR from Maven Central, and the server loads the Camel catalog of the
		// selected Kaoto catalog through Maven
		this.timeout(300_000);
		// opens the route in the Kaoto editor; ExTester waits until its tab shows
		await VSBrowser.instance.openResources(path.join(WORKSPACE_FOLDER, ROUTE_FILE));
		await waitForCamelLanguageServer(driver, 180_000);
		await waitForCamelLanguageServerDiagnostic(driver, ROUTE_FILE, UNKNOWN_OPTION, 60_000);
	});

	it('shows the diagnostics of the server for application properties', async function () {
		this.timeout(150_000);
		await VSBrowser.instance.openResources(path.join(WORKSPACE_FOLDER, PROPERTIES_FILE));
		await waitForCamelLanguageServer(driver, 30_000);
		await waitForCamelLanguageServerDiagnostic(driver, PROPERTIES_FILE, UNKNOWN_OPTION, 60_000);
	});
});
