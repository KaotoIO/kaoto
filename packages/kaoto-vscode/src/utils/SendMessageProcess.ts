import { execFile } from 'child_process'; // NOSONAR
import { promisify } from 'util'; // NOSONAR
import { tasks, Task, TaskScope, TaskRevealKind, TaskPanelKind, ShellExecution } from 'vscode';

export async function executeSendMessage(execution: ShellExecution, cwd: string, platform: NodeJS.Platform = process.platform): Promise<void> {
	const binary = typeof execution.command === 'string' ? execution.command : execution.command?.value;
	if (!binary) {
		throw new Error('The Camel executor did not provide a command.');
	}
	if (platform === 'win32') {
		return sendMessageTask(execution);
	}
	const args = execution.args?.map((arg) => (typeof arg === 'string' ? arg : arg.value)) ?? [];
	try {
		await promisify(execFile)(binary, args, { cwd, timeout: 60000, maxBuffer: 1024 * 1024 });
	} catch (error) {
		// execFile errors include the command line; only surface the CLI diagnostic, never the full command.
		const failure = error as { stderr?: string; stdout?: string; killed?: boolean };
		throw new Error(failure.killed ? 'Sending the message timed out.' : (failure.stderr || failure.stdout || 'Could not send the message.').trim());
	}
}

/** Use VS Code's shell support for Windows command wrappers such as jbang.cmd. */
async function sendMessageTask(execution: ShellExecution): Promise<void> {
	const id = crypto.randomUUID();
	const task = new Task({ type: 'kaoto-send-message', id }, TaskScope.Workspace, 'Send test message', 'Kaoto', execution);
	task.presentationOptions = { echo: false, reveal: TaskRevealKind.Never, panel: TaskPanelKind.Dedicated, close: true };
	let finish!: (error?: Error) => void;
	// Resolve with the error to avoid an unhandled rejection while executeTask is still pending.
	const completion = new Promise<Error | undefined>((resolve) => {
		finish = resolve;
	});
	const processListener = tasks.onDidEndTaskProcess((event) => {
		if (event.execution.task.definition.id === id) {
			finish(event.exitCode === 0 ? undefined : new Error('Could not send the message. The Camel task failed.'));
		}
	});
	const taskListener = tasks.onDidEndTask((event) => {
		if (event.execution.task.definition.id === id) {
			finish(new Error('Sending the message was cancelled.'));
		}
	});
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const running = await tasks.executeTask(task);
		timer = setTimeout(() => {
			finish(new Error('Sending the message timed out.'));
			running.terminate();
		}, 60000);
		const error = await completion;
		if (error) {
			throw error;
		}
	} finally {
		clearTimeout(timer);
		processListener.dispose();
		taskListener.dispose();
	}
}
