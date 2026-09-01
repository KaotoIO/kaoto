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

import { assert } from 'chai';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { readKameletsFromDirectory } from '../../services/KameletFileReader';

suite('KameletFileReader', () => {
	let tmpDir: vscode.Uri;

	setup(async () => {
		// Create a temporary directory for each test
		const randomSuffix = Math.random().toString(36).slice(2);
		tmpDir = vscode.Uri.file(path.join(os.tmpdir(), `kaoto-test-kamelets-${randomSuffix}`));
		await vscode.workspace.fs.createDirectory(tmpDir);
	});

	teardown(async () => {
		// Clean up temp directory
		try {
			await vscode.workspace.fs.delete(tmpDir, { recursive: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	suite('readKameletsFromDirectory', () => {
		test('returns empty array for a non-existent directory', async () => {
			const nonExistent = path.join(os.tmpdir(), 'kaoto-does-not-exist-xyz');
			const result = await readKameletsFromDirectory(nonExistent);
			assert.deepEqual(result, []);
		});

		test('returns empty array for an empty directory', async () => {
			const result = await readKameletsFromDirectory(tmpDir.fsPath);
			assert.deepEqual(result, []);
		});

		test('returns empty array when directory contains only non-kamelet files', async () => {
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(tmpDir.fsPath, 'readme.txt')), new TextEncoder().encode('not a kamelet'));
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(tmpDir.fsPath, 'route.camel.yaml')), new TextEncoder().encode('camel route'));

			const result = await readKameletsFromDirectory(tmpDir.fsPath);
			assert.deepEqual(result, []);
		});

		test('returns kamelet files from the directory', async () => {
			const kameletContent = 'apiVersion: camel.apache.org/v1\nkind: Kamelet\nmetadata:\n  name: my-kamelet';
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(tmpDir.fsPath, 'my-kamelet.kamelet.yaml')), new TextEncoder().encode(kameletContent));

			const result = await readKameletsFromDirectory(tmpDir.fsPath);
			assert.lengthOf(result, 1);
			assert.strictEqual(result[0].filename, 'my-kamelet.kamelet.yaml');
			assert.strictEqual(result[0].content, kameletContent);
		});

		test('returns only .kamelet.yaml files and ignores other files', async () => {
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(tmpDir.fsPath, 'first.kamelet.yaml')), new TextEncoder().encode('kamelet-1'));
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(tmpDir.fsPath, 'second.kamelet.yaml')), new TextEncoder().encode('kamelet-2'));
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(tmpDir.fsPath, 'ignored.yaml')), new TextEncoder().encode('not a kamelet'));

			const result = await readKameletsFromDirectory(tmpDir.fsPath);
			assert.lengthOf(result, 2);

			const filenames = result.map((r) => r.filename).sort();
			assert.deepEqual(filenames, ['first.kamelet.yaml', 'second.kamelet.yaml']);
		});

		test('does not recurse into sub-directories', async () => {
			const subDir = vscode.Uri.file(path.join(tmpDir.fsPath, 'sub'));
			await vscode.workspace.fs.createDirectory(subDir);
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(subDir.fsPath, 'nested.kamelet.yaml')), new TextEncoder().encode('nested kamelet'));

			const result = await readKameletsFromDirectory(tmpDir.fsPath);
			assert.deepEqual(result, []);
		});

		test('returns correct content for each kamelet file', async () => {
			const contentA = 'content of kamelet A';
			const contentB = 'content of kamelet B';
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(tmpDir.fsPath, 'a.kamelet.yaml')), new TextEncoder().encode(contentA));
			await vscode.workspace.fs.writeFile(vscode.Uri.file(path.join(tmpDir.fsPath, 'b.kamelet.yaml')), new TextEncoder().encode(contentB));

			const result = await readKameletsFromDirectory(tmpDir.fsPath);
			const byFilename = Object.fromEntries(result.map((r) => [r.filename, r.content]));
			assert.strictEqual(byFilename['a.kamelet.yaml'], contentA);
			assert.strictEqual(byFilename['b.kamelet.yaml'], contentB);
		});
	});
});
