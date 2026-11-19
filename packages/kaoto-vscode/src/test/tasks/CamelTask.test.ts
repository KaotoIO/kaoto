import { expect } from 'chai';
import * as vscode from 'vscode';
import { CamelTask, CamelTaskDefinition } from '../../tasks/CamelTask';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';

suite('CamelTask', () => {
	const restores: (() => void)[] = [];
	let counter = 0;

	const stub = (target: object, key: string, value: unknown) => {
		const original = (target as Record<string, unknown>)[key];
		Object.defineProperty(target, key, { value, configurable: true });
		restores.push(() => Object.defineProperty(target, key, { value: original, configurable: true }));
	};

	/** A task that runs the Node.js of VS Code and ends with the exit code after the delay */
	const nodeTask = (exitCode: number, delayMs = 0, revealTask = vscode.TaskRevealKind.Never) => {
		counter++;
		const execution = new vscode.ShellExecution(process.execPath, ['-e', `setTimeout(() => process.exit(${exitCode}), ${delayMs})`], {
			env: { ELECTRON_RUN_AS_NODE: '1' },
		});
		return new CamelTask(vscode.TaskScope.Workspace, `Camel task test ${Date.now()}-${counter}`, execution, true, revealTask);
	};

	teardown(() => {
		while (restores.length > 0) {
			restores.pop()!();
		}
	});

	test('describes itself as a Camel task with its label and port', () => {
		const task = new CamelTask(vscode.TaskScope.Workspace, 'Run route', new vscode.ShellExecution('camel'), false, vscode.TaskRevealKind.Silent, 8081);

		expect(task.definition as CamelTaskDefinition).to.deep.equal({ label: 'Run route', type: 'camel', port: 8081 });
		expect(task.source).to.equal('kaoto');
		expect(task.presentationOptions).to.include({ close: false, reveal: vscode.TaskRevealKind.Silent, panel: vscode.TaskPanelKind.New });
	});

	test('has no port and keeps its terminal open and revealed by default', () => {
		const task = new CamelTask(vscode.TaskScope.Workspace, 'Run route', new vscode.ShellExecution('camel'));

		expect((task.definition as CamelTaskDefinition).port).to.equal(CamelTask.NO_PORT);
		expect(task.presentationOptions).to.include({ close: false, reveal: vscode.TaskRevealKind.Always });
	});

	test('logs the command line it runs', async () => {
		const logged: string[] = [];
		stub(KaotoOutputChannel, 'logInfo', (message: string) => logged.push(message));
		const task = nodeTask(0);

		await task.executeAndWait();

		expect(logged.some((message) => message.startsWith(`${task.name}: "${process.execPath} -e setTimeout`))).to.equal(true);
	});

	test('waits until the task has ended successfully', async () => {
		const task = nodeTask(0, 300);
		let ended = false;
		const subscription = vscode.tasks.onDidEndTaskProcess((event) => {
			if (event.execution.task.name === task.name) {
				ended = true;
			}
		});

		try {
			await task.executeAndWait();
		} finally {
			subscription.dispose();
		}

		expect(ended).to.equal(true);
	});

	test('fails with the exit code of a failed task', async () => {
		const task = nodeTask(3);

		let error: Error | undefined;
		await task.executeAndWait().catch((e: Error) => (error = e));

		expect(error?.message).to.equal(`Task "${task.name}" failed with exit code 3`);
	});

	test('does not take another task ending for its own', async () => {
		const slow = nodeTask(0, 500);
		const failing = nodeTask(1);

		const waiting = slow.executeAndWait();
		await failing.executeAndWait().catch(() => undefined);

		await waiting;
	});

	test('shows the message as progress until the task has ended', async () => {
		const titles: (string | undefined)[] = [];
		const withProgress = vscode.window.withProgress;
		stub(vscode.window, 'withProgress', (options: vscode.ProgressOptions, work: Parameters<typeof withProgress>[1]) => {
			titles.push(options.title);
			return withProgress(options, work);
		});

		await nodeTask(0, 100).executeAndWaitWithProgress('Creating the project');

		expect(titles).to.deep.equal(['Creating the project']);
	});
});
