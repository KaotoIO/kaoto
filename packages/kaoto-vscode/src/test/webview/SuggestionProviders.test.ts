/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License", destination); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import path from 'path';
import { expect } from 'chai';
import { filterSuggestionsByWord, getSuggestions } from '../../services/SuggestionRegistry';
import { Suggestion } from '@kaoto/kaoto';

suite('Channel API', () => {
	suite('get Suggestions for OS environment variables', function () {
		let originalEnv: NodeJS.ProcessEnv;

		setup(() => {
			originalEnv = { ...process.env };

			// define test environment variables
			process.env.TEST_ALPHA = 'A';
			process.env.TEST_BETA = 'B';
			process.env.TESTCASE = 'C';
			process.env.Test_Case = 'yes';
			process.env.Test_Mixed = 'mixed';
			process.env.PATH = '/usr/local/bin';
		});

		teardown(() => {
			process.env = originalEnv;
		});

		test('includes case-sensitive startsWith matches and ranks them first', async () => {
			const suggestions = await getSuggestions('env', 'TEST_', { propertyName: 'Test', inputValue: '' });
			const values = suggestions.map((s) => s.value);

			expect(values).to.deep.include.members(['TEST_ALPHA', 'TEST_BETA']);
		});

		test('includes case-sensitive and insensitive matches, with case-sensitive ranked first', async () => {
			const suggestions = await getSuggestions('env', 'Te', { propertyName: 'Test', inputValue: '' });
			const values = suggestions.map((s) => s.value);

			expect(values).to.include('Test_Mixed');
			expect(values).to.include('Test_Case');
			expect(values).to.include('TESTCASE');
			expect(values).to.include('TEST_ALPHA');

			expect(values.indexOf('Test_Case')).to.equal(0);
			expect(values.indexOf('Test_Case')).to.be.lessThan(values.indexOf('Test_Mixed'));
			expect(values.indexOf('Test_Case')).to.be.lessThan(values.indexOf('TESTCASE'));
			expect(values.indexOf('Test_Case')).to.be.lessThan(values.indexOf('TEST_ALPHA'));
		});

		test('includes exact match and ranks it high', async () => {
			const suggestions = await getSuggestions('env', 'PATH', { propertyName: 'Test', inputValue: '' });
			const values = suggestions.map((s) => s.value);

			expect(values).to.include('PATH');
			expect(values[0]).to.equal('PATH');
		});

		test('returns empty array for no matches', async () => {
			const suggestions = await getSuggestions('env', 'UNMATCHED_VAR', { propertyName: 'Test', inputValue: '' });
			expect(suggestions).to.be.an('array').that.is.empty;
		});

		test('returns all env variables for empty string input', async () => {
			const suggestions = await getSuggestions('env', '', { propertyName: 'Test', inputValue: '' });
			const expectedKeys = Object.keys(process.env);
			const suggestionValues = suggestions.map((s) => s.value);

			expect(suggestionValues).to.have.members(expectedKeys);
			expect(suggestions).to.have.lengthOf(expectedKeys.length);
		});

		test('ranks case-sensitive startsWith matches before case-insensitive and includes', async () => {
			process.env.PathLib = 'x'; // add a more complex mixed-case match
			process.env.NODEx_PATH = 'y'; // partial match

			const suggestions = await getSuggestions('env', 'Pat', { propertyName: 'Test', inputValue: '' });
			const values = suggestions.map((s) => s.value);

			expect(values.indexOf('PathLib')).to.be.lessThan(values.indexOf('PATH'));
			expect(values.indexOf('PATH')).to.be.lessThan(values.indexOf('NODEx_PATH'));
		});

		test('ranks startsWith (case-insensitive) before includes (case-insensitive)', async () => {
			process.env.MyPath = 'foo'; // startsWith (case-insensitive)
			process.env.FooMyPath = 'bar'; // includes

			const suggestions = await getSuggestions('env', 'myp', { propertyName: 'Test', inputValue: '' });
			const values = suggestions.map((s) => s.value);

			expect(values.indexOf('MyPath')).to.be.lessThan(values.indexOf('FooMyPath'));
		});
	});

	suite('filterSuggestionsByWord()', () => {
		const allSuggestions: Suggestion[] = [
			{ value: 'camel.main.name', description: 'MyCoolCamel', group: 'application.properties' },
			{ value: 'camel.jbang.health', description: 'true', group: 'application-dev.properties' },
			{ value: 'camel.route-controller.enabled', description: 'true', group: 'application.properties' },
			{ value: 'quarkus.camel.runtime-catalog.components', description: 'false', group: 'application-dev.properties' },
			{ value: 'quarkus.native.resources.includes', description: 'mysimple.txt', group: 'application.properties' },
			{ value: 'camel.quarkus-test.dummy', description: 'true', group: 'application-prod.properties' },
		];

		test('should return exact prefix match first (case-sensitive)', () => {
			const results = filterSuggestionsByWord(allSuggestions, 'camel.main');
			expect(results.length).to.be.greaterThan(0);
			expect(results[0].value).to.equal('camel.main.name');
		});

		test('should return case-insensitive prefix matches next', () => {
			const results = filterSuggestionsByWord(allSuggestions, 'CAMEL.JBANG');
			expect(results.length).to.be.greaterThan(0);
			expect(results[0].value).to.equal('camel.jbang.health');
		});

		test('should return substring matches (case-sensitive)', () => {
			const results = filterSuggestionsByWord(allSuggestions, 'route-controller');
			expect(results[0].value).to.equal('camel.route-controller.enabled');
		});

		test('should return substring matches (case-insensitive)', () => {
			const results = filterSuggestionsByWord(allSuggestions, 'components');
			expect(results[0].value).to.equal('quarkus.camel.runtime-catalog.components');
		});

		test('should return empty array if no match', () => {
			const results = filterSuggestionsByWord(allSuggestions, 'unmatched');
			expect(results).to.deep.equal([]);
		});

		test('should sort matches by rank and then alphabetically', () => {
			const results = filterSuggestionsByWord(allSuggestions, 'camel');
			const values = results.map((s) => s.value);
			expect(values).to.deep.equal([
				'camel.jbang.health',
				'camel.main.name',
				'camel.quarkus-test.dummy',
				'camel.route-controller.enabled',
				'quarkus.camel.runtime-catalog.components',
			]);
		});
	});

	suite('get Suggestions for application*.properties files', function () {
		let standaloneFile: string;
		let mavenFile: string;
		let mavenTestFile: string;

		setup(async () => {
			standaloneFile = path.resolve(__dirname, '../../../../../test Fixture with speci@l chars', 'suggestions', 'route.camel.yaml');
			mavenFile = path.resolve(
				__dirname,
				'../../../../../test Fixture with speci@l chars',
				'camel-maven-main-project',
				'src/main/resources/camel',
				'my-camel-main-route.camel.yaml',
			);
			mavenTestFile = path.resolve(
				__dirname,
				'../../../../../test Fixture with speci@l chars',
				'camel-maven-main-project',
				'src/test/resources',
				'test.camel.yaml',
			);
		});

		teardown(() => {});

		test('should get properties from all .properties files', async () => {
			const suggestions = await getSuggestions('properties', '', { propertyName: 'Property', inputValue: '' }, standaloneFile);
			expect(suggestions.length).is.greaterThan(20);

			const groups = suggestions.map((s) => s.group);
			expect(groups).to.include.members(['application.properties', 'application-dev.properties', 'application-prod.properties']);
		});

		test(`should get all properties for 'Quarkus' word with their values, in right order, from all .properties files`, async () => {
			const suggestions = await getSuggestions('properties', 'Quarkus', { propertyName: 'Property', inputValue: '' }, standaloneFile);
			expect(suggestions.length).to.equal(3);

			const values = suggestions.map((s) => s.value);
			expect(values.indexOf('quarkus.camel.runtime-catalog.components')).to.be.lessThan(values.indexOf('quarkus.native.resources.includes'));
			expect(values.indexOf('quarkus.native.resources.includes')).to.be.lessThan(values.indexOf('camel.quarkus-test.dummy'));

			const descriptions = suggestions.map((s) => s.description);
			expect(descriptions.at(0)).to.equals('false');
			expect(descriptions.at(1)).to.equals('mysimple.txt');
			expect(descriptions.at(2)).to.equals('true');

			const groups = suggestions.map((s) => s.group);
			expect(groups).to.deep.include.members(['application-dev.properties', 'application.properties', 'application-prod.properties']);
		});

		test('should get properties for maven structure project file', async () => {
			const suggestions = await getSuggestions('properties', '', { propertyName: 'Property', inputValue: '' }, mavenFile);
			expect(suggestions.length).to.equal(1);
			expect(suggestions[0].value).equals('camel.main.basePackageScan');
			expect(suggestions[0].description).equals('org.example.project.mycamelmainroute');
			expect(suggestions[0].group).equals('application.properties');
		});

		test('should get properties for maven structure project TEST file', async () => {
			const suggestions = await getSuggestions('properties', '', { propertyName: 'Property', inputValue: '' }, mavenTestFile);
			expect(suggestions.length).to.equal(1);
			expect(suggestions[0].value).equals('test');
			expect(suggestions[0].description).equals('This is a test file');
			expect(suggestions[0].group).equals('application-dev.properties');
		});

		test(`should return exact prefix matches before substring matches`, async () => {
			const suggestions = await getSuggestions('properties', 'camel.route', { propertyName: 'Property', inputValue: '' }, standaloneFile);
			expect(suggestions.length).to.be.greaterThan(0);

			// top suggestion should be exact prefix
			expect(suggestions[0].value.startsWith('camel.route')).to.be.true;
		});

		test(`should return case-insensitive prefix matches`, async () => {
			const suggestions = await getSuggestions('properties', 'CAMEL.MAIN', { propertyName: 'Property', inputValue: '' }, standaloneFile);
			expect(suggestions.length).to.be.greaterThan(0);

			const values = suggestions.map((s) => s.value.toLowerCase());
			expect(values.some((v) => v.startsWith('camel.main'))).to.be.true;
		});

		test(`should return substring matches when no prefix matches`, async () => {
			const suggestions = await getSuggestions('properties', 'includes', { propertyName: 'Property', inputValue: '' }, standaloneFile);
			expect(suggestions.length).to.equal(1);
			expect(suggestions[0].value).to.equal('quarkus.native.resources.includes');
		});

		test(`should return empty array when no match is found`, async () => {
			const suggestions = await getSuggestions('properties', 'foobar', { propertyName: 'Property', inputValue: '' }, standaloneFile);
			expect(suggestions.length).to.equal(0);
		});
	});
});
