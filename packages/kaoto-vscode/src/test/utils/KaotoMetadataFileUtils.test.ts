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
import { findExistingKaotoMetadataFile } from '../../utils/KaotoMetadataFileUtils';
import { getTestWorkspaceFolder } from '../utils/TestSetup';

suite('KaotoMetadataFileUtils', () => {
	let workspaceFolder: string;
	let workspaceKaoto: string;
	let workspaceKaotoBackup: string | undefined;
	let outsideRoot: string;
	let parentKaoto: string;

	setup(() => {
		workspaceFolder = getTestWorkspaceFolder();
		workspaceKaoto = path.join(workspaceFolder, '.kaoto');
		parentKaoto = path.join(path.dirname(workspaceFolder), '.kaoto');

		workspaceKaotoBackup = undefined;
		if (fs.existsSync(workspaceKaoto)) {
			workspaceKaotoBackup = `${workspaceKaoto}.bak`;
			fs.renameSync(workspaceKaoto, workspaceKaotoBackup);
		}

		outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-fileutils-outside-'));
	});

	teardown(() => {
		fs.rmSync(parentKaoto, { force: true });
		fs.rmSync(workspaceKaoto, { force: true });
		fs.rmSync(path.join(workspaceFolder, 'nested-dir'), { recursive: true, force: true });
		if (workspaceKaotoBackup) {
			fs.renameSync(workspaceKaotoBackup, workspaceKaoto);
		}
		fs.rmSync(outsideRoot, { recursive: true, force: true });
	});

	test('finds .kaoto when given a directory URI directly', async () => {
		const nestedDir = path.join(workspaceFolder, 'nested-dir');
		fs.mkdirSync(nestedDir, { recursive: true });
		const nestedKaoto = path.join(nestedDir, '.kaoto');
		fs.writeFileSync(nestedKaoto, '{}');

		const dirUri = vscode.Uri.file(nestedDir);
		const found = await findExistingKaotoMetadataFile(dirUri, true);

		expect(found?.fsPath).to.equal(vscode.Uri.file(nestedKaoto).fsPath);
	});

	test('finds .kaoto in parent folder when file URI is given', async () => {
		fs.writeFileSync(workspaceKaoto, '{}');
		const route = vscode.Uri.file(path.join(workspaceFolder, 'route.camel.yaml'));

		const found = await findExistingKaotoMetadataFile(route, false);

		expect(found?.fsPath).to.equal(vscode.Uri.file(workspaceKaoto).fsPath);
	});

	test('does not look above workspace folder', async () => {
		fs.writeFileSync(parentKaoto, '{}');
		const route = vscode.Uri.file(path.join(workspaceFolder, 'route.camel.yaml'));

		const found = await findExistingKaotoMetadataFile(route, false);

		expect(found).to.be.undefined;
	});
});
