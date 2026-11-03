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
import { expect } from 'chai';
import * as vscode from 'vscode';
import { CAMEL_LSP_DOCUMENT_SELECTORS, isCamelLspDocument } from '../../lsp/CamelLspDocumentFilter';

suite('CamelLspDocumentFilter', () => {
	test('should define document selectors for Camel YAML files', () => {
		const yamlSelectors = CAMEL_LSP_DOCUMENT_SELECTORS.filter((s) => s.language === 'yaml');
		expect(yamlSelectors.length).to.be.greaterThan(0);

		const patterns = yamlSelectors.map((s) => s.pattern);
		expect(patterns).to.include('**/*.camel.{yaml,yml}');
		expect(patterns).to.include('**/*.kamelet.{yaml,yml}');
	});

	test('should define document selectors for Camel XML files', () => {
		const xmlSelectors = CAMEL_LSP_DOCUMENT_SELECTORS.filter((s) => s.language === 'xml');
		expect(xmlSelectors.length).to.be.greaterThan(0);

		const patterns = xmlSelectors.map((s) => s.pattern);
		expect(patterns).to.include('**/*.camel.xml');
	});

	test('should define document selectors for properties files', () => {
		const propsSelectors = CAMEL_LSP_DOCUMENT_SELECTORS.filter((s) => s.language === 'properties');
		expect(propsSelectors.length).to.be.greaterThan(0);

		const patterns = propsSelectors.map((s) => s.pattern);
		expect(patterns).to.include('**/application*.properties');
	});

	test('should NOT include broad yaml/xml selectors (non-Camel files)', () => {
		const broadYaml = CAMEL_LSP_DOCUMENT_SELECTORS.filter((s) => s.language === 'yaml' && (!s.pattern || s.pattern === '**/*.yaml'));
		expect(broadYaml).to.have.lengthOf(0);

		const broadXml = CAMEL_LSP_DOCUMENT_SELECTORS.filter((s) => s.language === 'xml' && (!s.pattern || s.pattern === '**/*.xml'));
		expect(broadXml).to.have.lengthOf(0);
	});

	suite('isCamelLspDocument', () => {
		const openFixtureDocument = (...pathSegments: string[]): Thenable<vscode.TextDocument> => {
			const fixtureFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
			if (!fixtureFolder) {
				throw new Error('No workspace folder available for testing');
			}
			return vscode.workspace.openTextDocument(vscode.Uri.joinPath(fixtureFolder, ...pathSegments));
		};

		// a document with a path and a language, without a file in the fixture
		const documentWithLanguage = (filePath: string, languageId: string) =>
			({ uri: vscode.Uri.file(filePath), languageId }) as unknown as vscode.TextDocument;

		test('should serve a Camel route', async () => {
			const route = await openFixtureDocument('suggestions', 'route.camel.yaml');

			expect(isCamelLspDocument(route)).to.be.true;
		});

		test('should serve application properties', async () => {
			const properties = await openFixtureDocument('suggestions', 'application.properties');

			expect(isCamelLspDocument(properties)).to.be.true;
		});

		test('should not serve Pipes', () => {
			expect(isCamelLspDocument(documentWithLanguage('/project/my.pipe.yaml', 'yaml'))).to.be.false;
			expect(isCamelLspDocument(documentWithLanguage('/project/my-pipe.yaml', 'yaml'))).to.be.false;
		});

		test('should not serve other properties files', () => {
			expect(isCamelLspDocument(documentWithLanguage('/project/src/main/resources/messages.properties', 'properties'))).to.be.false;
		});

		test('should not serve other XML files', async () => {
			const pom = await openFixtureDocument('camel-maven-main-project', 'pom.xml');

			expect(isCamelLspDocument(pom)).to.be.false;
		});
	});
});
