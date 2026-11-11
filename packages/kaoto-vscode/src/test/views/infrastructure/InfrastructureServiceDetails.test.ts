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
import { InfraRunningServiceDetails } from '../../../executors/types/ExecutorTypes';
import { RunningInfrastructureService } from '../../../views/infrastructure/InfrastructureItem';
import { createExternalService, mergeCliDetails } from '../../../views/infrastructure/InfrastructureServiceDetails';

function makeService(overrides: Partial<RunningInfrastructureService> = {}): RunningInfrastructureService {
	return {
		name: 'kafka',
		args: ['--foo'],
		terminalName: 'Infrastructure - kafka',
		status: 'starting',
		...overrides,
	};
}

function makeCliDetails(overrides: Partial<InfraRunningServiceDetails> = {}): InfraRunningServiceDetails {
	return { name: 'kafka', ...overrides };
}

suite('InfrastructureServiceDetails — mergeCliDetails', function () {
	test('takes the CLI details and marks the service as running', function () {
		const merged = mergeCliDetails(
			makeService(),
			makeCliDetails({ description: 'Kafka', port: 9092, url: 'localhost:9092', uiUrl: 'http://localhost:8080', uiSupported: true }),
		);

		assert.strictEqual(merged.description, 'Kafka');
		assert.strictEqual(merged.port, 9092);
		assert.strictEqual(merged.url, 'localhost:9092');
		assert.strictEqual(merged.uiUrl, 'http://localhost:8080');
		assert.isTrue(merged.uiSupported);
		assert.strictEqual(merged.status, 'running');
	});

	test('keeps the managed properties of the tracked service', function () {
		const merged = mergeCliDetails(makeService({ isExternal: false }), makeCliDetails({ port: 9092 }));

		assert.strictEqual(merged.name, 'kafka');
		assert.deepEqual(merged.args, ['--foo']);
		assert.strictEqual(merged.terminalName, 'Infrastructure - kafka');
		assert.isFalse(merged.isExternal);
	});

	test('keeps the previous description, port, url and uiSupported when the CLI does not report them', function () {
		const merged = mergeCliDetails(makeService({ description: 'Kafka', port: 9092, url: 'localhost:9092', uiSupported: true }), makeCliDetails());

		assert.strictEqual(merged.description, 'Kafka');
		assert.strictEqual(merged.port, 9092);
		assert.strictEqual(merged.url, 'localhost:9092');
		assert.isTrue(merged.uiSupported);
	});

	test('clears the UI URL when the CLI does not report it', function () {
		const merged = mergeCliDetails(makeService({ uiUrl: 'http://localhost:8080' }), makeCliDetails());

		assert.isUndefined(merged.uiUrl);
	});

	test('does not mutate the tracked service', function () {
		const current = makeService();

		mergeCliDetails(current, makeCliDetails({ port: 9092 }));

		assert.isUndefined(current.port);
		assert.strictEqual(current.status, 'starting');
	});
});

suite('InfrastructureServiceDetails — createExternalService', function () {
	test('builds a running external service from the CLI details', function () {
		const service = createExternalService(
			makeCliDetails({ description: 'Kafka', port: 9092, url: 'localhost:9092', uiUrl: 'http://localhost:8080', uiSupported: true }),
		);

		assert.deepEqual(service, {
			name: 'kafka',
			description: 'Kafka',
			port: 9092,
			url: 'localhost:9092',
			uiUrl: 'http://localhost:8080',
			uiSupported: true,
			args: [],
			terminalName: 'kafka (external)',
			status: 'running',
			isExternal: true,
		});
	});
});
