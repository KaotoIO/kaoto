import { assert } from 'chai';
import { Disposable, ShellExecution, ShellQuoting, Task, TaskExecution, TaskProcessEndEvent, TaskEndEvent, tasks } from 'vscode';
import { executeSendMessage } from '../../utils/SendMessageProcess';
import { rejects } from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { deferred } from './Deferred';

suite('SendMessageProcess Windows wrapper', () => {
	const originalExecute = tasks.executeTask;
	const originalEnd = tasks.onDidEndTaskProcess;
	const originalTaskEnd = tasks.onDidEndTask;
	let processEnd!: (event: TaskProcessEndEvent) => void;
	let taskEnd!: (event: TaskEndEvent) => void;
	let disposed = 0;
	setup(() => {
		disposed = 0;
		Object.defineProperty(tasks, 'onDidEndTaskProcess', {
			value: (callback: typeof processEnd) => {
				processEnd = callback;
				return new Disposable(() => {
					disposed++;
				});
			},
		});
		Object.defineProperty(tasks, 'onDidEndTask', {
			value: (callback: typeof taskEnd) => {
				taskEnd = callback;
				return new Disposable(() => {
					disposed++;
				});
			},
		});
	});
	teardown(() => {
		tasks.executeTask = originalExecute;
		Object.defineProperty(tasks, 'onDidEndTaskProcess', { value: originalEnd });
		Object.defineProperty(tasks, 'onDidEndTask', { value: originalTaskEnd });
	});
	test('does not queue an already cancelled Windows task', async () => {
		let launched = false;
		tasks.executeTask = async (task) => {
			launched = true;
			return { task, terminate() {} } as TaskExecution;
		};
		const abort = new AbortController();
		abort.abort();
		await rejects(executeSendMessage(new ShellExecution('jbang', []), 'C:\\project', abort.signal, 'win32'), { name: 'AbortError' });
		assert.isFalse(launched);
		assert.equal(disposed, 0);
	});
	test('cancels pending Windows startup promptly and terminates a handle that arrives later', async () => {
		const startup = deferred<TaskExecution>();
		let launched: Task | undefined;
		let terminated = false;
		tasks.executeTask = (task) => {
			launched = task;
			return startup.promise;
		};
		const abort = new AbortController();
		let settled = false;
		const pending = executeSendMessage(new ShellExecution('jbang', []), 'C:\\project', abort.signal, 'win32');
		const cancelled = pending.then(
			() => {
				settled = true;
				return undefined;
			},
			(error: unknown) => {
				settled = true;
				return error;
			},
		);
		try {
			abort.abort();
			await setImmediate();
			assert.isTrue(settled, 'Cancellation must not wait for executeTask to return a handle');
		} finally {
			const handle = {
				task: launched!,
				terminate: () => {
					terminated = true;
				},
			} as TaskExecution;
			startup.resolve(handle);
			await setImmediate();
			processEnd({ execution: handle, exitCode: 1 });
		}
		assert.equal(((await cancelled) as Error)?.name, 'AbortError');
		assert.isTrue(terminated, 'A task handle arriving after cancellation must be terminated');
		assert.equal(disposed, 2);
	});
	test('handles a startup rejection arriving after cancellation without leaking listeners', async () => {
		const startup = deferred<TaskExecution>();
		tasks.executeTask = () => startup.promise;
		const abort = new AbortController();
		const pending = executeSendMessage(new ShellExecution('jbang', []), 'C:\\project', abort.signal, 'win32');
		const cancelled = rejects(pending, { name: 'AbortError' });
		abort.abort();
		await cancelled;
		assert.equal(disposed, 2);
		startup.reject(new Error('late startup failure'));
		await setImmediate();
	});
	test('terminates an available task on cancellation and removes its listeners', async () => {
		let terminated = 0;
		tasks.executeTask = async (task) =>
			({
				task,
				terminate: () => {
					terminated++;
				},
			}) as TaskExecution;
		const abort = new AbortController();
		const pending = executeSendMessage(new ShellExecution('jbang', []), 'C:\\project', abort.signal, 'win32');
		const cancelled = rejects(pending, { name: 'AbortError' });
		await setImmediate();
		abort.abort();
		await cancelled;
		assert.equal(terminated, 1);
		assert.equal(disposed, 2);
	});
	test('completes successful Windows sends and ignores unrelated task end events', async () => {
		let running!: TaskExecution;
		let terminated = false;
		tasks.executeTask = async (task) => {
			running = {
				task,
				terminate: () => {
					terminated = true;
				},
			} as TaskExecution;
			return running;
		};
		const abort = new AbortController();
		let settled = false;
		const pending = executeSendMessage(new ShellExecution('jbang', []), 'C:\\project', abort.signal, 'win32').then(() => {
			settled = true;
		});
		await setImmediate();
		const other = { task: new Task({ type: 'other', id: 'other' }, 1, 'other', 'test', new ShellExecution('other', [])), terminate() {} } as TaskExecution;
		processEnd({ execution: other, exitCode: 1 });
		taskEnd({ execution: other });
		await setImmediate();
		assert.isFalse(settled);
		processEnd({ execution: running, exitCode: 0 });
		await pending;
		abort.abort();
		assert.isFalse(terminated, 'Successful sends must unregister their abort listener');
		assert.equal(disposed, 2);
	});
	test('cleans up listeners if Windows task startup fails', async () => {
		tasks.executeTask = async () => {
			throw new Error('startup failed');
		};
		await rejects(executeSendMessage(new ShellExecution('jbang', []), 'C:\\project', undefined, 'win32'), /startup failed/);
		assert.equal(disposed, 2);
	});
	test('uses the configured shell task for a Windows command wrapper and reports failure', async () => {
		const execution = new ShellExecution('jbang', [{ value: '@C:\\temp\\message.args', quoting: ShellQuoting.Strong }]);
		let listener!: (event: TaskProcessEndEvent) => void;
		let disposed = false;
		Object.defineProperty(tasks, 'onDidEndTaskProcess', {
			value: (callback: (event: TaskProcessEndEvent) => void) => {
				listener = callback;
				return new Disposable(() => {
					disposed = true;
				});
			},
		});
		let launched: Task | undefined;
		tasks.executeTask = async (task) => {
			launched = task;
			const running = { task, terminate() {} } as TaskExecution;
			setTimeout(() => listener({ execution: running, exitCode: 1 }), 0);
			return running;
		};
		let failure: unknown;
		try {
			await executeSendMessage(execution, 'C:\\project', undefined, 'win32');
		} catch (error) {
			failure = error;
		}
		assert.strictEqual(launched?.execution, execution);
		assert.include(String(failure), 'Could not send the message');
		assert.isTrue(disposed);
	});
});
