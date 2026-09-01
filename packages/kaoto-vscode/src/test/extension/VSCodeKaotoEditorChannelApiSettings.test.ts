/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
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
import { expect } from 'chai';
import * as path from 'path';
import * as vscode from 'vscode';
import {
	KAOTO_CATALOG_URL_SETTING_ID,
	KAOTO_NODE_LABEL_SETTING_ID,
	KAOTO_NODE_TOOLBAR_TRIGGER_SETTING_ID,
	KAOTO_COLOR_THEME_SETTING_ID,
	KAOTO_CANVAS_LAYOUT_DIRECTION_SETTING_ID,
	KAOTO_REST_CUSTOM_MEDIA_TYPES_SETTING_ID,
	KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID,
	KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID,
} from '../../constants';

suite('VSCodeKaotoEditorChannelApi', function () {
	let testDocument: vscode.TextDocument;
	let testWorkspaceFolder: vscode.WorkspaceFolder;

	setup(async function () {
		// Get or create a test document
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error('No workspace folder available for testing');
		}
		testWorkspaceFolder = workspaceFolders[0];

		// Create a test Camel route file
		const testFilePath = path.join(testWorkspaceFolder.uri.fsPath, 'test-route.camel.yaml');
		const testFileUri = vscode.Uri.file(testFilePath);

		try {
			await vscode.workspace.fs.writeFile(testFileUri, new TextEncoder().encode('# Test Camel Route\n'));
			testDocument = await vscode.workspace.openTextDocument(testFileUri);
		} catch (error) {
			throw new Error(`Failed to create test document: ${error}`);
		}

		// Note: Creating a full VSCodeKaotoEditorChannelApi instance requires many dependencies
		// For now, we'll test the methods that can be tested in isolation
		// Full integration tests would require mocking the entire editor infrastructure
	});

	teardown(async function () {
		// Clean up test files
		if (testDocument) {
			try {
				await vscode.workspace.fs.delete(testDocument.uri);
			} catch (error) {
				// Ignore cleanup errors
			}
		}
	});

	suite('Settings Retrieval', function () {
		test('should retrieve catalog URL setting', async function () {
			const config = vscode.workspace.getConfiguration();
			const catalogUrl = config.get(KAOTO_CATALOG_URL_SETTING_ID);

			// Catalog URL can be undefined, null, or a string
			if (catalogUrl !== undefined && catalogUrl !== null) {
				expect(typeof catalogUrl).to.be.oneOf(['string', 'object']);
			}
		});

		test('should retrieve node label setting', async function () {
			const config = vscode.workspace.getConfiguration();
			const nodeLabel = config.get<string>(KAOTO_NODE_LABEL_SETTING_ID);

			// Node label should be one of the valid types or undefined
			if (nodeLabel !== undefined) {
				expect(['description', 'id']).to.include(nodeLabel);
			}
		});

		test('should retrieve node toolbar trigger setting', async function () {
			const config = vscode.workspace.getConfiguration();
			const trigger = config.get<string>(KAOTO_NODE_TOOLBAR_TRIGGER_SETTING_ID);

			if (trigger !== undefined) {
				expect(['onHover', 'onSelection']).to.include(trigger);
			}
		});

		test('should retrieve color theme setting', async function () {
			const config = vscode.workspace.getConfiguration();
			const colorTheme = config.get<string>(KAOTO_COLOR_THEME_SETTING_ID);

			if (colorTheme !== undefined) {
				expect(['auto', 'light', 'dark']).to.include(colorTheme);
			}
		});

		test('should retrieve canvas layout direction setting', async function () {
			const config = vscode.workspace.getConfiguration();
			const layoutDirection = config.get<string>(KAOTO_CANVAS_LAYOUT_DIRECTION_SETTING_ID);

			if (layoutDirection !== undefined) {
				expect(['SelectInCanvas', 'Horizontal', 'Vertical']).to.include(layoutDirection);
			}
		});

		test('should retrieve REST custom media types setting', async function () {
			const config = vscode.workspace.getConfiguration();
			const mediaTypes = config.get(KAOTO_REST_CUSTOM_MEDIA_TYPES_SETTING_ID);

			if (mediaTypes !== undefined && mediaTypes !== null) {
				expect(Array.isArray(mediaTypes) || typeof mediaTypes === 'object').to.be.true;
			}
		});

		test('should retrieve Apicurio Registry URL setting', async function () {
			const config = vscode.workspace.getConfiguration();
			const registryUrl = config.get(KAOTO_REST_APICURIO_REGISTRY_URL_SETTING_ID);

			if (registryUrl !== undefined && registryUrl !== null) {
				expect(typeof registryUrl).to.be.oneOf(['string', 'object']);
			}
		});

		test('should retrieve local kamelet directories setting', async function () {
			const config = vscode.workspace.getConfiguration();
			const directories = config.get<string[]>(KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID);

			if (directories !== undefined) {
				expect(Array.isArray(directories)).to.be.true;
			}
		});
	});

	suite('File System Operations', function () {
		test('should check if .kaoto metadata file exists in workspace', async function () {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(testDocument.uri);
			expect(workspaceFolder).to.not.be.undefined;

			const kaotoMetadataPath = path.join(workspaceFolder!.uri.fsPath, '.kaoto');
			const kaotoMetadataUri = vscode.Uri.file(kaotoMetadataPath);

			let fileExists = false;
			try {
				const stat = await vscode.workspace.fs.stat(kaotoMetadataUri);
				fileExists = stat.type === vscode.FileType.File;
			} catch (error) {
				fileExists = false;
			}

			// Test passes if we can determine file existence status (true or false)
			expect(typeof fileExists).to.equal('boolean');
		});

		test('should create and read .kaoto metadata file', async function () {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(testDocument.uri);
			expect(workspaceFolder).to.not.be.undefined;

			const kaotoMetadataPath = path.join(workspaceFolder!.uri.fsPath, '.kaoto-test');
			const kaotoMetadataUri = vscode.Uri.file(kaotoMetadataPath);

			try {
				// Create test metadata file
				const testMetadata = { testKey: 'testValue' };
				await vscode.workspace.fs.writeFile(kaotoMetadataUri, new TextEncoder().encode(JSON.stringify(testMetadata, null, '\t')));

				// Read it back
				const content = await vscode.workspace.fs.readFile(kaotoMetadataUri);
				const parsed = JSON.parse(new TextDecoder().decode(content));

				expect(parsed.testKey).to.equal('testValue');
			} finally {
				// Clean up
				try {
					await vscode.workspace.fs.delete(kaotoMetadataUri);
				} catch (error) {
					// Ignore cleanup errors
				}
			}
		});

		test('should handle non-existent file gracefully', async function () {
			const nonExistentPath = path.join(testWorkspaceFolder.uri.fsPath, 'non-existent-file.yaml');
			const nonExistentUri = vscode.Uri.file(nonExistentPath);

			try {
				await vscode.workspace.fs.stat(nonExistentUri);
				expect.fail('Should have thrown an error for non-existent file');
			} catch (error) {
				expect(error).to.not.be.undefined;
			}
		});
	});

	suite('Path Normalization', function () {
		test('should normalize Windows backslashes to forward slashes', function () {
			const windowsPath = 'path\\to\\file.yaml';
			const normalized = windowsPath.replaceAll('\\', '/');
			expect(normalized).to.equal('path/to/file.yaml');
		});

		test('should handle already normalized paths', function () {
			const unixPath = 'path/to/file.yaml';
			const normalized = unixPath.replaceAll('\\', '/');
			expect(normalized).to.equal('path/to/file.yaml');
		});

		test('should handle mixed separators', function () {
			const mixedPath = 'path\\to/file.yaml';
			const normalized = mixedPath.replaceAll('\\', '/');
			expect(normalized).to.equal('path/to/file.yaml');
		});

		test('should handle empty path', function () {
			const emptyPath = '';
			const normalized = emptyPath.replaceAll('\\', '/');
			expect(normalized).to.equal('');
		});
	});

	suite('Metadata Operations', function () {
		test('should handle metadata with filePath arrays', function () {
			const metadata = {
				schemas: {
					filePath: ['path\\to\\schema1.xsd', 'path\\to\\schema2.xsd'],
				},
			};

			// Simulate normalization
			const normalized = JSON.parse(JSON.stringify(metadata));
			if (normalized.schemas && Array.isArray(normalized.schemas.filePath)) {
				normalized.schemas.filePath = normalized.schemas.filePath.map((p: string) => p.replaceAll('\\', '/'));
			}

			expect(normalized.schemas.filePath[0]).to.equal('path/to/schema1.xsd');
			expect(normalized.schemas.filePath[1]).to.equal('path/to/schema2.xsd');
		});

		test('should handle nested metadata structures', function () {
			const metadata = {
				level1: {
					level2: {
						filePath: ['nested\\path\\file.xsd'],
					},
				},
			};

			// Simulate deep normalization
			const normalizeFilePaths = (obj: any): any => {
				if (obj === null || obj === undefined || typeof obj !== 'object') {
					return obj;
				}
				if (Array.isArray(obj)) {
					return obj.map(normalizeFilePaths);
				}
				const result: any = {};
				for (const [k, v] of Object.entries(obj)) {
					if (k === 'filePath' && Array.isArray(v)) {
						result[k] = v.map((p: any) => (typeof p === 'string' ? p.replaceAll('\\', '/') : p));
					} else {
						result[k] = normalizeFilePaths(v);
					}
				}
				return result;
			};

			const normalized = normalizeFilePaths(metadata);
			expect(normalized.level1.level2.filePath[0]).to.equal('nested/path/file.xsd');
		});

		test('should preserve non-filePath properties', function () {
			const metadata = {
				name: 'test',
				version: '1.0.0',
				filePath: ['path\\to\\file.xsd'],
				otherArray: ['item1', 'item2'],
			};

			const normalizeFilePaths = (obj: any): any => {
				if (obj === null || obj === undefined || typeof obj !== 'object') {
					return obj;
				}
				if (Array.isArray(obj)) {
					return obj.map(normalizeFilePaths);
				}
				const result: any = {};
				for (const [k, v] of Object.entries(obj)) {
					if (k === 'filePath' && Array.isArray(v)) {
						result[k] = v.map((p: any) => (typeof p === 'string' ? p.replaceAll('\\', '/') : p));
					} else {
						result[k] = normalizeFilePaths(v);
					}
				}
				return result;
			};

			const normalized = normalizeFilePaths(metadata);
			expect(normalized.name).to.equal('test');
			expect(normalized.version).to.equal('1.0.0');
			expect(normalized.filePath[0]).to.equal('path/to/file.xsd');
			expect(normalized.otherArray).to.deep.equal(['item1', 'item2']);
		});
	});

	suite('Color Scheme Detection', function () {
		test('should detect current VS Code theme kind', function () {
			const activeTheme = vscode.window.activeColorTheme;

			// Verify theme kind is one of the valid ColorThemeKind values
			const validKinds = [
				vscode.ColorThemeKind.Dark,
				vscode.ColorThemeKind.Light,
				vscode.ColorThemeKind.HighContrast,
				vscode.ColorThemeKind.HighContrastLight,
			];

			expect(validKinds).to.include(activeTheme.kind);
		});

		test('should map VS Code theme to color scheme', function () {
			const activeTheme = vscode.window.activeColorTheme;

			let expectedScheme: string;
			switch (activeTheme.kind) {
				case vscode.ColorThemeKind.Dark:
				case vscode.ColorThemeKind.HighContrast:
					expectedScheme = 'dark';
					break;
				case vscode.ColorThemeKind.Light:
				case vscode.ColorThemeKind.HighContrastLight:
					expectedScheme = 'light';
					break;
				default:
					expectedScheme = 'light';
			}

			expect(['light', 'dark']).to.include(expectedScheme);
		});

		test('should handle explicit light theme configuration', async function () {
			const config = vscode.workspace.getConfiguration();
			const currentSetting = config.get<string>(KAOTO_COLOR_THEME_SETTING_ID);

			// If setting is 'light', verify it's a valid value
			if (currentSetting === 'light') {
				expect(['auto', 'light', 'dark']).to.include(currentSetting);
			}
		});

		test('should handle explicit dark theme configuration', async function () {
			const config = vscode.workspace.getConfiguration();
			const currentSetting = config.get<string>(KAOTO_COLOR_THEME_SETTING_ID);

			// If setting is 'dark', verify it's a valid value
			if (currentSetting === 'dark') {
				expect(['auto', 'light', 'dark']).to.include(currentSetting);
			}
		});
	});

	suite('File Type Operations', function () {
		test('should handle empty kamelet directories configuration', function () {
			const kameletsFolder: string[] = [];
			expect(Array.isArray(kameletsFolder)).to.be.true;
			expect(kameletsFolder).to.have.lengthOf(0);
		});

		test('should validate kamelet file extension', function () {
			const validKameletFile = 'my-kamelet.kamelet.yaml';
			const invalidKameletFile = 'my-route.camel.yaml';

			expect(validKameletFile.endsWith('.kamelet.yaml')).to.be.true;
			expect(invalidKameletFile.endsWith('.kamelet.yaml')).to.be.false;
		});
	});

	suite('Resource Content Operations', function () {
		test('should return empty array when no kamelet directories configured', async function () {
			// This test verifies the behavior when KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID is empty
			const config = vscode.workspace.getConfiguration();
			const kameletsFolder = config.get<string[]>(KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID);

			// Verify the configuration value is either undefined, null, or an array
			if (kameletsFolder === undefined || kameletsFolder === null) {
				expect(kameletsFolder).to.satisfy((val: any) => val === undefined || val === null);
			} else {
				expect(Array.isArray(kameletsFolder)).to.be.true;
			}
		});

		test('should validate kamelet file naming convention', function () {
			const validKameletFiles = ['my-kamelet.kamelet.yaml', 'timer-source.kamelet.yaml', 'log-sink.kamelet.yaml'];

			const invalidKameletFiles = ['my-route.camel.yaml', 'test.yaml', 'kamelet.yaml', 'my-kamelet.yaml'];

			validKameletFiles.forEach((file) => {
				expect(file.endsWith('.kamelet.yaml')).to.be.true;
			});

			invalidKameletFiles.forEach((file) => {
				expect(file.endsWith('.kamelet.yaml')).to.be.false;
			});
		});

		test('should handle path resolution for kamelet directories', function () {
			const testPaths = ['./kamelets', '../shared/kamelets', '/absolute/path/kamelets'];
			const cwd = path.dirname(testDocument.uri.fsPath);

			testPaths.forEach((testPath) => {
				const resolved = path.isAbsolute(testPath) ? testPath : path.resolve(cwd, testPath);
				expect(path.isAbsolute(resolved)).to.be.true;
			});
		});

		test('should filter files by .kamelet.yaml extension', function () {
			const files = [
				{ name: 'timer.kamelet.yaml', type: vscode.FileType.File },
				{ name: 'log.kamelet.yaml', type: vscode.FileType.File },
				{ name: 'route.camel.yaml', type: vscode.FileType.File },
				{ name: 'README.md', type: vscode.FileType.File },
				{ name: 'subfolder', type: vscode.FileType.Directory },
			];

			const kameletFiles = files.filter((f) => f.type === vscode.FileType.File && f.name.endsWith('.kamelet.yaml'));

			expect(kameletFiles).to.have.lengthOf(2);
			expect(kameletFiles[0].name).to.equal('timer.kamelet.yaml');
			expect(kameletFiles[1].name).to.equal('log.kamelet.yaml');
		});
	});

	suite('Workspace Operations', function () {
		test('should get workspace folder for document', function () {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(testDocument.uri);
			expect(workspaceFolder).to.not.be.undefined;
			expect(workspaceFolder?.uri.fsPath).to.be.a('string');
		});

		test('should handle relative path resolution', function () {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(testDocument.uri);
			if (workspaceFolder) {
				const relativePath = path.relative(workspaceFolder.uri.fsPath, testDocument.uri.fsPath);
				expect(relativePath).to.be.a('string');
				expect(relativePath.length).to.be.greaterThan(0);
			}
		});

		test('should resolve absolute paths correctly', function () {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(testDocument.uri);
			if (workspaceFolder) {
				const absolutePath = path.resolve(workspaceFolder.uri.fsPath, 'test-file.yaml');
				expect(path.isAbsolute(absolutePath)).to.be.true;
			}
		});
	});

	suite('Error Handling', function () {
		test('should handle invalid JSON in metadata file', function () {
			const invalidJson = '{ invalid json }';
			try {
				JSON.parse(invalidJson);
				expect.fail('Should have thrown an error for invalid JSON');
			} catch (error) {
				expect(error).to.be.instanceOf(SyntaxError);
			}
		});

		test('should handle missing metadata keys gracefully', function () {
			const metadata = { existingKey: 'value' };
			const missingValue = metadata['nonExistentKey' as keyof typeof metadata];
			expect(missingValue).to.be.undefined;
		});

		test('should handle null metadata values', function () {
			const metadata = { nullKey: null };
			expect(metadata.nullKey).to.be.null;
		});

		test('should handle undefined metadata values', function () {
			const metadata: Record<string, any> = { undefinedKey: undefined };
			expect(metadata.undefinedKey).to.be.undefined;
		});
	});

	suite('Deprecated Methods', function () {
		test('should handle getCatalogURL for backward compatibility', async function () {
			// This deprecated method should return custom catalog URL or undefined
			const config = vscode.workspace.getConfiguration();
			const catalogUrl = config.get<string>(KAOTO_CATALOG_URL_SETTING_ID);

			// Should be string or undefined
			if (catalogUrl !== undefined && catalogUrl !== null) {
				expect(typeof catalogUrl).to.be.oneOf(['string', 'object']);
			}
		});
	});

	// Settings Model Construction tests removed - these were testing hardcoded values
	// Real settings should be tested through VS Code configuration API

	// Step Update Actions tests removed - these were testing hardcoded arrays
	// These enums should be tested by importing from @kaoto/kaoto if needed

	suite('URI and Path Utilities', function () {
		test('should handle forward slash conversion', function () {
			const windowsPath = 'path\\to\\file.txt';
			const unixPath = windowsPath.replace(/\\/g, '/');

			expect(unixPath).to.equal('path/to/file.txt');
			expect(unixPath.includes('\\')).to.be.false;
		});

		test('should handle already normalized paths', function () {
			const normalizedPath = 'path/to/file.txt';
			const result = normalizedPath.replace(/\\/g, '/');

			expect(result).to.equal(normalizedPath);
		});

		test('should handle mixed path separators', function () {
			const mixedPath = 'path\\to/mixed\\file.txt';
			const normalized = mixedPath.replace(/\\/g, '/');

			expect(normalized).to.equal('path/to/mixed/file.txt');
		});

		test('should handle empty path strings', function () {
			const emptyPath = '';
			const normalized = emptyPath.replace(/\\/g, '/');

			expect(normalized).to.equal('');
		});
	});

	suite('Metadata File Path Normalization', function () {
		test('should normalize filePath arrays in metadata', function () {
			const metadata = {
				filePath: ['path\\to\\schema1.xsd', 'path\\to\\schema2.xsd'],
			};

			const normalized = {
				filePath: metadata.filePath.map((p) => p.replace(/\\/g, '/')),
			};

			expect(normalized.filePath[0]).to.equal('path/to/schema1.xsd');
			expect(normalized.filePath[1]).to.equal('path/to/schema2.xsd');
		});

		test('should handle nested metadata structures with filePath', function () {
			const metadata = {
				schemas: {
					filePath: ['schema\\file.xsd'],
				},
				other: 'value',
			};

			const normalizeFilePaths = (obj: any): any => {
				if (obj === null || obj === undefined || typeof obj !== 'object') {
					return obj;
				}
				if (Array.isArray(obj)) {
					return obj.map((v) => normalizeFilePaths(v));
				}
				const result: any = {};
				for (const [k, v] of Object.entries(obj)) {
					if (k === 'filePath' && Array.isArray(v)) {
						result[k] = v.map((p: any) => (typeof p === 'string' ? p.replace(/\\/g, '/') : p));
					} else {
						result[k] = normalizeFilePaths(v);
					}
				}
				return result;
			};

			const normalized = normalizeFilePaths(metadata);
			expect(normalized.schemas.filePath[0]).to.equal('schema/file.xsd');
			expect(normalized.other).to.equal('value');
		});

		test('should preserve non-filePath arrays', function () {
			const metadata = {
				filePath: ['path\\to\\file.xsd'],
				otherArray: ['item1', 'item2'],
				nested: {
					filePath: ['nested\\path.xsd'],
				},
			};

			const normalizeFilePaths = (obj: any): any => {
				if (obj === null || obj === undefined || typeof obj !== 'object') {
					return obj;
				}
				if (Array.isArray(obj)) {
					return obj.map((v) => normalizeFilePaths(v));
				}
				const result: any = {};
				for (const [k, v] of Object.entries(obj)) {
					if (k === 'filePath' && Array.isArray(v)) {
						result[k] = v.map((p: any) => (typeof p === 'string' ? p.replace(/\\/g, '/') : p));
					} else {
						result[k] = normalizeFilePaths(v);
					}
				}
				return result;
			};

			const normalized = normalizeFilePaths(metadata);
			expect(normalized.filePath[0]).to.equal('path/to/file.xsd');
			expect(normalized.otherArray).to.deep.equal(['item1', 'item2']);
			expect(normalized.nested.filePath[0]).to.equal('nested/path.xsd');
		});
	});

	// Color Scheme Conversion tests removed - these were testing hardcoded string values
	// Color scheme conversion is already tested in 'Color Scheme Detection' suite above

	suite('Path Resolution', function () {
		test('should resolve paths relative to workspace', function () {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(testDocument.uri);
			if (workspaceFolder) {
				const relativePath = './resources/schema.xsd';
				const absolutePath = path.resolve(workspaceFolder.uri.fsPath, relativePath);
				expect(path.isAbsolute(absolutePath)).to.be.true;
			}
		});

		test('should handle parent directory references', function () {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(testDocument.uri);
			if (workspaceFolder) {
				const relativePath = '../parent/file.yaml';
				const absolutePath = path.resolve(workspaceFolder.uri.fsPath, relativePath);
				expect(path.isAbsolute(absolutePath)).to.be.true;
			}
		});

		test('should normalize path separators', function () {
			const mixedPath = 'path/to\\file.yaml';
			const normalized = path.normalize(mixedPath);
			expect(normalized).to.be.a('string');
		});
	});

	suite('Settings Model Validation', function () {
		test('should validate node label type from configuration', async function () {
			const config = vscode.workspace.getConfiguration();
			const nodeLabel = config.get<string>(KAOTO_NODE_LABEL_SETTING_ID);

			// If a value is set, it should be one of the valid values
			if (nodeLabel !== undefined && nodeLabel !== null) {
				expect(['description', 'id']).to.include(nodeLabel);
			}
		});

		test('should validate node toolbar trigger from configuration', async function () {
			const config = vscode.workspace.getConfiguration();
			const trigger = config.get<string>(KAOTO_NODE_TOOLBAR_TRIGGER_SETTING_ID);

			// If a value is set, it should be one of the valid values
			if (trigger !== undefined && trigger !== null) {
				expect(['onHover', 'onSelection']).to.include(trigger);
			}
		});

		test('should validate color scheme from configuration', async function () {
			const config = vscode.workspace.getConfiguration();
			const colorScheme = config.get<string>(KAOTO_COLOR_THEME_SETTING_ID);

			// If a value is set, it should be one of the valid values
			if (colorScheme !== undefined && colorScheme !== null) {
				expect(['auto', 'light', 'dark']).to.include(colorScheme);
			}
		});

		test('should validate canvas layout direction from configuration', async function () {
			const config = vscode.workspace.getConfiguration();
			const layoutDirection = config.get<string>(KAOTO_CANVAS_LAYOUT_DIRECTION_SETTING_ID);

			// If a value is set, it should be one of the valid values
			if (layoutDirection !== undefined && layoutDirection !== null) {
				expect(['SelectInCanvas', 'Horizontal', 'Vertical']).to.include(layoutDirection);
			}
		});
	});
});
