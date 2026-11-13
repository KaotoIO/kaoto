import { assert } from 'chai';
import { readFile, access } from 'fs/promises';
import { ShellExecution, TaskExecution, tasks, Uri } from 'vscode';
import { SendMessageService } from '../../services/SendMessageService';
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';
import { rejects } from 'node:assert/strict';
import { CamelExecutorFactory } from '../../executors/CamelExecutorFactory';
import { JBangExecutor } from '../../executors/JBangExecutor';
import { deferred } from '../utils/Deferred';
import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { executeSendMessage } from '../../utils/SendMessageProcess';

suite('SendMessageService', () => {
	const original = CamelCommandAPI.sendMessage;
	teardown(() => {
		CamelCommandAPI.sendMessage = original;
	});
	test('rejects an already cancelled request before resolving or sending', async () => {
		let resolutions = 0;
		let sends = 0;
		CamelCommandAPI.sendMessage = async () => {
			sends++;
		};
		const service = new SendMessageService({
			resolveTarget: async () => {
				resolutions++;
				return { pid: 123, routeId: 'orders', sourcePath: '/p/a.yaml', consolePort: 9876, label: 'a', state: 'Started' };
			},
		});
		const abort = new AbortController();
		abort.abort();
		await rejects(service.send(Uri.file('/p/a.yaml'), { targetId: 'target', routeId: 'orders', payload: { endpoint: '' } }, abort.signal), {
			name: 'AbortError',
		});
		assert.equal(resolutions, 0);
		assert.equal(sends, 0);
	});
	test('does not launch the CLI after cancellation during executor preparation', async () => {
		const originalFactory = CamelExecutorFactory.createExecutor;
		const preparing = deferred<void>();
		const ready = deferred<void>();
		CamelExecutorFactory.createExecutor = async () => {
			preparing.resolve();
			await ready.promise;
			const executor = new JBangExecutor({ type: 'jbang', version: '4.22.1' });
			executor.execute = async () => ({ execution: new ShellExecution('kaoto-test-must-not-start') });
			return executor;
		};
		const service = new SendMessageService({
			resolveTarget: async () => ({ pid: 123, routeId: 'orders', sourcePath: '/p/a.yaml', consolePort: 9876, label: 'a', state: 'Started' }),
		});
		const abort = new AbortController();
		try {
			const pending = service.send(Uri.file('/p/a.yaml'), { targetId: 'target', routeId: 'orders', payload: { endpoint: '' } }, abort.signal);
			const cancelled = rejects(pending, { name: 'AbortError' });
			await preparing.promise;
			abort.abort();
			ready.resolve();
			await cancelled;
		} finally {
			CamelExecutorFactory.createExecutor = originalFactory;
		}
	});
	test('revokes message arguments before a cancelled Windows task resumes startup', async () => {
		const originalExecute = tasks.executeTask;
		const starting = deferred<void>();
		const resume = deferred<void>();
		let argumentFile = '';
		let delivered = false;
		let terminated = false;
		tasks.executeTask = async (task) => {
			starting.resolve();
			await resume.promise;
			try {
				readFileSync(argumentFile);
				delivered = true;
			} catch (error) {
				assert.equal((error as NodeJS.ErrnoException).code, 'ENOENT');
			}
			return {
				task,
				terminate: () => {
					terminated = true;
				},
			} as TaskExecution;
		};
		CamelCommandAPI.sendMessage = async (_pid, _route, file, cwd, signal) => {
			argumentFile = file;
			await executeSendMessage(new ShellExecution('jbang', [`@${file}`]), cwd, signal, 'win32');
		};
		const service = new SendMessageService({
			resolveTarget: async () => ({ pid: 123, routeId: 'orders', sourcePath: '/p/a.yaml', consolePort: 9876, label: 'a', state: 'Started' }),
		});
		const abort = new AbortController();
		try {
			const pending = service.send(Uri.file('/p/a.yaml'), { targetId: 'target', routeId: 'orders', payload: { endpoint: '' } }, abort.signal);
			const cancelled = rejects(pending, { name: 'AbortError' });
			await starting.promise;
			abort.abort();
			// Resume in the same turn: asynchronous cleanup alone leaves a delivery window.
			resume.resolve();
			await cancelled;
			await setImmediate();
			assert.isFalse(delivered, 'A cancelled task must not be able to read the message arguments');
			assert.isTrue(terminated);
			await rejects(access(argumentFile), { code: 'ENOENT' });
		} finally {
			resume.resolve();
			tasks.executeTask = originalExecute;
		}
	});
	test('writes private argument file and cleans it up after delivery failure', async () => {
		let file = '';
		const text = 'Grüße 🌍\r\n"quoted" \\ # @arg';
		CamelCommandAPI.sendMessage = async (pid, routeId, argumentFile) => {
			file = argumentFile;
			assert.equal(pid, 123);
			assert.equal(routeId, 'orders');
			const args = (await readFile(file, 'utf8'))
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line));
			assert.include(args, '--body=' + text);
			assert.include(args, '--header=Test=a=b');
			throw new Error('delivery failed');
		};
		const service = new SendMessageService({
			resolveTarget: async () => ({ pid: 123, routeId: 'orders', sourcePath: '/p/a.yaml', consolePort: 9876, label: 'a', state: 'Started' }),
		});
		try {
			await service.send(Uri.file('/p/a.yaml'), {
				targetId: 'target',
				routeId: 'orders',
				payload: { endpoint: 'ignored', body: text, headers: { Test: 'a=b' } },
			});
			assert.fail('Expected error');
		} catch (error) {
			assert.include(String(error), 'delivery failed');
		}
		try {
			await access(file);
			assert.fail('Temporary file survived');
		} catch (error) {
			assert.equal((error as NodeJS.ErrnoException).code, 'ENOENT');
		}
	});
	test('decodes a binary body without changing its bytes', async () => {
		const bytes = Buffer.from([0, 255, 128, 10]);
		CamelCommandAPI.sendMessage = async (_pid, _route, file) => {
			const args: string[] = (await readFile(file, 'utf8'))
				.trim()
				.split('\n')
				.map((line) => JSON.parse(line));
			const path = args.find((arg) => arg.startsWith('--body=file:'))!.slice('--body=file:'.length);
			assert.deepEqual(await readFile(path), bytes);
		};
		const service = new SendMessageService({
			resolveTarget: async () => ({ pid: 123, routeId: 'orders', sourcePath: '/p/a.yaml', consolePort: 9876, label: 'a', state: 'Started' }),
		});
		await service.send(Uri.file('/p/a.yaml'), {
			targetId: 'target',
			routeId: 'orders',
			payload: { endpoint: '', bodyType: 'file', bodyFile: { name: '../../untrusted.bin', content: bytes.toString('base64') } },
		});
	});
	test('rejects unsupported text controls before invoking the CLI', async () => {
		let invoked = false;
		CamelCommandAPI.sendMessage = async () => {
			invoked = true;
		};
		const service = new SendMessageService({
			resolveTarget: async () => ({ pid: 123, routeId: 'orders', sourcePath: '/p/a.yaml', consolePort: 9876, label: 'a', state: 'Started' }),
		});
		for (const payload of [
			{ endpoint: '', body: '\u001b[31m' },
			{ endpoint: '', headers: { Color: '\u0001' } },
		]) {
			let failure: unknown;
			try {
				await service.send(Uri.file('/p/a.yaml'), { targetId: 'target', routeId: 'orders', payload });
			} catch (error) {
				failure = error;
			}
			assert.include(String(failure), 'Unsupported control character');
		}
		assert.isFalse(invoked);
	});
});
