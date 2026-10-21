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
import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { findAllApplicationPropertiesFiles } from '../../services/ApplicationPropertiesFinder';
import { getTestWorkspaceFolder } from '../utils/TestSetup';

/** Workspace-relative paths with forward slashes, sorted, so results compare the same on every platform. */
const relativePaths = (uris: vscode.Uri[]) => uris.map((uri) => vscode.workspace.asRelativePath(uri, false)).sort((a, b) => a.localeCompare(b));

suite('ApplicationPropertiesFinder', () => {
	suite('findAllApplicationPropertiesFiles', () => {
		// Uri.file() gives a lowercase drive letter on Windows, which may differ from the workspace folder Uri.
		const cases = [
			{
				name: 'finds the properties files next to a file given as a Uri',
				start: () => vscode.Uri.file(path.join(getTestWorkspaceFolder(), 'suggestions', 'route.camel.yaml')),
				expected: ['suggestions/application-dev.properties', 'suggestions/application-prod.properties', 'suggestions/application.properties'],
			},
			{
				name: 'finds the properties files next to a file given as a filesystem path',
				start: () => path.join(getTestWorkspaceFolder(), 'suggestions', 'route.camel.yaml'),
				expected: ['suggestions/application-dev.properties', 'suggestions/application-prod.properties', 'suggestions/application.properties'],
			},
			{
				name: 'walks up to the nearest parent folder with properties files',
				start: () =>
					vscode.Uri.file(
						path.join(getTestWorkspaceFolder(), 'camel-maven-main-project', 'src', 'main', 'resources', 'camel', 'my-camel-main-route.camel.yaml'),
					),
				expected: ['camel-maven-main-project/src/main/resources/application.properties'],
			},
		];

		for (const { name, start, expected } of cases) {
			test(name, async () => {
				const found = await findAllApplicationPropertiesFiles(start());

				expect(relativePaths(found)).to.deep.equal(expected);
			});
		}

		suite('outside the workspace', () => {
			let outsideFolder: string;

			setup(() => {
				outsideFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-properties-outside-'));
				fs.writeFileSync(path.join(outsideFolder, 'application.properties'), 'camel.main.name=outside\n');
			});

			teardown(() => {
				fs.rmSync(outsideFolder, { recursive: true, force: true });
			});

			test('returns no files for a file outside every workspace folder', async () => {
				const found = await findAllApplicationPropertiesFiles(vscode.Uri.file(path.join(outsideFolder, 'route.camel.yaml')));

				expect(found).to.deep.equal([]);
			});
		});
	});
});
