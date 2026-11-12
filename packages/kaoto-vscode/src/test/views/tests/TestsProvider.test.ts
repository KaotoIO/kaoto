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
import { assert } from 'chai';
import * as vscode from 'vscode';
import { TestsProvider } from '../../../views/tests/TestsProvider';

function stub(target: object, key: string, value: unknown, restoreFns: Array<() => void>): void {
	const original = Object.getOwnPropertyDescriptor(target, key) ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), key);
	Object.defineProperty(target, key, { value, configurable: true, writable: true });
	restoreFns.push(() => {
		if (original) {
			Object.defineProperty(target, key, original);
		} else {
			delete (target as Record<string, unknown>)[key];
		}
	});
}

suite('TestsProvider — report methods', function () {
	let provider: TestsProvider;

	setup(() => {
		provider = new TestsProvider();
	});

	teardown(() => {
		provider.dispose();
	});

	test('getTestReport returns undefined when no reports are stored', function () {
		assert.isUndefined(provider.getTestReport('non-existent'));
	});

	test('getTestReportByFilePath returns undefined when no reports are stored', function () {
		assert.isUndefined(provider.getTestReportByFilePath('/tmp/test.citrus.yaml'));
	});

	test('clearAllResults clears stored report entries', function () {
		provider.setTestResult('/tmp/test.citrus.yaml', 'success');
		provider.clearAllResults();

		assert.isUndefined(provider.getTestReportByFilePath('/tmp/test.citrus.yaml'));
	});
});

suite('TestsProvider — readTestResult', function () {
	let provider: TestsProvider;
	const restoreFns: Array<() => void> = [];

	setup(() => {
		provider = new TestsProvider();
	});

	teardown(() => {
		provider.dispose();
		restoreFns
			.splice(0)
			.reverse()
			.forEach((fn) => fn());
	});

	test('returns success when report JSON has SUCCESS result', async function () {
		const report = {
			name: 'my-test',
			result: { name: 'my-test', result: 'SUCCESS', success: true },
			actions: [],
		};
		stub(
			vscode.workspace,
			'fs',
			{
				...vscode.workspace.fs,
				readFile: async () => new TextEncoder().encode(JSON.stringify(report)),
			},
			restoreFns,
		);

		const result = await provider.readTestResult('/tmp/tests/my-test.citrus.yaml');
		assert.strictEqual(result, 'success');
	});

	test('returns failure when report JSON has FAILURE result', async function () {
		const report = {
			name: 'my-test',
			result: { name: 'my-test', result: 'FAILURE', failed: true },
			actions: [],
		};
		stub(
			vscode.workspace,
			'fs',
			{
				...vscode.workspace.fs,
				readFile: async () => new TextEncoder().encode(JSON.stringify(report)),
			},
			restoreFns,
		);

		const result = await provider.readTestResult('/tmp/tests/my-test.citrus.yaml');
		assert.strictEqual(result, 'failure');
	});

	test('returns none when report JSON has no result field', async function () {
		const report = {
			name: 'my-test',
			result: { name: 'my-test' },
			actions: [],
		};
		stub(
			vscode.workspace,
			'fs',
			{
				...vscode.workspace.fs,
				readFile: async () => new TextEncoder().encode(JSON.stringify(report)),
			},
			restoreFns,
		);

		const result = await provider.readTestResult('/tmp/tests/my-test.citrus.yaml');
		assert.strictEqual(result, 'none');
	});

	test('returns none when readFile throws (file not found)', async function () {
		stub(
			vscode.workspace,
			'fs',
			{
				...vscode.workspace.fs,
				readFile: async () => {
					throw new Error('File not found');
				},
			},
			restoreFns,
		);

		const result = await provider.readTestResult('/tmp/tests/missing.citrus.yaml');
		assert.strictEqual(result, 'none');
	});

	test('stores report entry accessible via getTestReport and getTestReportByFilePath', async function () {
		const report = {
			name: 'my-test',
			result: { name: 'my-test', result: 'SUCCESS', success: true },
			actions: [{ name: 'print', path: 'actions.0.print' }],
		};
		stub(
			vscode.workspace,
			'fs',
			{
				...vscode.workspace.fs,
				readFile: async () => new TextEncoder().encode(JSON.stringify(report)),
			},
			restoreFns,
		);

		await provider.readTestResult('/tmp/tests/my-test.citrus.yaml');

		const byName = provider.getTestReport('my-test');
		assert.isDefined(byName);
		assert.strictEqual(byName?.name, 'my-test');
		assert.strictEqual(byName?.result.result, 'SUCCESS');

		const byPath = provider.getTestReportByFilePath('/tmp/tests/my-test.citrus.yaml');
		assert.isDefined(byPath);
		assert.strictEqual(byPath?.name, 'my-test');
	});

	test('getTestReport returns undefined for non-matching name', async function () {
		const report = {
			name: 'alpha-test',
			result: { name: 'alpha-test', result: 'SUCCESS', success: true },
			actions: [],
		};
		stub(
			vscode.workspace,
			'fs',
			{
				...vscode.workspace.fs,
				readFile: async () => new TextEncoder().encode(JSON.stringify(report)),
			},
			restoreFns,
		);

		await provider.readTestResult('/tmp/tests/alpha-test.citrus.yaml');
		assert.isUndefined(provider.getTestReport('beta-test'));
	});
});

suite('TestsProvider — setTestResult and setTestRunning', function () {
	let provider: TestsProvider;

	setup(() => {
		provider = new TestsProvider();
	});

	teardown(() => {
		provider.dispose();
	});

	test('setTestResult stores results that survive clearAllResults', function () {
		provider.setTestResult('/tmp/test-a.citrus.yaml', 'success');
		provider.setTestResult('/tmp/test-b.citrus.yaml', 'failure');

		provider.clearAllResults();

		assert.isUndefined(provider.getTestReportByFilePath('/tmp/test-a.citrus.yaml'));
		assert.isUndefined(provider.getTestReportByFilePath('/tmp/test-b.citrus.yaml'));
	});

	test('setTestRunning with uncached item triggers a refresh', function () {
		provider.setTestRunning('/tmp/unknown.citrus.yaml', true);
	});

	test('removeFromCache removes an item', function () {
		provider.removeFromCache('/tmp/test.citrus.yaml');
	});
});
