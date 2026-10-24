/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { expect } from 'chai';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { VSCodeKaotoEditorChannelApi } from '../../webview/VSCodeKaotoEditorChannelApi';
import { getTestWorkspaceFolder } from '../utils/TestSetup';

/**
 * The lookup of the `.kaoto` metadata file only depends on the edited document URI,
 * so the private methods are invoked on a minimal object instead of a full editor channel.
 */
interface MetadataFileLookup {
	findExistingKaotoMetadataFile(fileUri: vscode.Uri): Promise<vscode.Uri | undefined>;
	findKaotoMetadataToCreate(): Promise<vscode.Uri>;
}

function createApi(documentUri: vscode.Uri): MetadataFileLookup {
	const api = Object.create(VSCodeKaotoEditorChannelApi.prototype);
	api.currentEditedDocument = { uri: documentUri };
	return api as MetadataFileLookup;
}

suite('VSCodeKaotoEditorChannelApi .kaoto metadata file lookup', () => {
	let workspaceFolder: string;
	let workspaceKaoto: string;
	let workspaceKaotoBackup: string | undefined;
	let outsideRoot: string;
	let parentKaoto: string;

	setup(() => {
		workspaceFolder = getTestWorkspaceFolder();
		workspaceKaoto = path.join(workspaceFolder, '.kaoto');
		// The parent of the workspace folder plays the role of the user home directory
		parentKaoto = path.join(path.dirname(workspaceFolder), '.kaoto');

		// The fixture ships a .kaoto in the workspace root; move it aside so that it does not shadow the cases below
		workspaceKaotoBackup = undefined;
		if (fs.existsSync(workspaceKaoto)) {
			workspaceKaotoBackup = `${workspaceKaoto}.bak`;
			fs.renameSync(workspaceKaoto, workspaceKaotoBackup);
		}

		outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-metadata-outside-'));
	});

	teardown(() => {
		fs.rmSync(parentKaoto, { force: true });
		fs.rmSync(workspaceKaoto, { force: true });
		fs.rmSync(path.join(workspaceFolder, 'routes'), { recursive: true, force: true });
		if (workspaceKaotoBackup) {
			fs.renameSync(workspaceKaotoBackup, workspaceKaoto);
		}
		fs.rmSync(outsideRoot, { recursive: true, force: true });
	});

	suite('findExistingKaotoMetadataFile', () => {
		test('finds the .kaoto file at the workspace root', async () => {
			fs.writeFileSync(workspaceKaoto, '{}');
			const route = vscode.Uri.file(path.join(workspaceFolder, 'routes', 'a.camel.yaml'));

			const found = await createApi(route).findExistingKaotoMetadataFile(route);

			expect(found?.fsPath).to.equal(vscode.Uri.file(workspaceKaoto).fsPath);
		});

		test('does not look above the workspace root, e.g. into the home directory', async () => {
			fs.writeFileSync(parentKaoto, '{"leaked":"from-another-project"}');
			const route = vscode.Uri.file(path.join(workspaceFolder, 'routes', 'a.camel.yaml'));

			const found = await createApi(route).findExistingKaotoMetadataFile(route);

			expect(found).to.be.undefined;
		});

		test('prefers the workspace .kaoto over one located above the workspace root', async () => {
			fs.writeFileSync(parentKaoto, '{}');
			fs.writeFileSync(workspaceKaoto, '{}');
			const route = vscode.Uri.file(path.join(workspaceFolder, 'a.camel.yaml'));

			const found = await createApi(route).findExistingKaotoMetadataFile(route);

			expect(found?.fsPath).to.equal(vscode.Uri.file(workspaceKaoto).fsPath);
		});

		test('finds the closest .kaoto file between the route and the workspace root', async () => {
			const nested = path.join(workspaceFolder, 'routes');
			fs.mkdirSync(nested, { recursive: true });
			fs.writeFileSync(workspaceKaoto, '{}');
			fs.writeFileSync(path.join(nested, '.kaoto'), '{}');
			const route = vscode.Uri.file(path.join(nested, 'a.camel.yaml'));

			const found = await createApi(route).findExistingKaotoMetadataFile(route);

			expect(found?.fsPath).to.equal(vscode.Uri.file(path.join(nested, '.kaoto')).fsPath);
		});

		test('outside of any workspace, does not look up any .kaoto file', async () => {
			fs.writeFileSync(path.join(outsideRoot, '.kaoto'), '{}');
			const route = vscode.Uri.file(path.join(outsideRoot, 'a.camel.yaml'));

			const found = await createApi(route).findExistingKaotoMetadataFile(route);

			expect(found).to.be.undefined;
		});
	});

	suite('findKaotoMetadataToCreate', () => {
		test('creates the .kaoto file at the workspace root', async () => {
			const route = vscode.Uri.file(path.join(workspaceFolder, 'routes', 'a.camel.yaml'));

			const toCreate = await createApi(route).findKaotoMetadataToCreate();

			expect(toCreate.fsPath).to.equal(vscode.Uri.file(workspaceKaoto).fsPath);
		});

		test('outside of any workspace, fails instead of creating a .kaoto file', async () => {
			const route = vscode.Uri.file(path.join(outsideRoot, 'a.camel.yaml'));

			let error: unknown;
			try {
				await createApi(route).findKaotoMetadataToCreate();
			} catch (ex) {
				error = ex;
			}

			expect(error).to.be.instanceOf(Error);
		});
	});
});
