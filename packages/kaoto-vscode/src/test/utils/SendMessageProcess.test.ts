import { assert } from 'chai';
import { Disposable, ShellExecution, ShellQuoting, Task, TaskExecution, TaskProcessEndEvent, tasks } from 'vscode';
import { executeSendMessage } from '../../utils/SendMessageProcess';

suite('SendMessageProcess Windows wrapper', () => {
	const originalExecute = tasks.executeTask;
	const originalEnd = tasks.onDidEndTaskProcess;
	teardown(() => {
		tasks.executeTask = originalExecute;
		Object.defineProperty(tasks, 'onDidEndTaskProcess', { value: originalEnd });
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
			await executeSendMessage(execution, 'C:\\project', 'win32');
		} catch (error) {
			failure = error;
		}
		assert.strictEqual(launched?.execution, execution);
		assert.include(String(failure), 'Could not send the message');
		assert.isTrue(disposed);
	});
});
