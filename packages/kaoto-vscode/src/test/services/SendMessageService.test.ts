import { assert } from 'chai';
import { readFile, access } from 'fs/promises';
import { Uri } from 'vscode';
import { SendMessageService } from '../../services/SendMessageService';
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';

suite('SendMessageService', () => {
	const original = CamelCommandAPI.sendMessage;
	teardown(() => {
		CamelCommandAPI.sendMessage = original;
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
