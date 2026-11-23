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
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { expandPath, isInsideDirectory, resolvePaths } from '../../utils/Path';

suite('Path', () => {
	suite('expandPath', () => {
		const CWD = path.join(path.sep, 'some', 'cwd');
		const folder = { uri: vscode.Uri.file('/workspace/service'), name: 'service' };

		test('keeps a relative path relative', () => {
			expect(expandPath('./kamelets', CWD, folder)).to.equal('./kamelets');
			expect(expandPath('../${workspaceFolderBasename}-kamelets', CWD, folder)).to.equal('../service-kamelets');
		});

		test('expands the tilde and ${homeDir} to the home directory', () => {
			expect(expandPath('~', CWD, folder)).to.equal(os.homedir());
			expect(expandPath('~/kamelets', CWD, folder)).to.equal(path.join(os.homedir(), 'kamelets'));
			expect(expandPath('${homeDir}/kamelets', CWD, folder)).to.equal(`${os.homedir()}/kamelets`);
		});

		test('expands ${cwd} and the variables of the given workspace folder', () => {
			expect(expandPath('${cwd}/kamelets', CWD, folder)).to.equal(`${CWD}/kamelets`);
			expect(expandPath('${workspaceFolder}/kamelets', CWD, folder)).to.equal(`${folder.uri.fsPath}/kamelets`);
		});

		test('keeps the variables of a workspace folder without one', () => {
			expect(expandPath('${workspaceFolder}/kamelets', CWD, undefined)).to.equal('${workspaceFolder}/kamelets');
		});
	});

	suite('resolvePaths', () => {
		const originalWorkspaceFolders = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders')!;
		const app = { uri: vscode.Uri.file('/workspace/app'), name: 'app', index: 0 };
		const appRoutes = { uri: vscode.Uri.file('/workspace/app-routes'), name: 'app-routes', index: 1 };

		setup(() => {
			Object.defineProperty(vscode.workspace, 'workspaceFolders', { get: () => [app, appRoutes], configurable: true });
		});

		teardown(() => {
			Object.defineProperty(vscode.workspace, 'workspaceFolders', originalWorkspaceFolders);
		});

		test('takes the workspace folder that contains cwd, not an earlier one whose path starts like it', () => {
			const cwd = path.join(appRoutes.uri.fsPath, 'src');

			expect([...resolvePaths(['${workspaceFolder}/kamelets', '${homeDir}/${workspaceFolderBasename}'], cwd)]).to.deep.equal([
				path.join(appRoutes.uri.fsPath, 'kamelets'),
				path.join(os.homedir(), 'app-routes'),
			]);
		});

		test('takes the first workspace folder when none contains cwd', () => {
			expect([...resolvePaths(['${workspaceFolder}/kamelets'], path.join(path.sep, 'tmp', 'camel'))]).to.deep.equal([
				path.join(app.uri.fsPath, 'kamelets'),
			]);
		});
	});

	suite('isInsideDirectory', () => {
		const DIRECTORY = path.join(path.sep, 'workspace', 'app');

		test('accepts the directory and the paths inside it', () => {
			expect(isInsideDirectory(DIRECTORY, DIRECTORY)).to.be.true;
			expect(isInsideDirectory(DIRECTORY, path.join(DIRECTORY, 'src', 'route.camel.yaml'))).to.be.true;
		});

		test('rejects the paths next to or above it, also when they start like it', () => {
			expect(isInsideDirectory(DIRECTORY, path.join(path.sep, 'workspace', 'app-routes'))).to.be.false;
			expect(isInsideDirectory(DIRECTORY, path.join(path.sep, 'workspace'))).to.be.false;
			expect(isInsideDirectory(DIRECTORY, path.join(DIRECTORY, '..', 'other'))).to.be.false;
		});
	});
});
