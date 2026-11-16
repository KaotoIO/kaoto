import { expect } from 'chai';
import * as path from 'node:path';
import { commands, QuickPickItem, tasks, Uri, window, workspace } from 'vscode';
import { COMMAND_OPEN_WITH_KAOTO } from '../../constants';
import { getTestWorkspaceFolder } from './TestSetup';

/**
 * What the user answers in the prompts of a new-file command.
 */
export interface NewFileCommandAnswers {
	/** The labels to pick, one for each quick pick the command shows, in the order it shows them. */
	quickPicks: string[];
	/** The folder returned by the folder dialog. */
	folder: Uri;
	/** The text typed into the name box, or `undefined` when the user presses Esc. */
	fileName: string | undefined;
}

/**
 * What a new-file command did while its prompts were stubbed.
 */
export interface NewFileCommandUiStub {
	/** The files the command asked Kaoto to open. */
	opened: Uri[];
	/** The error messages the command showed. */
	errors: string[];
	/** How many VS Code tasks the command started. A command that writes the file itself starts none. */
	taskRuns: number;
	/** Puts every stubbed member back. */
	restore(): void;
}

/**
 * Answers the prompts of the new-file commands from `answers`, records what they open and show, and refuses to run
 * tasks, so a test can prove a command needs no Camel CLI.
 * The name box returns `fileName` without running the command's `validateInput`, which lets a test create a file the
 * validation would have refused.
 * Always call `restore()` when the test ends.
 */
export function stubNewFileCommandUi(answers: NewFileCommandAnswers): NewFileCommandUiStub {
	const pendingQuickPicks = [...answers.quickPicks];
	const restores: Array<() => void> = [];
	const stub: NewFileCommandUiStub = {
		opened: [],
		errors: [],
		taskRuns: 0,
		restore: () => {
			for (const restore of restores.splice(0).reverse()) {
				restore();
			}
		},
	};

	const replace = <T extends object>(target: T, key: keyof T, value: unknown): void => {
		const original = target[key];
		Object.defineProperty(target, key, { value, configurable: true });
		restores.push(() => Object.defineProperty(target, key, { value: original, configurable: true }));
	};

	replace(window, 'showQuickPick', async (items: readonly QuickPickItem[] | Thenable<readonly QuickPickItem[]>) => {
		const label = pendingQuickPicks.shift();
		const choices = await items;
		const picked = choices.find((item) => item.label === label);
		if (!picked) {
			throw new Error(`No queued answer fits the quick pick [${choices.map((item) => item.label).join(', ')}] (next queued answer: ${label ?? 'none'})`);
		}
		return picked;
	});
	replace(window, 'showOpenDialog', () => Promise.resolve([answers.folder]));
	replace(window, 'showInputBox', () => Promise.resolve(answers.fileName));
	replace(window, 'showErrorMessage', (message: string) => {
		stub.errors.push(message);
		return Promise.resolve();
	});

	const executeCommand = commands.executeCommand;
	replace(commands, 'executeCommand', (command: string, ...args: unknown[]) => {
		if (command === COMMAND_OPEN_WITH_KAOTO) {
			stub.opened.push(args[0] as Uri);
			return Promise.resolve();
		}
		return executeCommand.call(commands, command, ...args);
	});

	replace(tasks, 'executeTask', () => {
		stub.taskRuns++;
		return Promise.reject(new Error('A new-file command must write the file itself, not run a task'));
	});

	return stub;
}

/**
 * Reads a file as text.
 */
export async function readText(uri: Uri): Promise<string> {
	return new TextDecoder().decode(await workspace.fs.readFile(uri));
}

/**
 * Asserts that the command opened exactly this file in Kaoto, ran no task and showed no error.
 */
export function expectOpenedInKaoto(ui: NewFileCommandUiStub, file: Uri): void {
	expect(ui.opened.map((uri) => uri.fsPath)).to.deep.equal([file.fsPath]);
	expect(ui.taskRuns, 'started tasks').to.equal(0);
	expect(ui.errors).to.be.empty;
}

/**
 * What a suite of new-file command tests gets from {@link useNewFileCommandFixture}.
 */
export interface NewFileCommandFixture {
	/** An empty folder in the unit-test workspace, created for the running test and deleted when it ends. */
	readonly folder: Uri;
	/** Stubs the prompts for the running test, as {@link stubNewFileCommandUi} does. The teardown puts them back. */
	readonly stubUi: (answers: NewFileCommandAnswers) => NewFileCommandUiStub;
}

/**
 * Gives every test of a suite its own empty folder in the unit-test workspace, and puts the prompts it stubbed back.
 * Call it at the top of the `suite`: it registers the `setup` and `teardown` that do both.
 *
 * @param folderPrefix the folder of each test is named `<folderPrefix>-<creation time in milliseconds>`
 */
export function useNewFileCommandFixture(folderPrefix: string): NewFileCommandFixture {
	let folder: Uri;
	let stub: NewFileCommandUiStub | undefined;

	setup(async () => {
		folder = Uri.file(path.join(getTestWorkspaceFolder(), `${folderPrefix}-${Date.now()}`));
		// The unit-test workspace is named with spaces and an "@" on purpose: these tests prove such paths work.
		expect(folder.fsPath).to.include('speci@l chars');
		await workspace.fs.createDirectory(folder);
		stub = undefined;
	});

	teardown(async () => {
		stub?.restore();
		await workspace.fs.delete(folder, { recursive: true, useTrash: false });
	});

	return {
		get folder() {
			return folder;
		},
		stubUi: (answers) => (stub = stubNewFileCommandUi(answers)),
	};
}
