/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { assert } from 'chai';
import { InfrastructureProvider } from '../../../views/infrastructure/InfrastructureProvider';
import { CamelCommandAPI } from '../../../executors/api/CamelCommandAPI';
import { InfrastructureItem, RunningInfrastructureService } from '../../../views/infrastructure/InfrastructureItem';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(name: string, overrides: Partial<RunningInfrastructureService> = {}): RunningInfrastructureService {
	return {
		name,
		args: [],
		terminalName: `Infrastructure - ${name}`,
		status: 'running',
		...overrides,
	};
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

/**
 * Registers hooks in the calling suite that report no CLI services running, which prevents the
 * auto-registration of external services. Hooks declared at file level would apply to every
 * suite of the run, so each suite calls this instead.
 */
function stubNoCliServices(): void {
	let origCapturePs: typeof CamelCommandAPI.captureInfraPs;

	setup(function () {
		origCapturePs = CamelCommandAPI.captureInfraPs;
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([]);
	});

	teardown(function () {
		CamelCommandAPI.captureInfraPs = origCapturePs;
	});
}

// ─── getChildren ──────────────────────────────────────────────────────────────

suite('InfrastructureProvider — getChildren', function () {
	stubNoCliServices();

	test('returns empty array when no services are registered', function () {
		const provider = new InfrastructureProvider();
		assert.deepStrictEqual(provider.getChildren(), []);
		provider.dispose();
	});

	test('returns InfrastructureItem for each registered service', function () {
		const provider = new InfrastructureProvider();
		provider.registerRunningService(makeService('kafka'));

		const children = provider.getChildren();
		assert.lengthOf(children, 1);
		assert.instanceOf(children[0], InfrastructureItem);
		provider.dispose();
	});

	test('returns children sorted alphabetically by name', function () {
		const provider = new InfrastructureProvider();
		provider.registerRunningService(makeService('zookeeper'));
		provider.registerRunningService(makeService('kafka'));
		provider.registerRunningService(makeService('postgres'));

		const names = provider.getChildren().map((item) => (item as InfrastructureItem).service.name);
		assert.deepStrictEqual(names, ['kafka', 'postgres', 'zookeeper']);
		provider.dispose();
	});
});

// ─── registerRunningService fires tree change event ──────────────────────────

suite('InfrastructureProvider — registerRunningService', function () {
	stubNoCliServices();

	test('fires onDidChangeTreeData', function (done) {
		const provider = new InfrastructureProvider();
		provider.onDidChangeTreeData((e) => {
			assert.isUndefined(e, 'event arg should be undefined (full-tree refresh)');
			provider.dispose();
			done();
		});
		provider.registerRunningService(makeService('kafka'));
	});
});

// ─── unregisterRunningService ────────────────────────────────────────────────

suite('InfrastructureProvider — unregisterRunningService', function () {
	stubNoCliServices();

	test('removes service from getChildren', function () {
		const provider = new InfrastructureProvider();
		provider.registerRunningService(makeService('kafka'));

		provider.unregisterRunningService('kafka');

		assert.deepStrictEqual(provider.getChildren(), []);
		provider.dispose();
	});
});

// ─── markServiceStopping ──────────────────────────────────────────────────────

suite('InfrastructureProvider — markServiceStopping', function () {
	stubNoCliServices();

	test('service status becomes "stopping"', function () {
		const provider = new InfrastructureProvider();
		provider.registerRunningService(makeService('kafka', { status: 'running' }));

		provider.markServiceStopping('kafka');

		const service = provider.getRunningService('kafka')!;
		assert.strictEqual(service.status, 'stopping');
		provider.dispose();
	});
});

// ─── updateRunningService ─────────────────────────────────────────────────────

suite('InfrastructureProvider — updateRunningService', function () {
	stubNoCliServices();

	test('updates fields on a known service', function () {
		const provider = new InfrastructureProvider();
		provider.registerRunningService(makeService('kafka', { status: 'running' }));

		provider.updateRunningService('kafka', { port: 9092 });

		assert.strictEqual(provider.getRunningService('kafka')!.port, 9092);
		provider.dispose();
	});

	test('skipRefresh=true does NOT fire onDidChangeTreeData after update', function (done) {
		const provider = new InfrastructureProvider();
		provider.registerRunningService(makeService('kafka', { status: 'running' }));

		let extraFires = 0;
		provider.onDidChangeTreeData(() => extraFires++);

		provider.updateRunningService('kafka', { status: 'running' }, true);

		// Give any async event a tick to fire
		setImmediate(() => {
			assert.strictEqual(extraFires, 0, 'no extra tree-data event should fire with skipRefresh=true');
			provider.dispose();
			done();
		});
	});
});

// ─── dispose ─────────────────────────────────────────────────────────────────

suite('InfrastructureProvider — dispose', function () {
	stubNoCliServices();

	test('can be disposed without throwing', function () {
		const provider = new InfrastructureProvider();
		assert.doesNotThrow(() => provider.dispose());
	});

	test('double-dispose does not throw', function () {
		const provider = new InfrastructureProvider();
		provider.dispose();
		assert.doesNotThrow(() => provider.dispose());
	});
});
