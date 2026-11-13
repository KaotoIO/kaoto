import { assert } from 'chai';
import { Disposable, EventEmitter, Uri } from 'vscode';
import { setImmediate } from 'node:timers/promises';
import { SendMessageRuntimeService, watchSendMessageTargets } from '../../services/SendMessageRuntimeService';
import { deferred } from '../utils/Deferred';
import { rejects } from 'node:assert/strict';
import type { SendMessageRuntimeSnapshot } from '@kaoto/kaoto/models';

suite('SendMessageRuntimeService', () => {
	const originalFetch = global.fetch;
	teardown(() => {
		global.fetch = originalFetch;
	});
	const route = { sourcePath: '/project/orders.camel.yaml', routeId: 'orders', state: 'Started', consolePort: 9876, label: 'orders' };
	const source = (routes = [route]) => ({ refresh: async () => {}, getSnapshot: () => routes });
	test('does not read runtime identity after cancellation during deployment refresh', async () => {
		const refresh = deferred<void>();
		let reads = 0;
		global.fetch = async () => {
			reads++;
			return new Response('{}');
		};
		const service = new SendMessageRuntimeService({ ...source(), refresh: () => refresh.promise });
		const abort = new AbortController();
		const pending = service.resolveTarget(Uri.file(route.sourcePath), 'target', 'orders', abort.signal);
		const cancelled = rejects(pending, { name: 'AbortError' });
		abort.abort();
		refresh.resolve();
		await cancelled;
		assert.equal(reads, 0);
	});
	test('aborts a pending PID request without trying the fallback endpoint', async () => {
		const started = deferred<AbortSignal>();
		let reads = 0;
		global.fetch = async (_input, options) => {
			reads++;
			const signal = options!.signal!;
			started.resolve(signal);
			return new Promise<Response>((_resolve, reject) => {
				signal.addEventListener('abort', () => reject(signal.reason), { once: true });
			});
		};
		const service = new SendMessageRuntimeService(source());
		const abort = new AbortController();
		const pending = service.resolveTarget(Uri.file(route.sourcePath), 'target', 'orders', abort.signal);
		const cancelled = rejects(pending, { name: 'AbortError' });
		const signal = await started.promise;
		abort.abort();
		await cancelled;
		assert.isTrue(signal.aborted);
		assert.equal(reads, 1);
	});
	test('recovers from a watcher error and suppresses queued updates after disposal', async () => {
		const changes = new EventEmitter<void>();
		const held = deferred<SendMessageRuntimeSnapshot>();
		const delivered: SendMessageRuntimeSnapshot[] = [];
		let calls = 0;
		let releases = 0;
		const watcher = watchSendMessageTargets(
			{
				acquireRefresh: () =>
					new Disposable(() => {
						releases++;
					}),
				onDidChangeTreeData: changes.event,
			},
			{
				getSnapshot: async () => {
					if (++calls === 1) {
						throw new Error('snapshot failed');
					}
					return held.promise;
				},
			},
			Uri.file(route.sourcePath),
			(snapshot) => delivered.push(snapshot),
		);
		try {
			changes.fire();
			await setImmediate();
			assert.deepEqual(delivered, [{ supported: true, targets: [] }]);
			changes.fire();
			changes.fire();
			watcher.dispose();
			held.resolve({ supported: true, targets: [] });
			await setImmediate();
			changes.fire();
			assert.lengthOf(delivered, 1);
			assert.equal(calls, 2);
			assert.equal(releases, 1);
		} finally {
			watcher.dispose();
			changes.dispose();
		}
	});
	test('serializes slow watcher lookups and delivers route changes in order', async () => {
		const changes = new EventEmitter<void>();
		const pending: ReturnType<typeof deferred<Response>>[] = [];
		global.fetch = () => {
			const response = deferred<Response>();
			pending.push(response);
			return response.promise;
		};
		const rows = [{ ...route }];
		const states: string[] = [];
		let releases = 0;
		const watcher = watchSendMessageTargets(
			{
				acquireRefresh: () =>
					new Disposable(() => {
						releases++;
					}),
				onDidChangeTreeData: changes.event,
			},
			new SendMessageRuntimeService(source(rows)),
			Uri.file(route.sourcePath),
			(snapshot) => {
				states.push(snapshot.targets[0].state);
			},
		);
		const complete = (index: number) => pending[index].resolve(new Response(JSON.stringify({ jvm: { pid: 123 } })));
		try {
			changes.fire();
			rows[0] = { ...route, state: 'Stopped' };
			changes.fire();
			changes.fire();
			assert.lengthOf(pending, 1, 'Only one PID lookup should run at a time');
			complete(0);
			await setImmediate();
			assert.deepEqual(states, ['Started']);
			assert.lengthOf(pending, 2, 'Overlapping events should request one trailing lookup');
			rows[0] = { ...route };
			changes.fire();
			complete(1);
			await setImmediate();
			assert.deepEqual(states, ['Started', 'Stopped']);
			complete(2);
			await setImmediate();
			assert.deepEqual(states, ['Started', 'Stopped', 'Started']);
		} finally {
			watcher.dispose();
			pending.forEach((response) => response.resolve(new Response('{}')));
			await setImmediate();
			changes.dispose();
		}
		assert.equal(releases, 1);
	});
	test('matches full source path, not basename, and preserves stopped status', async () => {
		global.fetch = async () => new Response(JSON.stringify({ jvm: { pid: 123 } }));
		const service = new SendMessageRuntimeService(
			source([route, { ...route, sourcePath: '/other/orders.camel.yaml' }, { ...route, routeId: 'stopped', state: 'Stopped' }]),
		);
		const snapshot = await service.getSnapshot(Uri.file(route.sourcePath));
		assert.deepEqual(
			snapshot.targets.map((t) => [t.routeId, t.state]),
			[
				['orders', 'Started'],
				['stopped', 'Stopped'],
			],
		);
	});
	test('uses validated Jolokia PID when JVM console returns text with HTTP 200', async () => {
		const urls: string[] = [];
		global.fetch = async (input) => {
			urls.push(String(input));
			return urls.length === 1 ? new Response('Developer Console not found: jvm') : new Response(JSON.stringify({ status: 200, value: 456 }));
		};
		const service = new SendMessageRuntimeService(source());
		const result = await service.getSnapshot(Uri.file(route.sourcePath));
		assert.equal(result.targets[0].pid, 456);
		assert.include(urls[1], '/observe/jolokia/read/java.lang:type=Runtime/Pid');
	});
	test('rejects an old target when the JVM on the same port changes', async () => {
		let pid = 123;
		global.fetch = async () => new Response(JSON.stringify({ jvm: { pid } }));
		const service = new SendMessageRuntimeService(source());
		const snapshot = await service.getSnapshot(Uri.file(route.sourcePath));
		pid = 456;
		try {
			await service.resolveTarget(Uri.file(route.sourcePath), snapshot.targets[0].id, 'orders');
			assert.fail('Expected stale target rejection');
		} catch (error) {
			assert.include(String(error), 'no longer available');
		}
	});
	test('never substitutes a name when identity is unavailable', async () => {
		global.fetch = async () => new Response(JSON.stringify({ status: 500, value: 123 }));
		const service = new SendMessageRuntimeService(source());
		const snapshot = await service.getSnapshot(Uri.file(route.sourcePath));
		assert.isNull(snapshot.targets[0].pid);
		try {
			await service.resolveTarget(Uri.file(route.sourcePath), snapshot.targets[0].id, 'orders');
			assert.fail('Expected identity rejection');
		} catch (error) {
			assert.include(String(error), 'identity');
		}
	});
});
