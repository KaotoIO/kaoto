import { assert } from 'chai';
import { Uri } from 'vscode';
import { SendMessageRuntimeService } from '../../services/SendMessageRuntimeService';

suite('SendMessageRuntimeService', () => {
	const originalFetch = global.fetch;
	teardown(() => {
		global.fetch = originalFetch;
	});
	const route = { sourcePath: '/project/orders.camel.yaml', routeId: 'orders', state: 'Started', consolePort: 9876, label: 'orders' };
	const source = (routes = [route]) => ({ refresh: async () => {}, getSnapshot: () => routes });
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
