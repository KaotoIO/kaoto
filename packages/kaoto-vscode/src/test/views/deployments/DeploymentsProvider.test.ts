/**
 * Copyright 2025 Red Hat, Inc. and/or its affiliates.
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
import { DeploymentsProvider, PortFileKey } from '../../../views/deployments/DeploymentsProvider';
import { PortManager } from '../../../services/PortManager';
import { CamelTask, CamelTaskDefinition } from '../../../tasks/CamelTask';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Creates a PortManager whose waitForPortReachable and releasePort
 * are overridden so tests run without any network I/O.
 */
function makePortManager(reachable: boolean): {
	portManager: PortManager;
	releasePortCalls: number[];
	waitForPortReachableCalls: Array<{ port: number; timeout: number | undefined }>;
} {
	const portManager = new PortManager();
	const releasePortCalls: number[] = [];
	const waitForPortReachableCalls: Array<{ port: number; timeout: number | undefined }> = [];

	const origRelease = portManager.releasePort.bind(portManager);
	portManager.releasePort = (port: number) => {
		releasePortCalls.push(port);
		origRelease(port);
	};

	portManager.waitForPortReachable = async (port: number, timeout?: number) => {
		waitForPortReachableCalls.push({ port, timeout });
		return reachable;
	};

	return { portManager, releasePortCalls, waitForPortReachableCalls };
}

/** Builds a minimal CamelTaskDefinition for use with handleTaskEnd. */
function makeCamelTaskDef(port: number): CamelTaskDefinition {
	return { type: 'camel', label: 'test-task', port };
}

// ─── PortFileKey ─────────────────────────────────────────────────────────────

suite('PortFileKey', function () {
	test('toString / fromString round-trip with simple filename', function () {
		const key = new PortFileKey(8080, 'sample.camel.yaml');
		const restored = PortFileKey.fromString(key.toString());
		assert.strictEqual(restored.port, 8080);
		assert.strictEqual(restored.file, 'sample.camel.yaml');
	});

	test('fromString handles filenames containing "::"', function () {
		const key = new PortFileKey(9090, 'my::tricky::file.camel.yaml');
		const restored = PortFileKey.fromString(key.toString());
		assert.strictEqual(restored.port, 9090);
		assert.strictEqual(restored.file, 'my::tricky::file.camel.yaml');
	});
});

// ─── Port guard: task-start / task-end handlers ───────────────────────────────

suite('DeploymentsProvider — port guard (NO_PORT = -1 is skipped)', function () {
	test('NO_PORT (-1) is not a positive port — the port > 0 guard rejects it', function () {
		// This is the exact expression used in both task handlers.
		// The bug was `def.port` (truthy — -1 is truthy); the fix is `def.port > 0`.
		assert.isFalse(CamelTask.NO_PORT > 0, 'NO_PORT (-1) must NOT pass the port > 0 guard');
	});

	test('releasePort is NOT called when a task ends with NO_PORT (-1)', function () {
		const { portManager, releasePortCalls } = makePortManager(false);
		const provider = new DeploymentsProvider(portManager);

		provider.handleTaskEnd(makeCamelTaskDef(CamelTask.NO_PORT));

		provider.dispose();
		assert.deepStrictEqual(releasePortCalls, [], 'releasePort must not be called for NO_PORT');
	});

	test('releasePort IS called exactly once when a task ends with a valid port', function () {
		const { portManager, releasePortCalls } = makePortManager(false);
		const provider = new DeploymentsProvider(portManager);

		provider.handleTaskEnd(makeCamelTaskDef(8080));

		provider.dispose();
		assert.deepStrictEqual(releasePortCalls, [8080], 'releasePort must be called exactly once for a valid port');
	});
});

// ─── fetchLocalhostRoutes: no port release on transient failures ───────────────

suite('DeploymentsProvider — ports are NOT released on transient poll failures', function () {
	test('port is retained when waitForPortReachable returns false', async function () {
		const { portManager, releasePortCalls } = makePortManager(false /* unreachable */);

		// Register a port as active
		portManager.getUsedPorts().add(8080);

		const provider = new DeploymentsProvider(portManager);
		await provider.refresh();

		provider.dispose();

		assert.deepStrictEqual(releasePortCalls, [], 'releasePort must NOT be called when port is transiently unreachable');
		assert.isTrue(portManager.getUsedPorts().has(8080), 'port 8080 must remain in the active set');
	});

	test('port is retained when the HTTP fetch throws (network error)', async function () {
		const { portManager, releasePortCalls } = makePortManager(true /* reachable */);

		portManager.getUsedPorts().add(9090);

		// Stub global fetch to simulate a connection error
		const originalFetch = global.fetch;
		global.fetch = async () => {
			throw new Error('connection refused');
		};

		try {
			const provider = new DeploymentsProvider(portManager);
			await provider.refresh();
			provider.dispose();

			assert.deepStrictEqual(releasePortCalls, [], 'releasePort must NOT be called on a fetch error');
			assert.isTrue(portManager.getUsedPorts().has(9090), 'port 9090 must remain in the active set after a fetch error');
		} finally {
			global.fetch = originalFetch;
		}
	});
});

// ─── fetchLocalhostRoutes: 3-second reachability timeout ─────────────────────

suite('DeploymentsProvider — reachability poll uses 3-second timeout', function () {
	test('waitForPortReachable is called with timeout 3000 during a background poll', async function () {
		const { portManager, waitForPortReachableCalls } = makePortManager(false);

		portManager.getUsedPorts().add(8080);

		const provider = new DeploymentsProvider(portManager);
		await provider.refresh();
		provider.dispose();

		assert.isTrue(
			waitForPortReachableCalls.some((c) => c.port === 8080 && c.timeout === 3_000),
			`Expected waitForPortReachable(8080, 3000) but got: ${JSON.stringify(waitForPortReachableCalls)}`,
		);
	});
});
