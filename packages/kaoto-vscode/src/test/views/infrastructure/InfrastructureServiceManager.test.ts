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
import { InfrastructureServiceManager } from '../../../views/infrastructure/InfrastructureServiceManager';
import { CamelCommandAPI } from '../../../executors/api/CamelCommandAPI';
import { RunningInfrastructureService } from '../../../views/infrastructure/InfrastructureItem';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<RunningInfrastructureService> = {}): RunningInfrastructureService {
	return {
		name: 'kafka',
		args: [],
		terminalName: 'Infrastructure - kafka',
		status: 'starting',
		...overrides,
	};
}

/**
 * Builds a raw CLI JSON record as emitted by `infra ps --json`.
 * Port and host must be nested inside `serviceData` because that is what
 * `CamelCommandAPI.extractRunningServices` actually reads.
 */
function makeCliJson(name: string, port?: number): object {
	return {
		name,
		serviceData: port ? { host: 'localhost', port } : undefined,
	};
}

// ─── register / unregister / getRunningService ────────────────────────────────

suite('InfrastructureServiceManager — register / unregister', function () {
	let origCapturePs: typeof CamelCommandAPI.captureInfraPs;

	setup(function () {
		origCapturePs = CamelCommandAPI.captureInfraPs;
		// Default stub: no CLI services running (prevents waitForRunningService side-effects)
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([]);
	});

	teardown(function () {
		CamelCommandAPI.captureInfraPs = origCapturePs;
	});

	test('registerRunningService makes the service retrievable', function () {
		let changeCount = 0;
		const manager = new InfrastructureServiceManager(() => changeCount++);

		manager.registerRunningService(makeService({ status: 'running' }));

		const result = manager.getRunningService('kafka');
		assert.isDefined(result);
		assert.strictEqual(result!.name, 'kafka');
		manager.dispose();
	});

	test('registerRunningService fires onServiceChange', function () {
		let changeCount = 0;
		const manager = new InfrastructureServiceManager(() => changeCount++);

		manager.registerRunningService(makeService({ status: 'running' }));

		assert.isAbove(changeCount, 0, 'onServiceChange should have been called');
		manager.dispose();
	});

	test('unregisterRunningService removes the service', function () {
		let changeCount = 0;
		const manager = new InfrastructureServiceManager(() => changeCount++);

		manager.registerRunningService(makeService({ status: 'running' }));
		manager.unregisterRunningService('kafka');

		assert.isUndefined(manager.getRunningService('kafka'));
		manager.dispose();
	});

	test('unregisterRunningService on unknown name is a no-op', function () {
		const manager = new InfrastructureServiceManager(() => {});

		manager.unregisterRunningService('nonexistent');

		// onServiceChange IS called (by design, the map change fires it regardless)
		// Just ensure no throw
		assert.doesNotThrow(() => manager.getRunningService('nonexistent'));
		manager.dispose();
	});

	test('getRunningServices returns all registered services', function () {
		const manager = new InfrastructureServiceManager(() => {});

		manager.registerRunningService(makeService({ name: 'kafka', status: 'running' }));
		manager.registerRunningService(makeService({ name: 'postgres', status: 'running', terminalName: 'Infrastructure - postgres' }));

		assert.strictEqual(manager.getRunningServices().size, 2);
		manager.dispose();
	});
});

// ─── updateRunningService ─────────────────────────────────────────────────────

suite('InfrastructureServiceManager — updateRunningService', function () {
	let origCapturePs: typeof CamelCommandAPI.captureInfraPs;

	setup(function () {
		origCapturePs = CamelCommandAPI.captureInfraPs;
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([]);
	});

	teardown(function () {
		CamelCommandAPI.captureInfraPs = origCapturePs;
	});

	test('updates fields on an existing service', function () {
		const manager = new InfrastructureServiceManager(() => {});
		manager.registerRunningService(makeService({ status: 'running' }));

		manager.updateRunningService('kafka', { port: 9092, status: 'running' });

		const updated = manager.getRunningService('kafka')!;
		assert.strictEqual(updated.port, 9092);
		manager.dispose();
	});

	test('is a no-op for unknown service name', function () {
		const manager = new InfrastructureServiceManager(() => {});
		assert.doesNotThrow(() => manager.updateRunningService('nonexistent', { port: 1234 }));
		manager.dispose();
	});

	test('skipRefresh=true does NOT call onServiceChange', function () {
		let changeCount = 0;
		const manager = new InfrastructureServiceManager(() => changeCount++);
		manager.registerRunningService(makeService({ status: 'running' }));
		const before = changeCount;

		manager.updateRunningService('kafka', { status: 'stopping' }, true);

		assert.strictEqual(changeCount, before, 'onServiceChange must not fire when skipRefresh=true');
		manager.dispose();
	});

	test('updates terminalName index when terminalName changes', function () {
		const manager = new InfrastructureServiceManager(() => {});
		manager.registerRunningService(makeService({ status: 'running', terminalName: 'old-terminal' }));

		manager.updateRunningService('kafka', { terminalName: 'new-terminal' });

		const service = manager.getRunningService('kafka')!;
		assert.strictEqual(service.terminalName, 'new-terminal');
		manager.dispose();
	});
});

// ─── markServiceStopping ──────────────────────────────────────────────────────

suite('InfrastructureServiceManager — markServiceStopping', function () {
	let origCapturePs: typeof CamelCommandAPI.captureInfraPs;

	setup(function () {
		origCapturePs = CamelCommandAPI.captureInfraPs;
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([]);
	});

	teardown(function () {
		CamelCommandAPI.captureInfraPs = origCapturePs;
	});

	test('sets status to "stopping"', function () {
		const manager = new InfrastructureServiceManager(() => {});
		manager.registerRunningService(makeService({ status: 'running' }));

		manager.markServiceStopping('kafka');

		assert.strictEqual(manager.getRunningService('kafka')!.status, 'stopping');
		manager.dispose();
	});
});

// ─── setManualOperationInProgress / isManualOperation ────────────────────────

suite('InfrastructureServiceManager — manual operation guard', function () {
	test('defaults to false', function () {
		const manager = new InfrastructureServiceManager(() => {});
		assert.isFalse(manager.isManualOperation());
		manager.dispose();
	});

	test('can be set to true and back to false', function () {
		const manager = new InfrastructureServiceManager(() => {});
		manager.setManualOperationInProgress(true);
		assert.isTrue(manager.isManualOperation());
		manager.setManualOperationInProgress(false);
		assert.isFalse(manager.isManualOperation());
		manager.dispose();
	});
});

// ─── isServiceStarting ────────────────────────────────────────────────────────

suite('InfrastructureServiceManager — isServiceStarting', function () {
	test('defaults to false', function () {
		const manager = new InfrastructureServiceManager(() => {});
		assert.isFalse(manager.isServiceStarting());
		manager.dispose();
	});

	test('setStartingService(true) makes isServiceStarting() true', function () {
		const manager = new InfrastructureServiceManager(() => {});
		manager.setStartingService(true);
		assert.isTrue(manager.isServiceStarting());
		manager.dispose();
	});
});

// ─── isServicesLoaded ─────────────────────────────────────────────────────────

suite('InfrastructureServiceManager — isServicesLoaded', function () {
	test('false before any load', function () {
		const manager = new InfrastructureServiceManager(() => {});
		assert.isFalse(manager.isServicesLoaded());
		manager.dispose();
	});
});

// ─── refreshRunningServicesFromCli ────────────────────────────────────────────

suite('InfrastructureServiceManager — refreshRunningServicesFromCli', function () {
	let origCapturePs: typeof CamelCommandAPI.captureInfraPs;

	setup(function () {
		origCapturePs = CamelCommandAPI.captureInfraPs;
	});

	teardown(function () {
		CamelCommandAPI.captureInfraPs = origCapturePs;
	});

	test('returns false when manual operation is in progress', async function () {
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([]);
		const manager = new InfrastructureServiceManager(() => {});
		manager.setManualOperationInProgress(true);

		const changed = await manager.refreshRunningServicesFromCli();

		assert.isFalse(changed);
		manager.dispose();
	});

	test('discovers new external service not yet tracked', async function () {
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([makeCliJson('kafka', 9092)]);
		const manager = new InfrastructureServiceManager(() => {});

		const changed = await manager.refreshRunningServicesFromCli();

		assert.isTrue(changed);
		const service = manager.getRunningService('kafka');
		assert.isDefined(service);
		assert.isTrue(service!.isExternal);
		assert.strictEqual(service!.status, 'running');
		manager.dispose();
	});

	test('updates port/url of a tracked managed service', async function () {
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([makeCliJson('kafka', 9092)]);
		const manager = new InfrastructureServiceManager(() => {});
		// Write directly to the internal map to pre-seed a managed (non-external) starting
		// service without triggering the async waitForRunningService polling loop.
		(manager as any).runningServices.set('kafka', makeService({ status: 'starting' }));

		const changed = await manager.refreshRunningServicesFromCli();

		assert.isTrue(changed);
		const service = manager.getRunningService('kafka')!;
		assert.strictEqual(service.port, 9092);
		assert.strictEqual(service.status, 'running');
		manager.dispose();
	});

	test('removes external service when it disappears from CLI', async function () {
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([]);
		const manager = new InfrastructureServiceManager(() => {});
		// Pre-register an external service
		manager['runningServices'].set('kafka', makeService({ status: 'running', isExternal: true }));
		manager['terminalNameToServiceName'].set('Infrastructure - kafka', 'kafka');

		const changed = await manager.refreshRunningServicesFromCli();

		assert.isTrue(changed);
		assert.isUndefined(manager.getRunningService('kafka'));
		manager.dispose();
	});

	test('does NOT remove managed running service when it disappears from CLI', async function () {
		CamelCommandAPI.captureInfraPs = async () => JSON.stringify([]);
		const manager = new InfrastructureServiceManager(() => {});
		// Pre-register a managed (non-external) running service
		manager['runningServices'].set('kafka', makeService({ status: 'running', isExternal: false }));

		await manager.refreshRunningServicesFromCli();

		// Managed running services are only cleaned up by the task-end handler
		assert.isDefined(manager.getRunningService('kafka'));
		manager.dispose();
	});

	test('returns false on CLI error (does not throw)', async function () {
		CamelCommandAPI.captureInfraPs = async () => {
			throw new Error('connection refused');
		};
		const manager = new InfrastructureServiceManager(() => {});

		const changed = await manager.refreshRunningServicesFromCli();

		assert.isFalse(changed);
		manager.dispose();
	});
});
