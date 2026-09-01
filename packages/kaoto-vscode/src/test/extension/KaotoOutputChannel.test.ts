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
import { assert } from 'chai';
import * as vscode from 'vscode';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';
import { KAOTO_EXECUTOR_TYPE_SETTING_ID } from '../../constants';

suite('KaotoOutputChannel - logStartupInfo', function () {
	let appendedLines: string[];
	let originalAppendLine: (value: string) => void;

	setup(function () {
		appendedLines = [];

		// Capture all lines written to the output channel
		const channel = KaotoOutputChannel.getInstance();
		originalAppendLine = channel.appendLine.bind(channel);
		channel.appendLine = (line: string) => {
			appendedLines.push(line);
		};
	});

	teardown(async function () {
		// Restore appendLine
		const channel = KaotoOutputChannel.getInstance();
		channel.appendLine = originalAppendLine;

		// Reset executor type setting to avoid leaking into other tests
		await vscode.workspace.getConfiguration().update(KAOTO_EXECUTOR_TYPE_SETTING_ID, undefined, vscode.ConfigurationTarget.Global);
	});

	function makeContext(extensionMode: vscode.ExtensionMode): vscode.ExtensionContext {
		return {
			extensionMode,
			extension: {
				packageJSON: { version: '2.12.0' },
			},
		} as unknown as vscode.ExtensionContext;
	}

	function getInfoLines(): string[] {
		return appendedLines.filter((l) => l.includes('[INFO]'));
	}

	function assertContainsField(lines: string[], field: string, value: string): void {
		const match = lines.find((l) => l.includes(`[INFO] ${field}: ${value}`));
		assert.isDefined(match, `Expected a line containing "[INFO] ${field}: ${value}" but got:\n${lines.join('\n')}`);
	}

	test('logs all expected fields in desktop Production mode', async function () {
		await vscode.workspace.getConfiguration().update(KAOTO_EXECUTOR_TYPE_SETTING_ID, 'jbang', vscode.ConfigurationTarget.Global);
		const context = makeContext(vscode.ExtensionMode.Production);

		KaotoOutputChannel.logStartupInfo(context);

		const lines = getInfoLines();
		assertContainsField(lines, 'Editor app', vscode.env.appName);
		assertContainsField(lines, 'Editor version', vscode.version);
		assertContainsField(lines, 'Kaoto version', '2.12.0');
		assertContainsField(lines, 'Extension mode', 'Production');
		assertContainsField(lines, 'App host', vscode.env.appHost);
		assertContainsField(lines, 'OS platform', process.platform);
		assertContainsField(lines, 'Executor type', 'jbang');
		// Workspace folders is a count — just assert the line exists
		const wsFolderLine = lines.find((l) => l.includes('[INFO] Workspace folders:'));
		assert.isDefined(wsFolderLine, 'Expected a "Workspace folders" line');
	});

	test('logs Extension mode: Development in Development mode', function () {
		const context = makeContext(vscode.ExtensionMode.Development);

		KaotoOutputChannel.logStartupInfo(context);

		const lines = getInfoLines();
		assertContainsField(lines, 'Extension mode', 'Development');
	});

	test('logs Extension mode: Test in Test mode', function () {
		const context = makeContext(vscode.ExtensionMode.Test);

		KaotoOutputChannel.logStartupInfo(context);

		const lines = getInfoLines();
		assertContainsField(lines, 'Extension mode', 'Test');
	});

	test('logs Extension mode: web when mode param is "web"', function () {
		const context = makeContext(vscode.ExtensionMode.Production);

		KaotoOutputChannel.logStartupInfo(context, 'web');

		const lines = getInfoLines();
		assertContainsField(lines, 'Extension mode', 'web');
	});

	test('logs OS platform: unavailable when process is undefined', function () {
		const context = makeContext(vscode.ExtensionMode.Production);

		// Simulate the webworker environment where process global is not defined at all
		const originalProcess = (globalThis as Record<string, unknown>).process;
		delete (globalThis as Record<string, unknown>).process;

		try {
			KaotoOutputChannel.logStartupInfo(context, 'web');
		} finally {
			(globalThis as Record<string, unknown>).process = originalProcess;
		}

		const lines = getInfoLines();
		assertContainsField(lines, 'OS platform', 'unavailable');
	});

	test('logs Remote: none when remoteName is undefined', function () {
		const context = makeContext(vscode.ExtensionMode.Production);

		// vscode.env.remoteName is undefined in normal desktop test environment
		KaotoOutputChannel.logStartupInfo(context);

		const lines = getInfoLines();
		// remoteName is undefined in test env → expect "none"
		const remoteLine = lines.find((l) => l.includes('[INFO] Remote:'));
		assert.isDefined(remoteLine, 'Expected a "Remote" line');
		assert.isTrue(remoteLine!.includes('Remote: none'), `Expected Remote: none but got: ${remoteLine}`);
	});
});
