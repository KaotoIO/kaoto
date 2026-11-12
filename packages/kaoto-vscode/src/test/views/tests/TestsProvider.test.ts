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
import { TestsProvider } from '../../../views/tests/TestsProvider';

suite('TestsProvider — report methods', function () {
	let provider: TestsProvider;

	setup(() => {
		provider = new TestsProvider();
	});

	teardown(() => {
		provider.dispose();
	});

	test('getTestReport returns undefined when no reports are stored', function () {
		assert.isUndefined(provider.getTestReport('non-existent'));
	});

	test('getTestReportByFilePath returns undefined when no reports are stored', function () {
		assert.isUndefined(provider.getTestReportByFilePath('/tmp/test.citrus.yaml'));
	});

	test('clearAllResults clears stored report entries', function () {
		provider.setTestResult('/tmp/test.citrus.yaml', 'success');
		provider.clearAllResults();

		assert.isUndefined(provider.getTestReportByFilePath('/tmp/test.citrus.yaml'));
	});
});
