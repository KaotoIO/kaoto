import { execFile } from 'child_process'; // NOSONAR
import { promisify } from 'util'; // NOSONAR
import { tasks, Task, TaskScope, TaskRevealKind, TaskPanelKind, ShellExecution, TaskExecution } from 'vscode';

export async function executeSendMessage(
	execution: ShellExecution,
	cwd: string,
	signal?: AbortSignal,
	platform: NodeJS.Platform = process.platform,
): Promise<void> {
	signal?.throwIfAborted();
	const binary = typeof execution.command === 'string' ? execution.command : execution.command?.value;
	if (!binary) {
		throw new Error('The Camel executor did not provide a command.');
	}
	if (platform === 'win32') {
		return sendMessageTask(execution, signal);
	}
	const args = execution.args?.map((arg) => (typeof arg === 'string' ? arg : arg.value)) ?? [];
	try {
		await promisify(execFile)(binary, args, { cwd, timeout: 60000, maxBuffer: 1024 * 1024, signal });
	} catch (error) {
		signal?.throwIfAborted();
		// execFile errors include the command line; only surface the CLI diagnostic, never the full command.
		const failure = error as { stderr?: string; stdout?: string; killed?: boolean };
		throw new Error(failure.killed ? 'Sending the message timed out.' : (failure.stderr || failure.stdout || 'Could not send the message.').trim());
	}
}

/** Use VS Code's shell support for Windows command wrappers such as jbang.cmd. */
async function sendMessageTask(execution: ShellExecution, signal?: AbortSignal): Promise<void> {
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
	let running: TaskExecution | undefined;
	const cancel = () => {
		finish(new DOMException('Sending the message was cancelled.', 'AbortError'));
		running?.terminate();
	};
	signal?.addEventListener('abort', cancel, { once: true });
	try {
		signal?.throwIfAborted();
		const startup = Promise.resolve(tasks.executeTask(task)).then((handle) => {
			running = handle;
			if (signal?.aborted) {
				handle.terminate();
			}
		});
		// Do not hold the message files while a cancelled task is still queued in VS Code.
		const stopped = completion.then((error) => {
			if (error) {
				throw error;
			}
		});
		await Promise.race([startup, stopped]);
		signal?.throwIfAborted();
		timer = setTimeout(() => {
			finish(new Error('Sending the message timed out.'));
			running?.terminate();
		}, 60000);
		const error = await completion;
		if (error) {
			throw error;
		}
	} finally {
		signal?.removeEventListener('abort', cancel);
		clearTimeout(timer);
		processListener.dispose();
		taskListener.dispose();
	}
}
