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
import { By, EditorView, until, VSBrowser, WebDriver, WebView, logging } from 'vscode-extension-tester';
import { assert } from 'chai';
import * as path from 'path';
import { checkEmptyCanvasLoaded, checkTopologyLoaded, openAndSwitchToKaotoFrame, workaroundToRedrawContextualMenu } from '../utils/editor';
import { openResourcesAndWaitForActivation } from '../utils/extension';
import { KaotoCanvas, KaotoEditor, kaotoLocators, DataMapperEditor } from '../pageObjects';
import { waitUntil } from 'async-wait-until';
import * as fs from 'fs-extra';

const DATA_TEST_ID_DATAMAPPERSTEP_2_5 = 'custom-node__route.from.steps.0.step:kaoto-datamapper';

describe('Kaoto basic development flow', function () {
	this.timeout(90_000);

	const workspaceFolder = path.join(__dirname, '../../test Fixture with speci@l chars');

	let driver: WebDriver;
	let globalKaotoWebView: WebView;

	before(async function () {
		await openResourcesAndWaitForActivation(workspaceFolder);
		const logger = logging.getLogger('webdriver');
		logger.setLevel(logging.Level.DEBUG);
		fs.copySync(path.join(workspaceFolder, 'empty.camel.yaml'), path.join(workspaceFolder, 'empty_copy.camel.yaml'));
		fs.copySync(path.join(workspaceFolder, 'empty.camel.xml'), path.join(workspaceFolder, 'empty_copy.camel.xml'));
		fs.copySync(path.join(workspaceFolder, 'empty.camel.yaml'), path.join(workspaceFolder, 'for_datamapper_test.camel.yaml'));
		fs.copySync(path.join(workspaceFolder, 'emptyPipe_template.pipe.yaml'), path.join(workspaceFolder, 'emptyPipe.pipe.yaml'));
		fs.copySync(path.join(workspaceFolder, 'emptyPipe_template.pipe.yaml'), path.join(workspaceFolder, 'emptyPipe-pipe.yaml'));

		driver = VSBrowser.instance.driver;
	});

	after(function () {
		fs.rmSync(path.join(workspaceFolder, 'empty_copy.camel.yaml'));
		fs.rmSync(path.join(workspaceFolder, 'empty_copy.camel.xml'));
		fs.rmSync(path.join(workspaceFolder, 'for_datamapper_test.camel.yaml'));
		fs.rmSync(path.join(workspaceFolder, 'emptyPipe.pipe.yaml'));
		fs.rmSync(path.join(workspaceFolder, 'emptyPipe-pipe.yaml'));

		// Fallback: delete all xsl files
		const files = fs.readdirSync(workspaceFolder);
		const xslFiles = files.filter((file) => file.endsWith('.xsl'));
		xslFiles.forEach((file) => {
			fs.rmSync(path.join(workspaceFolder, file));
		});
	});

	afterEach(async function () {
		if (globalKaotoWebView !== undefined) {
			try {
				await globalKaotoWebView.switchBack();
			} catch {
				// probably test not failed in Kaoto UI, just continue
			}
		}
		const editorView = new EditorView();
		await editorView.closeAllEditors();
	});

	const pipeFiles = ['emptyPipe.pipe.yaml', 'emptyPipe-pipe.yaml'];

	pipeFiles.forEach(function (pipeFile) {
		it(`Open "${pipeFile}" file and check Kaoto UI is loading`, async function () {
			const { kaotoWebview, kaotoEditor } = await openAndSwitchToKaotoFrame(workspaceFolder, pipeFile, driver, true);
			globalKaotoWebView = kaotoWebview;
			await checkIntegrationNameInTopBarLoaded(driver, 'my-integration-name');
			await checkTopologyLoaded(driver);
			await kaotoWebview.switchBack();
			assert.isFalse(await kaotoEditor.isDirty(), 'The Kaoto editor should not be dirty after everything has loaded.');
		});
	});

	const routeFiles = ['empty_copy.camel.yaml', 'empty_copy.camel.xml'];

	routeFiles.forEach(function (routeFile) {
		it(`Open "${routeFile}" file, check Kaoto UI is loading, add a step and save`, async function () {
			let { kaotoWebview, kaotoEditor } = await openAndSwitchToKaotoFrame(workspaceFolder, routeFile, driver, false);
			globalKaotoWebView = kaotoWebview;
			await checkEmptyCanvasLoaded(driver);
			await createNewRoute(driver);
			await addAMQPStep(driver);
			await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__amqp', 'amqp');

			await kaotoWebview.switchBack();
			assert.isTrue(await kaotoEditor.isDirty(), 'The Kaoto editor should be dirty after adding a step.');
			await kaotoEditor.save();
			await waitUntil(async () => {
				return !(await kaotoEditor.isDirty());
			});

			const editorView = new EditorView();
			await editorView.closeAllEditors();

			({ kaotoWebview, kaotoEditor } = await openAndSwitchToKaotoFrame(workspaceFolder, routeFile, driver, true));
			globalKaotoWebView = kaotoWebview;
			await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__amqp', 'amqp');
			await kaotoWebview.switchBack();
		});
	});

	it('Open empty file, add a datamapper step and save', async function () {
		let { kaotoWebview, kaotoEditor } = await openAndSwitchToKaotoFrame(workspaceFolder, 'for_datamapper_test.camel.yaml', driver, false);
		globalKaotoWebView = kaotoWebview;
		await checkEmptyCanvasLoaded(driver);
		await createNewRoute(driver);
		await addDatamapperStep(driver, kaotoWebview);
		await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__kaoto-datamapper', 'kaoto-datamapper');

		await openDataMapperEditor(driver);

		await addXsdForSource(driver, kaotoWebview);

		// TODO: Add a target xsd
		// TODO: Map an element

		await KaotoEditor.clickDesignTab(driver);

		const files = fs.readdirSync(workspaceFolder);
		const xslFiles = files.filter((file) => file.endsWith('.xsl'));
		assert.isTrue(xslFiles.length === 1, `Expected one xsl file created, found ${xslFiles.length}`);

		await deleteDataMapperStep(driver, workspaceFolder, kaotoWebview);

		await kaotoWebview.switchBack();
		assert.isTrue(await kaotoEditor.isDirty(), 'The Kaoto editor should be dirty after deleting a DataMapper step.');

		await kaotoEditor.save();
		await driver.wait(
			async () => {
				const isDirty = await kaotoEditor.isDirty();
				return !isDirty;
			},
			5_000,
			'The Kaoto editor should not be dirty after saving',
		);
	});

	it('Open Camel file and check Kaoto UI is loading', async function () {
		const { kaotoWebview, kaotoEditor } = await openAndSwitchToKaotoFrame(workspaceFolder, 'my.camel.yaml', driver, true);
		globalKaotoWebView = kaotoWebview;
		await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__timer', 'timer');
		await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__log', 'log');
		await kaotoWebview.switchBack();
		assert.isFalse(await kaotoEditor.isDirty(), 'The Kaoto editor should not be dirty after everything has loaded.');
	});

	it('Open Kamelet file and check Kaoto UI is loading', async function () {
		const { kaotoWebview, kaotoEditor } = await openAndSwitchToKaotoFrame(workspaceFolder, 'my.kamelet.yaml', driver, true);
		globalKaotoWebView = kaotoWebview;
		await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__timer', 'timer');
		await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__https', 'https');
		await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__kamelet:sink', 'kamelet:sink');
		await kaotoWebview.switchBack();
		assert.isFalse(await kaotoEditor.isDirty(), 'The Kaoto editor should not be dirty after everything has loaded.');
	});
});

async function addXsdForSource(driver: WebDriver, kaotoWebview: WebView) {
	await DataMapperEditor.attachXsdSchema(driver, kaotoWebview, 'sourceBody-Body', 'shiporder.xsd');
	await DataMapperEditor.waitForSourceField(driver, 5_000);
}

async function openDataMapperEditor(driver: WebDriver) {
	const nodeSelector = `g[data-testid^="custom-node__kaoto-datamapper"],g[data-testid="custom-node__route.from.steps.0.kaoto-datamapper"],g[data-testid="${DATA_TEST_ID_DATAMAPPERSTEP_2_5}"]`;
	await DataMapperEditor.openFromNode(driver, nodeSelector);
}

async function deleteDataMapperStep(driver: WebDriver, workspaceFolder: string, kaotoWebview: WebView) {
	await checkStepWithTestIdOrNodeLabelPresent(driver, 'custom-node__kaoto-datamapper', 'kaoto-datamapper');

	const kaotoNodeConfigured = await KaotoCanvas.findNodeByTestIdOrLabel(driver, 'custom-node__kaoto-datamapper', 'kaoto-datamapper');
	await kaotoNodeConfigured.click();

	await workaroundToRedrawContextualMenu(kaotoWebview);

	await KaotoCanvas.resetView(driver, 5_000);
	await KaotoCanvas.deleteStep(driver, 'kaoto-datamapper', 5_000);
	await KaotoCanvas.confirmDeleteStepAndFile(driver, 5_000);

	await driver.wait(
		async () => {
			const filesAfterDeletion = fs.readdirSync(workspaceFolder);
			const xslFilesAfterDeletion = filesAfterDeletion.filter((file) => file.endsWith('.xsl'));
			return xslFilesAfterDeletion.length === 0;
		},
		5_000,
		'The xsl files should be deleted after deleting the data mapper step',
	);
}

async function createNewRoute(driver: WebDriver) {
	await KaotoCanvas.clickDslListButton(driver);
}

async function addAMQPStep(driver: WebDriver) {
	const canvasNode = await KaotoCanvas.findTimerOrFromNode(driver);
	await KaotoCanvas.openContextMenu(driver, canvasNode);
	await KaotoCanvas.clickReplaceInContextMenu(driver);

	await driver.wait(
		until.elementLocated(By.xpath(kaotoLocators.KaotoCatalog.tileHeaderByTestId('amqp'))),
		5000,
		'Cannot find the tile header for the AMQP step',
	);
	await (await driver.findElement(By.xpath(kaotoLocators.KaotoCatalog.tileHeaderByTestId('amqp')))).click();
}

async function addDatamapperStep(driver: WebDriver, kaotoWebview: WebView) {
	const canvasNode = await KaotoCanvas.findLogNode(driver);
	await KaotoCanvas.openContextMenu(driver, canvasNode);

	await workaroundToRedrawContextualMenu(kaotoWebview);

	await KaotoCanvas.clickReplaceInContextMenu(driver);

	await driver.wait(until.elementLocated(By.xpath(kaotoLocators.KaotoCatalog.filterInput)), 5000, 'Cannot find the filter input');
	const filterInput = await driver.findElement(By.xpath(kaotoLocators.KaotoCatalog.filterInput));
	await filterInput.sendKeys('datamapper');
	await driver.wait(
		until.elementLocated(By.xpath(kaotoLocators.KaotoCatalog.tileHeaderByTestId('kaoto-datamapper'))),
		5000,
		'Cannot find the tile for the DataMapper step',
	);
	await (await driver.findElement(By.xpath(kaotoLocators.KaotoCatalog.tileHeaderByTestId('kaoto-datamapper')))).click();
}

/**
 * @param driver
 * @param testId used for Kaoto 2.3
 * @param nodeLabel used for Kaoto 2.4
 */
async function checkStepWithTestIdOrNodeLabelPresent(driver: WebDriver, testId: string, nodeLabel: string) {
	await KaotoCanvas.findNodeByTestIdOrLabel(driver, testId, nodeLabel);
}

async function checkIntegrationNameInTopBarLoaded(driver: WebDriver, name: string) {
	await KaotoEditor.waitForIntegrationName(driver, name);
}
