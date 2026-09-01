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
import { ThemeIcon } from 'vscode';
import { InfrastructureItem, RunningInfrastructureService } from '../../../views/infrastructure/InfrastructureItem';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<RunningInfrastructureService> = {}): RunningInfrastructureService {
	return {
		name: 'kafka',
		args: [],
		terminalName: 'Infrastructure - kafka',
		status: 'running',
		...overrides,
	};
}

// ─── Label ────────────────────────────────────────────────────────────────────

suite('InfrastructureItem — label', function () {
	test('label equals service name', function () {
		const item = new InfrastructureItem(makeService({ name: 'postgres' }));
		assert.strictEqual(item.label, 'postgres');
	});
});

// ─── contextValue ─────────────────────────────────────────────────────────────

suite('InfrastructureItem — contextValue', function () {
	test('managed service with no url/port → "infrastructure-service"', function () {
		const item = new InfrastructureItem(makeService());
		assert.strictEqual(item.contextValue, 'infrastructure-service');
	});

	test('external service with no url/port → "infrastructure-service-external"', function () {
		const item = new InfrastructureItem(makeService({ isExternal: true }));
		assert.strictEqual(item.contextValue, 'infrastructure-service-external');
	});

	test('managed service with url → appends "-has-url"', function () {
		const item = new InfrastructureItem(makeService({ url: 'localhost:9092' }));
		assert.include(item.contextValue, '-has-url');
		assert.notInclude(item.contextValue, 'external');
	});

	test('managed service with port → appends "-has-port"', function () {
		const item = new InfrastructureItem(makeService({ port: 9092 }));
		assert.include(item.contextValue, '-has-port');
	});

	test('managed service with both url and port → both flags present', function () {
		const item = new InfrastructureItem(makeService({ url: 'localhost:9092', port: 9092 }));
		assert.include(item.contextValue, '-has-url');
		assert.include(item.contextValue, '-has-port');
	});

	test('external service with url → "infrastructure-service-external-has-url"', function () {
		const item = new InfrastructureItem(makeService({ isExternal: true, url: 'localhost:5432' }));
		assert.strictEqual(item.contextValue, 'infrastructure-service-external-has-url');
	});
});

// ─── Icon ─────────────────────────────────────────────────────────────────────

suite('InfrastructureItem — icon', function () {
	test('running service uses "server-environment" icon', function () {
		const item = new InfrastructureItem(makeService({ status: 'running' }));
		assert.instanceOf(item.iconPath, ThemeIcon);
		assert.strictEqual((item.iconPath as ThemeIcon).id, 'server-environment');
	});

	test('starting service uses "loading~spin" icon', function () {
		const item = new InfrastructureItem(makeService({ status: 'starting' }));
		assert.instanceOf(item.iconPath, ThemeIcon);
		assert.strictEqual((item.iconPath as ThemeIcon).id, 'loading~spin');
	});

	test('stopping service uses "loading~spin" icon', function () {
		const item = new InfrastructureItem(makeService({ status: 'stopping' }));
		assert.instanceOf(item.iconPath, ThemeIcon);
		assert.strictEqual((item.iconPath as ThemeIcon).id, 'loading~spin');
	});
});

// ─── Description ──────────────────────────────────────────────────────────────

suite('InfrastructureItem — description', function () {
	test('running with port → ":9092"', function () {
		const item = new InfrastructureItem(makeService({ status: 'running', port: 9092 }));
		assert.strictEqual(item.description, ':9092');
	});

	test('running external with port → ":9092 (external)"', function () {
		const item = new InfrastructureItem(makeService({ status: 'running', port: 9092, isExternal: true }));
		assert.strictEqual(item.description, ':9092 (external)');
	});

	test('running with no port but description → shows description', function () {
		const item = new InfrastructureItem(makeService({ status: 'running', description: 'Apache Kafka broker' }));
		assert.strictEqual(item.description, 'Apache Kafka broker');
	});

	test('running with neither port nor description → empty string', function () {
		const item = new InfrastructureItem(makeService({ status: 'running' }));
		assert.strictEqual(item.description, '');
	});

	test('starting with port → "Starting on :9092"', function () {
		const item = new InfrastructureItem(makeService({ status: 'starting', port: 9092 }));
		assert.strictEqual(item.description, 'Starting on :9092');
	});

	test('starting without port → "Starting..."', function () {
		const item = new InfrastructureItem(makeService({ status: 'starting' }));
		assert.strictEqual(item.description, 'Starting...');
	});

	test('starting external without port → "Starting... (external)"', function () {
		const item = new InfrastructureItem(makeService({ status: 'starting', isExternal: true }));
		assert.strictEqual(item.description, 'Starting... (external)');
	});

	test('stopping with port → "Stopping on :5432"', function () {
		const item = new InfrastructureItem(makeService({ status: 'stopping', port: 5432 }));
		assert.strictEqual(item.description, 'Stopping on :5432');
	});

	test('stopping without port → "Stopping..."', function () {
		const item = new InfrastructureItem(makeService({ status: 'stopping' }));
		assert.strictEqual(item.description, 'Stopping...');
	});
});

// ─── Tooltip ──────────────────────────────────────────────────────────────────

suite('InfrastructureItem — tooltip', function () {
	test('running service with all fields', function () {
		const item = new InfrastructureItem(
			makeService({ status: 'running', description: 'Kafka broker', port: 9092, url: 'localhost:9092', args: ['--log'] }),
		);
		const tooltip = item.tooltip as string;
		assert.include(tooltip, 'Status: Running');
		assert.include(tooltip, 'Service: Kafka broker');
		assert.include(tooltip, 'URL: localhost:9092');
		assert.include(tooltip, 'Port: 9092');
		assert.include(tooltip, 'Args: --log');
	});

	test('starting service shows "Status: Starting"', function () {
		const item = new InfrastructureItem(makeService({ status: 'starting' }));
		assert.include(item.tooltip as string, 'Status: Starting');
	});

	test('stopping service shows "Status: Stopping"', function () {
		const item = new InfrastructureItem(makeService({ status: 'stopping' }));
		assert.include(item.tooltip as string, 'Status: Stopping');
	});

	test('service with no description falls back to name in tooltip', function () {
		const item = new InfrastructureItem(makeService({ name: 'redis' }));
		assert.include(item.tooltip as string, 'Service: redis');
	});

	test('service with no args omits "Args:" line', function () {
		const item = new InfrastructureItem(makeService({ args: [] }));
		assert.notInclude(item.tooltip as string, 'Args:');
	});
});
