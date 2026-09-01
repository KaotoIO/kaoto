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
import { CamelCommandAPI } from '../../executors/api/CamelCommandAPI';

// ─── extractAvailableServices ─────────────────────────────────────────────────

suite('CamelCommandAPI — extractAvailableServices', function () {
	test('parses a simple list of services', function () {
		const json = JSON.stringify([
			{ name: 'kafka', description: 'Apache Kafka broker' },
			{ name: 'postgres', description: 'PostgreSQL database' },
		]);

		const result = CamelCommandAPI.extractAvailableServices(json);

		assert.lengthOf(result, 2);
		assert.deepInclude(result, { name: 'kafka', description: 'Apache Kafka broker' });
		assert.deepInclude(result, { name: 'postgres', description: 'PostgreSQL database' });
	});

	test('prefers alias over name when both are present', function () {
		const json = JSON.stringify([{ name: 'kafka-impl', alias: 'kafka', description: 'Kafka via alias' }]);

		const result = CamelCommandAPI.extractAvailableServices(json);

		assert.lengthOf(result, 1);
		assert.strictEqual(result[0].name, 'kafka');
	});

	test('appends aliasImplementation to description', function () {
		const json = JSON.stringify([
			{
				alias: 'kafka',
				description: 'Apache Kafka',
				aliasImplementation: 'kafka-impl, kafka-strimzi',
			},
		]);

		const result = CamelCommandAPI.extractAvailableServices(json);

		assert.lengthOf(result, 1);
		assert.include(result[0].description, 'Implementations: kafka-impl, kafka-strimzi');
	});

	test('skips entries with no name and no alias', function () {
		const json = JSON.stringify([{ description: 'nameless service' }]);

		const result = CamelCommandAPI.extractAvailableServices(json);

		assert.lengthOf(result, 0);
	});

	test('skips entries with blank name', function () {
		const json = JSON.stringify([{ name: '   ', description: 'blank name' }]);

		const result = CamelCommandAPI.extractAvailableServices(json);

		assert.lengthOf(result, 0);
	});

	test('returns services sorted alphabetically', function () {
		const json = JSON.stringify([{ name: 'zookeeper' }, { name: 'kafka' }, { name: 'postgres' }]);

		const result = CamelCommandAPI.extractAvailableServices(json);

		assert.deepStrictEqual(
			result.map((s) => s.name),
			['kafka', 'postgres', 'zookeeper'],
		);
	});

	test('returns empty array for invalid JSON', function () {
		const result = CamelCommandAPI.extractAvailableServices('not-valid-json');
		assert.deepStrictEqual(result, []);
	});

	test('returns empty array for empty JSON array', function () {
		const result = CamelCommandAPI.extractAvailableServices('[]');
		assert.deepStrictEqual(result, []);
	});

	test('sets description to undefined when only whitespace', function () {
		const json = JSON.stringify([{ name: 'kafka', description: '   ' }]);

		const result = CamelCommandAPI.extractAvailableServices(json);

		assert.isUndefined(result[0].description);
	});
});

// ─── extractRunningServices ───────────────────────────────────────────────────

suite('CamelCommandAPI — extractRunningServices', function () {
	test('parses a running service with port in serviceData', function () {
		const json = JSON.stringify([
			{
				name: 'kafka',
				description: 'Apache Kafka',
				serviceData: { port: 9092 },
			},
		]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.lengthOf(result, 1);
		assert.strictEqual(result[0].name, 'kafka');
		assert.strictEqual(result[0].port, 9092);
	});

	test('builds url from host and port', function () {
		const json = JSON.stringify([{ name: 'kafka', serviceData: { host: 'localhost', port: 9092 } }]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.strictEqual(result[0].url, 'localhost:9092');
	});

	test('extracts port from a URL string in serviceData when no direct port', function () {
		const json = JSON.stringify([{ name: 'postgres', serviceData: { connectionUrl: 'jdbc:postgresql://localhost:5432/db' } }]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.strictEqual(result[0].port, 5432);
	});

	test('extracts host from a URL string in serviceData when no direct host', function () {
		const json = JSON.stringify([{ name: 'postgres', serviceData: { connectionUrl: 'localhost:5432/db' } }]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.strictEqual(result[0].host, 'localhost');
	});

	test('port can be supplied as a string in serviceData', function () {
		const json = JSON.stringify([{ name: 'kafka', serviceData: { port: '9092' } }]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.strictEqual(result[0].port, 9092);
	});

	test('prefers alias over name', function () {
		const json = JSON.stringify([{ name: 'kafka-impl', alias: 'kafka' }]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.strictEqual(result[0].name, 'kafka');
	});

	test('skips entries with no identifier', function () {
		const json = JSON.stringify([{ description: 'no name' }]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.lengthOf(result, 0);
	});

	test('returns services sorted alphabetically', function () {
		const json = JSON.stringify([{ name: 'zookeeper' }, { name: 'kafka' }, { name: 'postgres' }]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.deepStrictEqual(
			result.map((s) => s.name),
			['kafka', 'postgres', 'zookeeper'],
		);
	});

	test('returns empty array for invalid JSON', function () {
		const result = CamelCommandAPI.extractRunningServices('not-json');
		assert.deepStrictEqual(result, []);
	});

	test('returns empty array for empty JSON array', function () {
		const result = CamelCommandAPI.extractRunningServices('[]');
		assert.deepStrictEqual(result, []);
	});

	test('no serviceData → no port, no url, no host', function () {
		const json = JSON.stringify([{ name: 'kafka' }]);

		const result = CamelCommandAPI.extractRunningServices(json);

		assert.isUndefined(result[0].port);
		assert.isUndefined(result[0].url);
		assert.isUndefined(result[0].host);
	});
});
