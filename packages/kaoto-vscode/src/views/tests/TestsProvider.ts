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
import { AbstractFolderTreeProvider } from '../shared/AbstractFolderTreeProvider';
import { commands, Disposable, RelativePattern, TreeItem, TreeItemCollapsibleState, Uri, workspace } from 'vscode';
import { Test } from './Test';
import { TestResult } from '../../types/TestTreeItemType';
import { TestFolder } from './TestFolder';
import { basename, dirname, join } from 'path';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';
import {
	COMMAND_TESTS_DELETE,
	COMMAND_TESTS_SHOW_SOURCE,
	CONTEXT_TEST_EXISTS,
	CONTEXT_TEST_RESULTS_EXIST,
	KAOTO_TESTS_FILES_REGEXP_SETTING_ID,
} from '../../constants';

export class TestsProvider extends AbstractFolderTreeProvider<TestFolder> {
	public readonly VIEW_ITEM_SHOW_SOURCE_COMMAND_ID: string = COMMAND_TESTS_SHOW_SOURCE;
	public readonly VIEW_ITEM_DELETE_COMMAND_ID: string = COMMAND_TESTS_DELETE;

	private static readonly TEST_FILE_PATTERN = '{**/*.citrus.yaml,**/*.citrus.test.yaml,**/*.citrus.it.yaml,**/*.citrus-test.yaml,**/*.citrus-it.yaml}';
	private static readonly SCHEDULE_REFRESH_MS = 100;

	/** Cache of file paths to Test items for efficient lookup and single-item refresh */
	private readonly testItemCache: Map<string, Test> = new Map();

	/** Persistent storage of test results that survives cache clears */
	private readonly testResults: Map<string, TestResult> = new Map();

	/** Paths awaiting a batched full refresh (items not yet in cache) */
	private readonly pendingRefreshPaths = new Set<string>();
	private pendingRefreshTimer?: NodeJS.Timeout;
	private configChangeDisposable?: Disposable;

	constructor() {
		super();
		this.initFileWatcher();
		this.onConfigurationChange();
	}

	protected getFilePattern(): string {
		const filesRegexp: string[] = workspace.getConfiguration().get(KAOTO_TESTS_FILES_REGEXP_SETTING_ID) as string[];
		return '{' + filesRegexp.map((r) => '**/' + r).join(',') + '}';
	}

	protected getExcludePattern(): string {
		return TestsProvider.EXCLUDE_PATTERN;
	}

	protected onConfigurationChange(): void {
		this.configChangeDisposable = workspace.onDidChangeConfiguration((event) => {
			if (event.affectsConfiguration(KAOTO_TESTS_FILES_REGEXP_SETTING_ID)) {
				this.fileWatcher?.dispose();
				this.initFileWatcher();
				this.refresh();
			}
		});
	}

	protected createFolderItem(name: string, folderUri: Uri, isUnderMavenRoot: boolean, isMavenRoot: boolean, isWorkspaceRoot: boolean = false): TestFolder {
		return new TestFolder(name, folderUri, isUnderMavenRoot, isMavenRoot, isWorkspaceRoot);
	}

	protected async toTreeItemForFile(file: Uri, isUnderMavenRoot: boolean, _isTopLevelWithinWorkspace: boolean): Promise<TreeItem> {
		const fileName = basename(file.fsPath);

		// Handle testing properties files - simple tree item with default icon
		if (fileName === 'jbang.properties' || fileName === 'citrus-application.properties') {
			const item = new TreeItem(fileName, TreeItemCollapsibleState.None);
			item.resourceUri = file;
			item.tooltip = file.fsPath;
			item.command = { command: 'vscode.open', title: 'Open File', arguments: [file] };
			item.contextValue = 'testing-properties-file';
			return item;
		}

		// Check if we have a cached item for this file
		const cachedTest = this.testItemCache.get(file.fsPath);
		if (cachedTest) {
			return cachedTest;
		}

		// Create new test item, restore any persisted result, and cache it
		const test = new Test(file, isUnderMavenRoot);
		const persistedResult = this.testResults.get(file.fsPath);
		if (persistedResult) {
			test.setResult(persistedResult);
		}

		this.testItemCache.set(file.fsPath, test);
		return test;
	}

	protected isFolderItem(element: TreeItem): element is TestFolder {
		return element instanceof TestFolder;
	}

	protected setContext(hasFiles: boolean): void {
		commands.executeCommand('setContext', CONTEXT_TEST_EXISTS, hasFiles);
	}

	/**
	 * Override refresh to clear all caches when a full refresh is triggered
	 * Note: test results are preserved to maintain pass/fail status
	 */
	refresh(): void {
		this.testItemCache.clear();
		this.invalidateCache();
		super.refresh();
	}

	/**
	 * Dispose of the provider and all associated resources
	 */
	override dispose(): void {
		if (this.pendingRefreshTimer) {
			clearTimeout(this.pendingRefreshTimer);
			this.pendingRefreshTimer = undefined;
			this.pendingRefreshPaths.clear();
		}
		this.configChangeDisposable?.dispose();
		super.dispose();
	}

	/**
	 * Remove a specific file from all caches (used when a file is deleted)
	 * @param filePath The file path to remove from caches
	 */
	removeFromCache(filePath: string): void {
		this.testItemCache.delete(filePath);
	}

	/**
	 * Refresh a specific test item
	 * @param test The test item to refresh
	 */
	refreshItem(test: Test): void {
		this.refreshImmediate(test);
	}

	/**
	 * Find all test files under a specific folder path (excludes testing properties)
	 * @param folderPath The folder path to search in
	 * @returns Array of test file paths
	 */
	async getTestFilesInFolder(folderPath: string): Promise<string[]> {
		const folderUri = Uri.file(folderPath);
		// Use TEST_FILE_PATTERN to only get actual test files, not testing properties
		const pattern = new RelativePattern(folderUri, TestsProvider.TEST_FILE_PATTERN);
		const files = await workspace.findFiles(pattern, this.getExcludePattern());
		return files.map((file) => file.fsPath);
	}

	/**
	 * Set the running state for a test and refresh only that item
	 * @param filePath The file path of the test
	 * @param running Whether the test is running
	 */
	setTestRunning(filePath: string, running: boolean): void {
		const testItem = this.testItemCache.get(filePath);
		if (testItem) {
			testItem.setRunning(running);
			this.refreshImmediate(testItem);
		} else {
			this.pendingRefreshPaths.add(filePath);
			this.scheduleRefresh();
		}
	}

	/**
	 * Schedule a single debounced full refresh for uncached items.
	 * Accumulates paths and fires one refresh instead of one per missing item.
	 */
	private scheduleRefresh(): void {
		if (this.pendingRefreshTimer) {
			clearTimeout(this.pendingRefreshTimer);
		}
		this.pendingRefreshTimer = setTimeout(() => {
			this.pendingRefreshTimer = undefined;
			this.pendingRefreshPaths.clear();
			this.refresh();
		}, TestsProvider.SCHEDULE_REFRESH_MS);
	}

	/**
	 * Set the test result and refresh only that item
	 * @param filePath The file path of the test
	 * @param result The test result
	 */
	setTestResult(filePath: string, result: TestResult): void {
		this.testResults.set(filePath, result);
		this.updateResultsContext();

		const testItem = this.testItemCache.get(filePath);
		if (testItem) {
			testItem.setResult(result);
			this.refreshImmediate(testItem);
		}
	}

	/**
	 * Clear all stored test results and reset every cached Test item to default state
	 */
	clearAllResults(): void {
		this.testResults.clear();
		this.updateResultsContext();

		for (const testItem of this.testItemCache.values()) {
			testItem.setResult('none');
		}

		this.refresh();
	}

	private updateResultsContext(): void {
		const hasResults = Array.from(this.testResults.values()).some((r) => r !== 'none');
		commands.executeCommand('setContext', CONTEXT_TEST_RESULTS_EXIST, hasResults);
	}

	/**
	 * Read the test result from the Citrus report JSON file
	 * @param testFilePath The path to the test file
	 * @returns The test result (success, failure, or none if not found)
	 */
	async readTestResult(testFilePath: string): Promise<TestResult> {
		try {
			const testDir = dirname(testFilePath);
			const fileName = basename(testFilePath, '.yaml');

			const resultFilePath = join(testDir, '.citrus-jbang', 'citrus-reports', `${fileName}-flow.json`);

			const resultUri = Uri.file(resultFilePath);
			const resultContent = await workspace.fs.readFile(resultUri);
			const resultJson = JSON.parse(new TextDecoder('utf-8').decode(resultContent));

			// Check the result field in the JSON
			// Expected structure: { result: { result: "SUCCESS" | "FAILURE" | ... } }
			const result = resultJson?.result?.result;
			if (result === 'SUCCESS') {
				return 'success';
			} else if (result) {
				return 'failure';
			}
			return 'none';
		} catch (error) {
			KaotoOutputChannel.logWarning(`Could not read test result for ${testFilePath}: ${error}`);
			return 'none';
		}
	}
}
