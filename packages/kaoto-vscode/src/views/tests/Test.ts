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
import { basename } from 'path';
import { TestResult } from '../../types/TestTreeItemType';
import { TreeItem, TreeItemCollapsibleState, Uri, ThemeIcon, ThemeColor } from 'vscode';

export class Test extends TreeItem {
	// Context values for standalone tests (not under maven project) - can be run
	private static readonly CONTEXT_TEST_FILE = 'citrus-test-file';

	// Context value for tests under maven project (inline run button hidden, cannot be run)
	private static readonly CONTEXT_TEST_FILE_MAVEN = 'citrus-test-file-maven';

	// Context values for running tests
	private static readonly CONTEXT_TEST_FILE_RUNNING = 'citrus-test-file-running';
	private static readonly CONTEXT_TEST_FILE_PASSED = 'citrus-test-file-passed';
	private static readonly CONTEXT_TEST_FILE_FAILED = 'citrus-test-file-failed';

	private _isRunning: boolean = false;
	private _result: TestResult = 'none';
	private readonly _isUnderMavenRoot: boolean;

	constructor(
		public readonly fileUri: Uri,
		isUnderMavenRoot: boolean = false,
	) {
		super(basename(fileUri.fsPath), TreeItemCollapsibleState.None);
		this._isUnderMavenRoot = isUnderMavenRoot;
		this.resourceUri = fileUri;
		this.tooltip = fileUri.fsPath;
		this.iconPath = new ThemeIcon('test-view-icon');
		this.command = { command: 'vscode.open', title: 'Open with Editor', arguments: [fileUri] };
		this.contextValue = isUnderMavenRoot ? Test.CONTEXT_TEST_FILE_MAVEN : Test.CONTEXT_TEST_FILE;
	}

	get isRunning(): boolean {
		return this._isRunning;
	}

	get result(): TestResult {
		return this._result;
	}

	/**
	 * Set the running state of the test (only applicable for standalone tests)
	 * @param running Whether the test is running
	 */
	setRunning(running: boolean): void {
		if (this._isUnderMavenRoot) {
			return; // Tests under Maven cannot be run
		}
		this._isRunning = running;
		if (running) {
			this.iconPath = new ThemeIcon('sync~spin');
			this.contextValue = Test.CONTEXT_TEST_FILE_RUNNING;
			this.description = 'Running...';
		} else {
			// When stopping, restore based on previous result
			this.applyResultState();
		}
	}

	/**
	 * Set the test result and update the visual state (only applicable for standalone tests)
	 * @param result The test result
	 */
	setResult(result: TestResult): void {
		if (this._isUnderMavenRoot) {
			return; // Tests under Maven cannot have results
		}
		this._result = result;
		if (!this._isRunning) {
			this.applyResultState();
		}
	}

	/**
	 * Apply the visual state based on the current result
	 */
	private applyResultState(): void {
		switch (this._result) {
			case 'success':
				this.iconPath = new ThemeIcon('pass', new ThemeColor('testing.iconPassed'));
				this.contextValue = Test.CONTEXT_TEST_FILE_PASSED;
				this.description = 'Passed';
				break;
			case 'failure':
				this.iconPath = new ThemeIcon('error', new ThemeColor('testing.iconFailed'));
				this.contextValue = Test.CONTEXT_TEST_FILE_FAILED;
				this.description = 'Failed';
				break;
			default:
				this.iconPath = new ThemeIcon('test-view-icon');
				this.contextValue = Test.CONTEXT_TEST_FILE;
				this.description = undefined;
				break;
		}
	}
}
