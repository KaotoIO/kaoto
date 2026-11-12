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
import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { DataMapperMetadataEntry, KaotoMetadataExportService, RouteReferences } from '../../services/KaotoMetadataExportService';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';

suite('KaotoMetadataExportService', () => {
	suite('collectRouteReferencesFromContent', () => {
		test('extracts step IDs and xslt references from YAML with DataMapper step', () => {
			const yaml = `
- route:
    from:
      uri: direct:start
      steps:
        - step:
            id: kaoto-datamapper-12345678
            steps:
              - to:
                  id: kaoto-datamapper-xslt-9999
                  uri: xslt-saxon:mappings/transform.xsl
`;
			const refs = KaotoMetadataExportService.collectRouteReferencesFromContent(yaml);
			expect(refs.stepIds.has('kaoto-datamapper-12345678')).to.be.true;
			expect(refs.stepIds.has('kaoto-datamapper-xslt-9999')).to.be.true;
		});

		test('extracts multiple step IDs from YAML steps', () => {
			const yaml = `
- route:
    from:
      uri: direct:start
      steps:
        - step:
            id: step-one
        - step:
            id: step-two
`;
			const refs = KaotoMetadataExportService.collectRouteReferencesFromContent(yaml);
			expect(Array.from(refs.stepIds)).to.have.members(['step-one', 'step-two']);
		});

		test('keeps the whole XML step ID, including punctuation', () => {
			// A truncated ID would not match its .kaoto key, and the entry would be dropped silently.
			const xml = [
				'<routes xmlns="http://camel.apache.org/schema/spring">',
				"    <route id='order.mapping'>",
				'        <step id="step:1"/>',
				'    </route>',
				'</routes>',
			].join('\n');

			const refs = KaotoMetadataExportService.collectRouteReferencesFromContent(xml);
			expect(Array.from(refs.stepIds)).to.have.members(['order.mapping', 'step:1']);

			const metadata: Record<string, DataMapperMetadataEntry> = { 'order.mapping': { xsltPath: 'a.xsl' } };
			expect(Object.keys(KaotoMetadataExportService.filterMetadata(metadata, refs))).to.deep.equal(['order.mapping']);
		});

		test('ignores step IDs of commented out and escaped XML sections', () => {
			const xml = [
				'<routes xmlns="http://camel.apache.org/schema/spring">',
				'    <route id="live-route">',
				'        <!-- <step id="commented-step"/> -->',
				'        <log message="&lt;step id=&quot;x&quot;/&gt;"/>',
				'        <to><![CDATA[<step id="cdata-step"/>]]></to>',
				'    </route>',
				'</routes>',
			].join('\n');

			const refs = KaotoMetadataExportService.collectRouteReferencesFromContent(xml);
			expect(refs.stepIds.has('live-route')).to.be.true;
			expect(refs.stepIds.has('commented-step'), 'a commented out step must not keep its metadata alive').to.be.false;
			expect(refs.stepIds.has('cdata-step'), 'escaped content is data, not a step').to.be.false;
		});

		test('extracts step IDs and XSLT references from XML DSL content', () => {
			const xml = `
<routes xmlns="http://camel.apache.org/schema/spring">
    <route id="route-xml">
        <from uri="direct:start"/>
        <step id="datamapper-step-xml">
            <to uri="xslt-saxon:mappings/transform.xsl"/>
        </step>
    </route>
</routes>
`;
			const refs = KaotoMetadataExportService.collectRouteReferencesFromContent(xml);
			expect(refs.stepIds.has('route-xml')).to.be.true;
			expect(refs.stepIds.has('datamapper-step-xml')).to.be.true;
		});

		test('extracts references from multi-document YAML with "---"', () => {
			const multiDocYaml = [
				'- route:',
				'    id: route-doc-1',
				'    from:',
				'      uri: direct:start',
				'      steps:',
				'        - step:',
				'            id: step-in-doc-1',
				'            steps:',
				'              - to:',
				'                  uri: xslt-saxon:mappings/transform-1.xsl',
				'---',
				'- route:',
				'    id: route-doc-2',
				'    from:',
				'      uri: direct:second',
				'      steps:',
				'        - step:',
				'            id: step-in-doc-2',
				'            steps:',
				'              - to:',
				'                  uri: xslt:mappings/transform-2.xsl',
			].join('\n');
			const refs = KaotoMetadataExportService.collectRouteReferencesFromContent(multiDocYaml);
			expect(refs.stepIds.has('route-doc-1')).to.be.true;
			expect(refs.stepIds.has('step-in-doc-1')).to.be.true;
			expect(refs.stepIds.has('route-doc-2')).to.be.true;
			expect(refs.stepIds.has('step-in-doc-2')).to.be.true;
		});
	});

	suite('extractReferencedFilesFromEntry', () => {
		test('extracts xsltPath, sourceBody, targetBody, and sourceParameters file paths', () => {
			const entry: DataMapperMetadataEntry = {
				xsltPath: 'mappings/transform.xsl',
				sourceBody: {
					filePath: ['schemas/input1.xsd', 'schemas/input2.xsd'],
				},
				targetBody: {
					filePath: ['schemas/output.json'],
				},
				sourceParameters: {
					headerParam: {
						filePath: ['schemas/header.xsd'],
					},
					emptyParam: {
						filePath: [],
					},
				},
			};

			const files = KaotoMetadataExportService.extractReferencedFilesFromEntry(entry);
			expect(files).to.have.members(['mappings/transform.xsl', 'schemas/input1.xsd', 'schemas/input2.xsd', 'schemas/output.json', 'schemas/header.xsd']);
		});

		test('handles entry with missing or empty fields', () => {
			const entry: DataMapperMetadataEntry = {};
			const files = KaotoMetadataExportService.extractReferencedFilesFromEntry(entry);
			expect(files).to.be.empty;
		});
	});

	suite('filterMetadata', () => {
		test('keeps only the entries whose key is a step ID of the exported routes', () => {
			const sourceMetadata: Record<string, DataMapperMetadataEntry> = {
				'step-a': { xsltPath: 'a.xsl' },
				'step-b': { xsltPath: 'b.xsl' },
				'step-c': { xsltPath: 'c.xsl' },
			};
			const refs: RouteReferences = { stepIds: new Set(['step-a', 'step-c']) };

			const filtered = KaotoMetadataExportService.filterMetadata(sourceMetadata, refs);
			expect(Object.keys(filtered)).to.have.members(['step-a', 'step-c']);
			expect(filtered['step-b']).to.be.undefined;
		});

		test('drops an entry whose key is no step ID even when its XSLT file is the one the route uses', () => {
			// The DataMapper reads metadata by step ID, so an entry keyed by anything else could not be
			// read in the exported project. Matching it by its XSLT file would only carry dead entries
			// over, and a shared file name would carry entries of routes outside the export.
			const sourceMetadata: Record<string, DataMapperMetadataEntry> = {
				'exported-step': { xsltPath: 'mappings/transform.xsl' },
				'orphan-entry': { xsltPath: 'mappings/transform.xsl' },
			};
			const refs: RouteReferences = { stepIds: new Set(['exported-step']) };

			const filtered = KaotoMetadataExportService.filterMetadata(sourceMetadata, refs);
			expect(Object.keys(filtered)).to.deep.equal(['exported-step']);
		});

		test('returns an empty object when no key matches', () => {
			const sourceMetadata: Record<string, DataMapperMetadataEntry> = { 'step-a': { xsltPath: 'a.xsl' } };
			const refs: RouteReferences = { stepIds: new Set(['other-step']) };

			expect(KaotoMetadataExportService.filterMetadata(sourceMetadata, refs)).to.be.empty;
		});
	});

	suite('collectSourceRouteUris', () => {
		test('returns route files in a stable order regardless of scan timing', async () => {
			const scanDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-meta-scan-'));
			try {
				// Sibling folders are scanned in parallel, so only an explicit order makes the result
				// reproducible — the resource resolution keeps the first match when references clash.
				for (const folder of ['c', 'a', 'b']) {
					fs.mkdirSync(path.join(scanDir, folder), { recursive: true });
					fs.writeFileSync(path.join(scanDir, folder, 'route.camel.yaml'), '- route:\n    from: direct:start\n');
				}
				fs.mkdirSync(path.join(scanDir, 'a', 'nested'), { recursive: true });
				fs.writeFileSync(path.join(scanDir, 'a', 'nested', 'route.camel.yaml'), '- route:\n    from: direct:nested\n');

				const found = await KaotoMetadataExportService.collectSourceRouteUris(vscode.Uri.file(scanDir));
				const relative = found.map((uri) => path.relative(scanDir, uri.fsPath).replaceAll('\\', '/'));

				expect(relative).to.deep.equal([...relative].sort());
				expect(relative).to.deep.equal(['a/nested/route.camel.yaml', 'a/route.camel.yaml', 'b/route.camel.yaml', 'c/route.camel.yaml']);
			} finally {
				fs.rmSync(scanDir, { recursive: true, force: true });
			}
		});
	});

	suite('copyMetadataAndResources end-to-end', () => {
		let tempSourceDir: string;
		let tempOutputDir: string;
		let warningMessages: string[];
		let originalShowWarningMessage: typeof vscode.window.showWarningMessage;

		setup(() => {
			tempSourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-meta-src-'));
			tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-meta-out-'));
			// Stand in for what Camel JBang leaves behind: the exported routes under the classpath root.
			// The metadata export runs after it and does nothing when the target holds no route at all.
			fs.mkdirSync(path.join(tempOutputDir, 'src', 'main', 'resources', 'camel'), { recursive: true });
			fs.writeFileSync(path.join(tempOutputDir, 'src', 'main', 'resources', 'camel', 'exported.camel.yaml'), '- route:\n    from: direct:exported\n');
			warningMessages = [];
			originalShowWarningMessage = vscode.window.showWarningMessage;
			(vscode.window as { showWarningMessage: unknown }).showWarningMessage = async (msg: string) => {
				warningMessages.push(msg);
				return undefined;
			};
		});

		teardown(() => {
			(vscode.window as { showWarningMessage: unknown }).showWarningMessage = originalShowWarningMessage;
			fs.rmSync(tempSourceDir, { recursive: true, force: true });
			fs.rmSync(tempOutputDir, { recursive: true, force: true });
		});

		test('copies relevant schemas, XSLT files, sourceParameters and creates filtered .kaoto file', async () => {
			const routeAYaml = `
- route:
    from:
      uri: direct:start
      steps:
        - step:
            id: datamapper-route-a
            steps:
              - to:
                  uri: xslt-saxon:transform-a.xsl
`;
			const routeBYaml = `
- route:
    from:
      uri: direct:other
      steps:
        - step:
            id: datamapper-route-b
            steps:
              - to:
                  uri: xslt-saxon:transform-b.xsl
`;
			fs.mkdirSync(path.join(tempSourceDir, 'schemas', 'nested'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'mappings'), { recursive: true });

			const routeAPath = path.join(tempSourceDir, 'routeA.camel.yaml');
			const routeBPath = path.join(tempSourceDir, 'routeB.camel.yaml');
			fs.writeFileSync(routeAPath, routeAYaml);
			fs.writeFileSync(routeBPath, routeBYaml);

			// Schema, XSLT, and parameter files
			const schemaAPath = path.join(tempSourceDir, 'schemas', 'nested', 'order.xsd');
			const schemaParamPath = path.join(tempSourceDir, 'schemas', 'header.json');
			const schemaBPath = path.join(tempSourceDir, 'schemas', 'customer.xsd');
			const xsltAPath = path.join(tempSourceDir, 'mappings', 'transform-a.xsl');
			const xsltBPath = path.join(tempSourceDir, 'mappings', 'transform-b.xsl');

			fs.writeFileSync(schemaAPath, '<schema>Order</schema>');
			fs.writeFileSync(schemaParamPath, '{"type": "header"}');
			fs.writeFileSync(schemaBPath, '<schema>Customer</schema>');
			fs.writeFileSync(xsltAPath, '<xsl>Transform A</xsl>');
			fs.writeFileSync(xsltBPath, '<xsl>Transform B</xsl>');

			// .kaoto metadata in source directory
			const kaotoMetadata: Record<string, DataMapperMetadataEntry> = {
				'datamapper-route-a': {
					xsltPath: 'mappings/transform-a.xsl',
					sourceBody: {
						filePath: ['schemas/nested/order.xsd'],
					},
					targetBody: {
						filePath: [],
					},
					sourceParameters: {
						headerParam: {
							filePath: ['schemas/header.json'],
						},
					},
				},
				'datamapper-route-b': {
					xsltPath: 'mappings/transform-b.xsl',
					sourceBody: {
						filePath: ['schemas/customer.xsd'],
					},
				},
			};
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify(kaotoMetadata, null, 2));

			// Export only Route A
			const sourceUri = vscode.Uri.file(routeAPath);
			const outputFolder = vscode.Uri.file(tempOutputDir);

			await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

			// 1. Verify .kaoto is created in output folder with only Route A
			const destKaotoPath = path.join(tempOutputDir, '.kaoto');
			expect(fs.existsSync(destKaotoPath)).to.be.true;

			const destKaotoContent = JSON.parse(fs.readFileSync(destKaotoPath, 'utf-8'));
			expect(Object.keys(destKaotoContent)).to.deep.equal(['datamapper-route-a']);
			expect(destKaotoContent['datamapper-route-b']).to.be.undefined;
			expect(destKaotoContent['datamapper-route-a'].sourceParameters.headerParam.filePath).to.deep.equal(['schemas/header.json']);

			// 2. Verify schema A, param schema, and XSLT A are copied to src/main/resources
			const destSchemaA = path.join(tempOutputDir, 'src', 'main', 'resources', 'schemas', 'nested', 'order.xsd');
			const destParamSchema = path.join(tempOutputDir, 'src', 'main', 'resources', 'schemas', 'header.json');
			const destXsltA = path.join(tempOutputDir, 'src', 'main', 'resources', 'mappings', 'transform-a.xsl');
			expect(fs.existsSync(destSchemaA)).to.be.true;
			expect(fs.readFileSync(destSchemaA, 'utf-8')).to.equal('<schema>Order</schema>');
			expect(fs.existsSync(destParamSchema)).to.be.true;
			expect(fs.readFileSync(destParamSchema, 'utf-8')).to.equal('{"type": "header"}');
			expect(fs.existsSync(destXsltA)).to.be.true;
			expect(fs.readFileSync(destXsltA, 'utf-8')).to.equal('<xsl>Transform A</xsl>');

			// 3. Verify schema B and XSLT B are NOT copied
			const destSchemaB = path.join(tempOutputDir, 'src', 'main', 'resources', 'schemas', 'customer.xsd');
			const destXsltB = path.join(tempOutputDir, 'src', 'main', 'resources', 'mappings', 'transform-b.xsl');
			expect(fs.existsSync(destSchemaB)).to.be.false;
			expect(fs.existsSync(destXsltB)).to.be.false;
		});

		test('prevents path traversal attempts from writing files outside src/main/resources', async () => {
			const routeYaml = `
- route:
    from:
      uri: direct:start
      steps:
        - step:
            id: malicious-step
`;
			const routePath = path.join(tempSourceDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, routeYaml);

			const kaotoMetadata: Record<string, DataMapperMetadataEntry> = {
				'malicious-step': {
					sourceBody: {
						filePath: ['../../../../../../../../tmp/evil.txt', 'schemas/../../evil2.txt'],
					},
				},
			};
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify(kaotoMetadata, null, 2));

			const sourceUri = vscode.Uri.file(routePath);
			const outputFolder = vscode.Uri.file(tempOutputDir);

			await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

			// Files should not be written outside src/main/resources
			const outsideTarget = path.join(tempOutputDir, 'evil2.txt');
			expect(fs.existsSync(outsideTarget)).to.be.false;
		});

		test('shows warning message when referenced source files are missing', async () => {
			const routeYaml = `
- route:
    from:
      uri: direct:start
      steps:
        - step:
            id: missing-files-step
`;
			const routePath = path.join(tempSourceDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, routeYaml);

			const kaotoMetadata: Record<string, DataMapperMetadataEntry> = {
				'missing-files-step': {
					xsltPath: 'non-existing-mapping.xsl',
					sourceBody: {
						filePath: ['schemas/missing.xsd'],
					},
				},
			};
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify(kaotoMetadata, null, 2));

			const sourceUri = vscode.Uri.file(routePath);
			const outputFolder = vscode.Uri.file(tempOutputDir);

			await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

			expect(warningMessages).to.have.lengthOf(1);
			expect(warningMessages[0]).to.include('non-existing-mapping.xsl');
			expect(warningMessages[0]).to.include('schemas/missing.xsd');
		});
		test('does not overwrite the source .kaoto file when exporting into the same folder', async () => {
			const routeYaml = `
- route:
    from:
      uri: direct:start
      steps:
        - step:
            id: datamapper-route-a
`;
			const routePath = path.join(tempSourceDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, routeYaml);
			// In-place export: the exported copy of the route lands in the source project itself.
			fs.mkdirSync(path.join(tempSourceDir, 'src', 'main', 'resources', 'camel'), { recursive: true });
			fs.writeFileSync(path.join(tempSourceDir, 'src', 'main', 'resources', 'camel', 'route.camel.yaml'), routeYaml);

			// The source .kaoto also holds an entry of a route that is not part of the export
			const kaotoPath = path.join(tempSourceDir, '.kaoto');
			const originalKaoto = JSON.stringify(
				{
					'datamapper-route-a': { xsltPath: './mappings/transform-a.xsl' },
					'datamapper-route-b': { xsltPath: 'mappings/transform-b.xsl' },
				},
				null,
				2,
			);
			fs.writeFileSync(kaotoPath, originalKaoto);

			// Output folder is the folder of the source project
			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempSourceDir));

			expect(fs.readFileSync(kaotoPath, 'utf-8')).to.equal(originalKaoto);
		});

		test('filters metadata for directory export by scanning all routes and ignoring target/node_modules', async () => {
			fs.mkdirSync(path.join(tempSourceDir, 'src', 'routes'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'target'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'mappings'), { recursive: true });

			const activeRoutePath = path.join(tempSourceDir, 'src', 'routes', 'route.camel.yaml');
			fs.writeFileSync(activeRoutePath, '- route:\n    from: direct:start\n    steps:\n      - step:\n          id: active-step\n');

			// Put an unrelated route in target/ which should be ignored
			const ignoredRoutePath = path.join(tempSourceDir, 'target', 'ignored.camel.yaml');
			fs.writeFileSync(ignoredRoutePath, '- route:\n    from: direct:ignored\n    steps:\n      - step:\n          id: target-step\n');

			const xsltPath = path.join(tempSourceDir, 'mappings', 'transform.xsl');
			fs.writeFileSync(xsltPath, '<xsl>Transform</xsl>');

			const kaotoMetadata: Record<string, DataMapperMetadataEntry> = {
				'active-step': {
					xsltPath: 'mappings/transform.xsl',
				},
				'target-step': {
					xsltPath: 'mappings/ignored.xsl',
				},
			};
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify(kaotoMetadata, null, 2));

			// Export directory
			const sourceUri = vscode.Uri.file(tempSourceDir);
			const outputFolder = vscode.Uri.file(tempOutputDir);

			await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

			const destKaotoPath = path.join(tempOutputDir, '.kaoto');
			expect(fs.existsSync(destKaotoPath)).to.be.true;

			const destKaotoContent = JSON.parse(fs.readFileSync(destKaotoPath, 'utf-8'));
			expect(destKaotoContent['active-step']).to.not.be.undefined;
			expect(destKaotoContent['target-step']).to.be.undefined;
		});

		test('handles multi-document YAML and ignores invalid YAML files in directory export', async () => {
			fs.mkdirSync(path.join(tempSourceDir, 'src', 'routes'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'mappings'), { recursive: true });

			// Multi-document YAML route file
			const multiDocRoutePath = path.join(tempSourceDir, 'src', 'routes', 'multidoc.camel.yaml');
			fs.writeFileSync(
				multiDocRoutePath,
				[
					'- route:',
					'    from: direct:one',
					'    steps:',
					'      - step:',
					'          id: multi-step-1',
					'---',
					'- route:',
					'    from: direct:two',
					'    steps:',
					'      - step:',
					'          id: multi-step-2',
				].join('\n'),
			);

			// Invalid YAML file in the directory (e.g. broken or unparsable)
			const invalidYamlPath = path.join(tempSourceDir, 'src', 'routes', 'invalid.yaml');
			fs.writeFileSync(invalidYamlPath, ':\n  invalid: [unclosed');

			const xsltPath1 = path.join(tempSourceDir, 'mappings', 'transform1.xsl');
			const xsltPath2 = path.join(tempSourceDir, 'mappings', 'transform2.xsl');
			fs.writeFileSync(xsltPath1, '<xsl>1</xsl>');
			fs.writeFileSync(xsltPath2, '<xsl>2</xsl>');

			const kaotoMetadata: Record<string, DataMapperMetadataEntry> = {
				'multi-step-1': { xsltPath: 'mappings/transform1.xsl' },
				'multi-step-2': { xsltPath: 'mappings/transform2.xsl' },
			};
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify(kaotoMetadata, null, 2));

			const sourceUri = vscode.Uri.file(tempSourceDir);
			const outputFolder = vscode.Uri.file(tempOutputDir);

			await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

			const destKaotoPath = path.join(tempOutputDir, '.kaoto');
			expect(fs.existsSync(destKaotoPath)).to.be.true;

			const destKaotoContent = JSON.parse(fs.readFileSync(destKaotoPath, 'utf-8'));
			expect(destKaotoContent['multi-step-1']).to.not.be.undefined;
			expect(destKaotoContent['multi-step-2']).to.not.be.undefined;
		});

		test('handles Windows-style backslash paths in .kaoto metadata file', async () => {
			fs.mkdirSync(path.join(tempSourceDir, 'mappings'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'schemas'), { recursive: true });

			const routePath = path.join(tempSourceDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from: direct:win\n    steps:\n      - step:\n          id: win-step\n');

			const xsltPath = path.join(tempSourceDir, 'mappings', 'win-transform.xsl');
			const schemaPath = path.join(tempSourceDir, 'schemas', 'win-order.xsd');
			fs.writeFileSync(xsltPath, '<xsl>Windows</xsl>');
			fs.writeFileSync(schemaPath, '<schema>Windows</schema>');

			// Metadata containing Windows-style backslash paths
			const kaotoMetadata: Record<string, DataMapperMetadataEntry> = {
				'win-step': {
					xsltPath: 'mappings\\win-transform.xsl',
					sourceBody: {
						filePath: ['schemas\\win-order.xsd'],
					},
				},
			};
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify(kaotoMetadata, null, 2));

			const sourceUri = vscode.Uri.file(routePath);
			const outputFolder = vscode.Uri.file(tempOutputDir);

			await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

			// Check files copied
			const destXsltPath = path.join(tempOutputDir, 'src', 'main', 'resources', 'mappings', 'win-transform.xsl');
			const destSchemaPath = path.join(tempOutputDir, 'src', 'main', 'resources', 'schemas', 'win-order.xsd');
			expect(fs.existsSync(destXsltPath)).to.be.true;
			expect(fs.existsSync(destSchemaPath)).to.be.true;

			// Check normalized paths in resulting .kaoto
			const destKaotoPath = path.join(tempOutputDir, '.kaoto');
			const destKaotoContent = JSON.parse(fs.readFileSync(destKaotoPath, 'utf-8'));
			expect(destKaotoContent['win-step'].xsltPath).to.equal('mappings/win-transform.xsl');
			expect(destKaotoContent['win-step'].sourceBody.filePath).to.deep.equal(['schemas/win-order.xsd']);
		});

		test('handles copy errors gracefully without failing export of other files', async () => {
			fs.mkdirSync(path.join(tempSourceDir, 'mappings'), { recursive: true });

			const routePath = path.join(tempSourceDir, 'route.camel.yaml');
			fs.writeFileSync(
				routePath,
				['- route:', '    from:', '      uri: direct:err', '      steps:', '        - step:', '            id: err-step'].join('\n'),
			);

			const xsltPath = path.join(tempSourceDir, 'mappings', 'err-transform.xsl');
			fs.writeFileSync(xsltPath, '<xsl>Err</xsl>');

			const kaotoMetadata: Record<string, DataMapperMetadataEntry> = {
				'err-step': {
					xsltPath: 'mappings/err-transform.xsl',
				},
			};
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify(kaotoMetadata, null, 2));

			// Create a file at the target directory path so that copying/directory creation fails
			fs.mkdirSync(path.join(tempOutputDir, 'src', 'main', 'resources'), { recursive: true });
			fs.writeFileSync(path.join(tempOutputDir, 'src', 'main', 'resources', 'mappings'), 'blocking file');

			const sourceUri = vscode.Uri.file(routePath);
			const outputFolder = vscode.Uri.file(tempOutputDir);

			await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

			// Warning was shown for the uncopied file
			expect(warningMessages).to.have.lengthOf(1);
			expect(warningMessages[0]).to.include('mappings/err-transform.xsl');

			// .kaoto file was still written
			const destKaotoPath = path.join(tempOutputDir, '.kaoto');
			expect(fs.existsSync(destKaotoPath)).to.be.true;
		});

		test('does not report a resource as failed when the export target is the source project spelled with a different path case', async function () {
			// vscode.workspace.fs.copy rejects copying a file onto itself when the paths differ only by case
			// (on case-insensitive file systems), so such a resource must be recognised as already being in place.
			const resourcesDir = path.join(tempSourceDir, 'src', 'main', 'resources');
			fs.mkdirSync(path.join(resourcesDir, 'schemas'), { recursive: true });
			const outputFolderWithOtherCase = path.join(path.dirname(tempSourceDir), path.basename(tempSourceDir).toUpperCase());
			if (!fs.existsSync(outputFolderWithOtherCase)) {
				this.skip(); // case-sensitive file system: the differently spelled folder is a different folder
			}

			const routePath = path.join(resourcesDir, 'route.camel.yaml');
			fs.writeFileSync(
				routePath,
				['- route:', '    from:', '      uri: direct:start', '      steps:', '        - step:', '            id: in-place-step'].join('\n'),
			);
			const schemaPath = path.join(resourcesDir, 'schemas', 'order.xsd');
			fs.writeFileSync(schemaPath, '<schema>Order</schema>');
			fs.writeFileSync(path.join(resourcesDir, '.kaoto'), JSON.stringify({ 'in-place-step': { sourceBody: { filePath: ['schemas/order.xsd'] } } }));

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(outputFolderWithOtherCase));

			expect(warningMessages).to.be.empty;
			expect(fs.readFileSync(schemaPath, 'utf-8')).to.equal('<schema>Order</schema>');
		});

		test('handles unreadable subfolder gracefully in directory export', async () => {
			fs.mkdirSync(path.join(tempSourceDir, 'src', 'routes'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'mappings'), { recursive: true });

			const routePath = path.join(tempSourceDir, 'src', 'routes', 'route.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from: direct:unreadable\n    steps:\n      - step:\n          id: unreadable-step\n');

			const xsltPath = path.join(tempSourceDir, 'mappings', 'transform.xsl');
			fs.writeFileSync(xsltPath, '<xsl>Content</xsl>');

			const kaotoMetadata: Record<string, DataMapperMetadataEntry> = {
				'unreadable-step': {
					xsltPath: 'mappings/transform.xsl',
				},
			};
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify(kaotoMetadata, null, 2));

			// Mock readDirectory to simulate failure when reading a specific subfolder
			const originalReadDir = vscode.workspace.fs.readDirectory;
			(vscode.workspace.fs as { readDirectory: unknown }).readDirectory = async (uri: vscode.Uri) => {
				if (uri.fsPath.includes('unreadable-subfolder')) {
					throw new Error('EACCES: permission denied');
				}
				return originalReadDir(uri);
			};

			try {
				// Create the subfolder on disk so it is discovered during parent scan
				fs.mkdirSync(path.join(tempSourceDir, 'src', 'unreadable-subfolder'), { recursive: true });

				const sourceUri = vscode.Uri.file(tempSourceDir);
				const outputFolder = vscode.Uri.file(tempOutputDir);

				await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

				const destKaotoPath = path.join(tempOutputDir, '.kaoto');
				expect(fs.existsSync(destKaotoPath)).to.be.true;

				const destKaotoContent = JSON.parse(fs.readFileSync(destKaotoPath, 'utf-8'));
				expect(destKaotoContent['unreadable-step']).to.not.be.undefined;
			} finally {
				(vscode.workspace.fs as { readDirectory: unknown }).readDirectory = originalReadDir;
			}
		});

		test('copies a schema referenced through a parent segment from a sibling folder', async () => {
			// The schema file picker produces paths relative to the .kaoto file, so a schema kept in a
			// sibling folder is referenced as "../shared/order.xsd" and must still be found.
			const routesDir = path.join(tempSourceDir, 'project', 'routes');
			const sharedDir = path.join(tempSourceDir, 'project', 'shared');
			fs.mkdirSync(routesDir, { recursive: true });
			fs.mkdirSync(sharedDir, { recursive: true });

			const routePath = path.join(routesDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from: direct:start\n    steps:\n      - step:\n          id: sibling-step\n');
			fs.writeFileSync(path.join(sharedDir, 'order.xsd'), '<schema>Order</schema>');
			fs.writeFileSync(path.join(routesDir, '.kaoto'), JSON.stringify({ 'sibling-step': { sourceBody: { filePath: ['../shared/order.xsd'] } } }));

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempOutputDir));

			expect(warningMessages).to.be.empty;
			const destSchema = path.join(tempOutputDir, 'src', 'main', 'resources', 'shared', 'order.xsd');
			expect(fs.existsSync(destSchema), 'schema referenced with ../ must be copied').to.be.true;
			expect(fs.readFileSync(destSchema, 'utf-8')).to.equal('<schema>Order</schema>');

			// The exported metadata points at the copied file, relative to the exported classpath root.
			const destKaoto = JSON.parse(fs.readFileSync(path.join(tempOutputDir, '.kaoto'), 'utf-8'));
			expect(destKaoto['sibling-step'].sourceBody.filePath).to.deep.equal(['shared/order.xsd']);
		});

		test('resolves a resource against the route that owns the metadata entry', async () => {
			// Two routes in separate classpath roots both hold a "mapping.xsl", but only route B owns the
			// DataMapper entry. Route A comes first in the directory scan and must not win.
			fs.mkdirSync(path.join(tempSourceDir, 'a'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'b'), { recursive: true });

			fs.writeFileSync(path.join(tempSourceDir, 'a', 'a.camel.yaml'), '- route:\n    from: direct:a\n    steps:\n      - step:\n          id: a-step\n');
			fs.writeFileSync(
				path.join(tempSourceDir, 'b', 'b.camel.yaml'),
				[
					'- route:',
					'    from: direct:b',
					'    steps:',
					'      - step:',
					'          id: b-step',
					'          steps:',
					'            - to:',
					'                uri: xslt-saxon:mapping.xsl',
				].join('\n'),
			);
			fs.writeFileSync(path.join(tempSourceDir, 'a', 'mapping.xsl'), '<xsl>A</xsl>');
			fs.writeFileSync(path.join(tempSourceDir, 'b', 'mapping.xsl'), '<xsl>B</xsl>');
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify({ 'b-step': { xsltPath: 'mapping.xsl' } }));

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(tempSourceDir), vscode.Uri.file(tempOutputDir));

			const destXslt = path.join(tempOutputDir, 'src', 'main', 'resources', 'mapping.xsl');
			expect(fs.existsSync(destXslt)).to.be.true;
			expect(fs.readFileSync(destXslt, 'utf-8'), "the owning route's stylesheet must be exported").to.equal('<xsl>B</xsl>');
			expect(warningMessages).to.be.empty;
		});

		test('warns when two owning routes map different files to the same destination', async () => {
			// Both routes own an entry for the same relative path but hold a different file, so only one
			// of them can reach the exported classpath root.
			fs.mkdirSync(path.join(tempSourceDir, 'a'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'b'), { recursive: true });

			const routeYaml = (id: string) =>
				[
					'- route:',
					`    from: direct:${id}`,
					'    steps:',
					'      - step:',
					`          id: ${id}`,
					'          steps:',
					'            - to:',
					'                uri: xslt-saxon:mapping.xsl',
				].join('\n');
			fs.writeFileSync(path.join(tempSourceDir, 'a', 'a.camel.yaml'), routeYaml('shared-step'));
			fs.writeFileSync(path.join(tempSourceDir, 'b', 'b.camel.yaml'), routeYaml('shared-step'));
			fs.writeFileSync(path.join(tempSourceDir, 'a', 'mapping.xsl'), '<xsl>A</xsl>');
			fs.writeFileSync(path.join(tempSourceDir, 'b', 'mapping.xsl'), '<xsl>B</xsl>');
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify({ 'shared-step': { xsltPath: 'mapping.xsl' } }));

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(tempSourceDir), vscode.Uri.file(tempOutputDir));

			expect(warningMessages.join(' ')).to.contain('resolves to several different files');
			expect(fs.existsSync(path.join(tempOutputDir, 'src', 'main', 'resources', 'mapping.xsl'))).to.be.true;
		});

		test('copies a schema referenced several levels above the route', async () => {
			const deepDir = path.join(tempSourceDir, 'a', 'b', 'c');
			fs.mkdirSync(deepDir, { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'schemas'), { recursive: true });
			fs.writeFileSync(path.join(tempSourceDir, 'schemas', 'order.xsd'), '<schema>Deep</schema>');

			const routePath = path.join(deepDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from: direct:start\n    steps:\n      - step:\n          id: deep-step\n');
			fs.writeFileSync(path.join(deepDir, '.kaoto'), JSON.stringify({ 'deep-step': { sourceBody: { filePath: ['../../../schemas/order.xsd'] } } }));

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempOutputDir));

			expect(warningMessages).to.be.empty;
			const destSchema = path.join(tempOutputDir, 'src', 'main', 'resources', 'schemas', 'order.xsd');
			expect(fs.readFileSync(destSchema, 'utf-8')).to.equal('<schema>Deep</schema>');

			// The parent segments are dropped so the entry points at the file inside the exported classpath root.
			const destKaoto = JSON.parse(fs.readFileSync(path.join(tempOutputDir, '.kaoto'), 'utf-8'));
			expect(destKaoto['deep-step'].sourceBody.filePath).to.deep.equal(['schemas/order.xsd']);
		});

		test('warns when two references are flattened onto the same exported file', async () => {
			// "../shared/x.xsd" and "shared/x.xsd" are different files but share a destination once the
			// parent segment is dropped, so the second one must not silently overwrite the first.
			const routesDir = path.join(tempSourceDir, 'project', 'routes');
			fs.mkdirSync(path.join(routesDir, 'shared'), { recursive: true });
			fs.mkdirSync(path.join(tempSourceDir, 'project', 'shared'), { recursive: true });
			fs.writeFileSync(path.join(tempSourceDir, 'project', 'shared', 'x.xsd'), '<schema>Outer</schema>');
			fs.writeFileSync(path.join(routesDir, 'shared', 'x.xsd'), '<schema>Inner</schema>');

			const routePath = path.join(routesDir, 'route.camel.yaml');
			fs.writeFileSync(
				routePath,
				'- route:\n    from: direct:start\n    steps:\n      - step:\n          id: outer-step\n      - step:\n          id: inner-step\n',
			);
			fs.writeFileSync(
				path.join(routesDir, '.kaoto'),
				JSON.stringify({
					'outer-step': { sourceBody: { filePath: ['../shared/x.xsd'] } },
					'inner-step': { sourceBody: { filePath: ['shared/x.xsd'] } },
				}),
			);

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempOutputDir));

			expect(warningMessages.join(' ')).to.contain('resolve to several different files');
			// The first claim wins, deterministically, instead of depending on which copy finished last.
			expect(fs.readFileSync(path.join(tempOutputDir, 'src', 'main', 'resources', 'shared', 'x.xsd'), 'utf-8')).to.equal('<schema>Outer</schema>');
		});

		test('does not reach outside the workspace folder for a referenced resource', async () => {
			// A folder of its own inside the workspace: the fixture root holds a .kaoto that other suites
			// rely on, so this test must not write there.
			const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
			const insideDir = fs.mkdtempSync(path.join(workspaceRoot, 'kaoto-meta-inside-'));
			const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-meta-outside-'));
			fs.writeFileSync(path.join(outsideDir, 'outside.xsd'), '<schema>Outside</schema>');
			const relToOutside = path.relative(insideDir, path.join(outsideDir, 'outside.xsd')).replaceAll('\\', '/');

			const routePath = path.join(insideDir, 'outside-ref.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from: direct:start\n    steps:\n      - step:\n          id: outside-step\n');
			fs.writeFileSync(path.join(insideDir, '.kaoto'), JSON.stringify({ 'outside-step': { sourceBody: { filePath: [relToOutside] } } }));

			try {
				await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempOutputDir));

				expect(warningMessages.join(' '), 'the reference must be reported as missing').to.contain('were not found and could not be copied');
				const exported = fs.readdirSync(path.join(tempOutputDir, 'src', 'main', 'resources'), { recursive: true, encoding: 'utf-8' });
				expect(
					exported.filter((name) => name.endsWith('outside.xsd')),
					'nothing may be copied from outside the workspace folder',
				).to.be.empty;
			} finally {
				fs.rmSync(insideDir, { recursive: true, force: true });
				fs.rmSync(outsideDir, { recursive: true, force: true });
			}
		});

		test('copies a file once when two entries spell the same path differently', async () => {
			// Seen in a real project: one entry stores the path relative to the workspace folder and
			// another relative to the .kaoto folder, so both denote the same file and the same
			// destination. Both spellings only resolve when a workspace folder is present, hence the
			// folders below live inside it — in directories of their own, never in the shared root.
			const workspaceRoot = vscode.workspace.workspaceFolders![0].uri.fsPath;
			const sharedDir = fs.mkdtempSync(path.join(workspaceRoot, 'kaoto-meta-shared-'));
			const projectDir = fs.mkdtempSync(path.join(workspaceRoot, 'kaoto-meta-project-'));
			const sharedName = path.basename(sharedDir);
			const routesDir = path.join(projectDir, 'folder2');
			fs.mkdirSync(routesDir, { recursive: true });
			fs.writeFileSync(path.join(sharedDir, 'Billing.xsd'), '<schema>Billing</schema>');

			const routePath = path.join(routesDir, 'test.camel.yaml');
			fs.writeFileSync(
				routePath,
				'- route:\n    from: direct:start\n    steps:\n      - step:\n          id: step-a\n      - step:\n          id: step-b\n',
			);
			fs.writeFileSync(
				path.join(routesDir, '.kaoto'),
				JSON.stringify({
					'step-a': { sourceBody: { filePath: [`../../${sharedName}/Billing.xsd`] } },
					'step-b': { sourceBody: { filePath: [`${sharedName}/Billing.xsd`] } },
				}),
			);

			const logged: string[] = [];
			const channel = KaotoOutputChannel.getInstance();
			const originalAppendLine = channel.appendLine;
			channel.appendLine = (value: string) => logged.push(value);

			try {
				await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempOutputDir));
			} finally {
				channel.appendLine = originalAppendLine;
				fs.rmSync(sharedDir, { recursive: true, force: true });
				fs.rmSync(projectDir, { recursive: true, force: true });
			}

			const destSchema = path.join(tempOutputDir, 'src', 'main', 'resources', sharedName, 'Billing.xsd');
			expect(
				logged.filter((line) => line.includes(`to ${destSchema}.`)),
				'the identical file must be copied once',
			).to.have.lengthOf(1);
			expect(fs.readFileSync(destSchema, 'utf-8')).to.equal('<schema>Billing</schema>');
			expect(warningMessages, 'the same file under two spellings is neither a clash nor a missing file').to.be.empty;

			// Both entries end up pointing at the single exported copy.
			const destKaoto = JSON.parse(fs.readFileSync(path.join(tempOutputDir, '.kaoto'), 'utf-8'));
			expect(destKaoto['step-a'].sourceBody.filePath).to.deep.equal([`${sharedName}/Billing.xsd`]);
			expect(destKaoto['step-b'].sourceBody.filePath).to.deep.equal([`${sharedName}/Billing.xsd`]);
		});

		test('keeps the entries already present in the .kaoto of the export target', async () => {
			const routePath = path.join(tempSourceDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from: direct:start\n    steps:\n      - step:\n          id: new-step\n');
			fs.writeFileSync(
				path.join(tempSourceDir, '.kaoto'),
				JSON.stringify({ 'new-step': { xsltPath: 'new.xsl' }, 'other-step': { xsltPath: 'other.xsl' } }),
			);
			fs.writeFileSync(path.join(tempSourceDir, 'new.xsl'), '<xsl>New</xsl>');

			// The target is already a Kaoto project, e.g. a second export into the same folder.
			fs.writeFileSync(path.join(tempOutputDir, '.kaoto'), JSON.stringify({ 'previously-exported-step': { xsltPath: 'previous.xsl' } }));

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempOutputDir));

			const destKaoto = JSON.parse(fs.readFileSync(path.join(tempOutputDir, '.kaoto'), 'utf-8'));
			expect(Object.keys(destKaoto).sort()).to.deep.equal(['new-step', 'previously-exported-step']);
			expect(destKaoto['other-step'], 'entries outside the export must not be carried over').to.be.undefined;
		});

		test('leaves an unreadable .kaoto in the export target untouched', async () => {
			const routePath = path.join(tempSourceDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from: direct:start\n    steps:\n      - step:\n          id: new-step\n');
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify({ 'new-step': { xsltPath: 'new.xsl' } }));
			fs.writeFileSync(path.join(tempSourceDir, 'new.xsl'), '<xsl>New</xsl>');

			const destKaotoPath = path.join(tempOutputDir, '.kaoto');
			fs.writeFileSync(destKaotoPath, '{ this is not json');

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempOutputDir));

			expect(fs.readFileSync(destKaotoPath, 'utf-8'), 'a file that cannot be parsed must not be replaced').to.equal('{ this is not json');
			expect(warningMessages.join(' ')).to.contain('could not be read');
		});

		test('does nothing when the export produced no route file', async () => {
			// Camel JBang reports success even when it exported nothing, e.g. for routes in subfolders
			// it does not scan. A .kaoto file and schemas would then belong to no route at all.
			fs.rmSync(path.join(tempOutputDir, 'src'), { recursive: true, force: true });

			const routePath = path.join(tempSourceDir, 'route.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from: direct:start\n    steps:\n      - step:\n          id: lonely-step\n');
			fs.writeFileSync(path.join(tempSourceDir, 'schema.xsd'), '<schema/>');
			fs.writeFileSync(path.join(tempSourceDir, '.kaoto'), JSON.stringify({ 'lonely-step': { sourceBody: { filePath: ['schema.xsd'] } } }));

			await KaotoMetadataExportService.copyMetadataAndResources(vscode.Uri.file(routePath), vscode.Uri.file(tempOutputDir));

			expect(fs.existsSync(path.join(tempOutputDir, '.kaoto')), 'no metadata without routes to attach it to').to.be.false;
			expect(fs.existsSync(path.join(tempOutputDir, 'src')), 'no schemas either').to.be.false;
		});

		test('does nothing when no .kaoto file exists', async () => {
			const routePath = path.join(tempSourceDir, 'standalone.camel.yaml');
			fs.writeFileSync(routePath, '- route:\n    from:\n      uri: timer:foo\n');

			const sourceUri = vscode.Uri.file(routePath);
			const outputFolder = vscode.Uri.file(tempOutputDir);

			await KaotoMetadataExportService.copyMetadataAndResources(sourceUri, outputFolder);

			const destKaotoPath = path.join(tempOutputDir, '.kaoto');
			expect(fs.existsSync(destKaotoPath)).to.be.false;
		});
	});
});
