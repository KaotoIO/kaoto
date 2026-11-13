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
import { TestReportEvents } from '../../services/TestReportEvents';

suite('TestReportEvents', function () {
	test('instance returns a singleton', function () {
		const a = TestReportEvents.instance;
		const b = TestReportEvents.instance;
		assert.strictEqual(a, b);
	});

	test('fireTestReportReady emits the provided file paths', function (done) {
		const events = TestReportEvents.instance;
		const paths = ['/tmp/test1.citrus.yaml', '/tmp/test2.citrus.yaml'];

		const disposable = events.onTestReportReady((received) => {
			assert.deepStrictEqual(received, paths);
			disposable.dispose();
			done();
		});

		events.fireTestReportReady(paths);
	});

	test('fireTestRunStarted emits the provided file paths', function (done) {
		const events = TestReportEvents.instance;
		const paths = ['/tmp/test1.citrus.yaml'];

		const disposable = events.onTestRunStarted((received) => {
			assert.deepStrictEqual(received, paths);
			disposable.dispose();
			done();
		});

		events.fireTestRunStarted(paths);
	});
});
