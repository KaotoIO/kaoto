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
import { By, VSBrowser, WebView, Workbench } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';
import * as os from 'os';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { openAndSwitchToKaotoFrame, switchToKaotoFrame } from '../utils/editor';
import { KaotoEditor } from '../pageObjects/KaotoEditor';
import { kaotoLocators } from '../pageObjects/locators';
import { openResourcesAndWaitForActivation } from '../utils/extension';

describe('Broken file', function () {
	this.timeout(90_000);

	const WORKSPACE_FOLDER: string = path.join(__dirname, '../../test Fixture with speci@l chars');
	const CAMEL_FILE: string = 'broken.camel.yaml';
	/** `steps` is indented one column less than `uri`, so the YAML does not parse */
	const BROKEN_SOURCE = ['- route:', '    id: broken-route', '    from:', '      uri: timer:demo', '     steps: [', ''].join('\n');

	let temporaryFolder: string;
	let kaotoWebview: WebView | undefined;

	before(async function () {
		this.timeout(180_000);
		temporaryFolder = await mkdtemp(path.join(os.tmpdir(), 'kaoto-broken-'));
		await openResourcesAndWaitForActivation(WORKSPACE_FOLDER);
	});

	after(async function () {
		const driver = VSBrowser.instance.driver;
		await kaotoWebview?.switchBack();
		await driver.switchTo().defaultContent();
		await new Workbench().executeCommand('workbench.action.revertAndCloseActiveEditor');
		await rm(temporaryFolder, { recursive: true, force: true });
	});

	it('shows the broken-file state with the parser message, leaves the file as it is, and shows the diagram once it parses', async function () {
		const driver = VSBrowser.instance.driver;
		const filePath = path.join(temporaryFolder, CAMEL_FILE);
		await writeFile(filePath, BROKEN_SOURCE);

		({ kaotoWebview } = await openAndSwitchToKaotoFrame(temporaryFolder, CAMEL_FILE, driver, true));
		const parseError = await KaotoEditor.waitForBrokenFile(driver);
		expect(parseError).to.contain('line 5');
		expect(await driver.findElements(By.xpath(kaotoLocators.KaotoEditor.emptyCanvas))).to.have.length(0);
		await kaotoWebview.switchBack();
		kaotoWebview = undefined;
		expect(await readFile(filePath, 'utf8')).to.equal(BROKEN_SOURCE);

		/* The editor is not dirty, so VS Code reloads the document when the file changes on disk */
		await writeFile(filePath, await readFile(path.join(WORKSPACE_FOLDER, 'my.camel.yaml'), 'utf8'));

		({ kaotoWebview } = await switchToKaotoFrame(driver, false, CAMEL_FILE));
		await KaotoEditor.waitForTopology(driver);
		expect(await driver.findElements(By.xpath(kaotoLocators.KaotoEditor.brokenFile))).to.have.length(0);
	});
});
