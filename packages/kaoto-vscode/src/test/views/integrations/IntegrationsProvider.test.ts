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
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { COMMAND_OPEN_WITH_KAOTO, CONTEXT_INTEGRATION_EXISTS, KAOTO_EXCLUDE_PATTERN, KAOTO_INTEGRATIONS_FILES_REGEXP_SETTING_ID } from '../../../constants';
import { File } from '../../../views/integrations/File';
import { Folder } from '../../../views/integrations/Folder';
import { Integration } from '../../../views/integrations/Integration';
import { IntegrationsProvider } from '../../../views/integrations/IntegrationsProvider';
import { Route } from '../../../views/integrations/Route';

const ROUTES_YAML = `- route:
    id: route-alpha
    description: First route
    from:
      uri: timer:alpha
      steps:
        - log:
            message: alpha
- route:
    from:
      uri: timer:no-id
      steps:
        - log:
            message: no id
`;

const ROUTES_XML = `<camel>
  <route id="route-bravo-1">
    <from uri="timer:bravo-1"/>
    <log message="bravo 1"/>
  </route>
  <route id="route-bravo-2">
    <from uri="timer:bravo-2"/>
    <log message="bravo 2"/>
  </route>
</camel>
`;

const routeYaml = (id: string) => `- route:\n    id: ${id}\n    from:\n      uri: timer:${id}\n      steps:\n        - log:\n            message: ${id}\n`;

const KAMELET = `apiVersion: camel.apache.org/v1
kind: Kamelet
metadata:
  name: charlie
spec:
  template:
    from:
      uri: kamelet:source
      steps:
        - to:
            uri: kamelet:sink
`;

const PIPE = `apiVersion: camel.apache.org/v1
kind: Pipe
metadata:
  name: delta
spec:
  source:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: timer-source
  sink:
    ref:
      kind: Kamelet
      apiVersion: camel.apache.org/v1
      name: log-sink
`;

const POM = '<project><modelVersion>4.0.0</modelVersion></project>\n';

/** The workspace folders of the tests, by name, with their files by relative path. */
const WORKSPACES: Record<string, Record<string, string>> = {
	app: {
		'a-route.camel.yaml': routeYaml('route-top'),
		'standalone/alpha.camel.yaml': ROUTES_YAML,
		'standalone/application.properties': 'camel.main.name = standalone\n',
		'standalone/bravo.camel.xml': ROUTES_XML,
		'standalone/charlie.kamelet.yaml': KAMELET,
		'standalone/delta.pipe.yaml': PIPE,
		'standalone/echo-pipe.yaml': PIPE,
		'standalone/foxtrot.camel.yaml': '',
		'standalone/golf.camel.yaml': '- route: [not closed\n',
		'maven-app/pom.xml': POM,
		'maven-app/src/main/resources/camel/hotel.camel.yaml': routeYaml('route-hotel'),
	},
	empty: {},
	service: {
		'pom.xml': POM,
		'src/main/resources/camel/india.camel.yaml': routeYaml('route-india'),
	},
};

suite('IntegrationsProvider', () => {
	const originalFindFiles = vscode.workspace.findFiles;
	const originalCommands = { executeCommand: vscode.commands.executeCommand };
	const originalWorkspaceFolders = Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders')!;
	const originalOnDidChangeConfiguration = Object.getOwnPropertyDescriptor(vscode.workspace, 'onDidChangeConfiguration')!;
	const originalFs = Object.getOwnPropertyDescriptor(vscode.workspace, 'fs')!;
	const onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration;
	const providers: IntegrationsProvider[] = [];

	let root: string;
	let files: vscode.Uri[];
	let findFilesCalls: Array<{ include: vscode.GlobPattern; exclude: vscode.GlobPattern | null | undefined }>;
	let integrationExists: boolean[];

	// The provider reports paths as Uri.fsPath, which lowercases a Windows drive letter
	const folderPath = (workspace: string, relativePath = '') => vscode.Uri.file(path.join(root, workspace, ...relativePath.split('/'))).fsPath;
	const filesOf = (...workspaces: string[]) =>
		workspaces.flatMap((workspace) => Object.keys(WORKSPACES[workspace]).map((file) => vscode.Uri.file(folderPath(workspace, file))));

	const useWorkspaceFolders = (...names: string[]) => {
		const folders = names.map((name, index) => ({ uri: vscode.Uri.file(folderPath(name)), name, index }));
		Object.defineProperty(vscode.workspace, 'workspaceFolders', { get: () => folders, configurable: true });
	};

	const createProvider = () => {
		const provider = new IntegrationsProvider(vscode.Uri.file(path.join(root, 'extension')).path);
		providers.push(provider);
		return provider;
	};

	const childrenOf = async (provider: IntegrationsProvider, ...labels: string[]): Promise<vscode.TreeItem[]> => {
		let children = await provider.getChildren();
		for (const label of labels) {
			const item = children.find((child) => child.label === label);
			assert.isDefined(item, `'${label}' is not among ${children.map((child) => child.label).join(', ')}`);
			children = await provider.getChildren(item);
		}
		return children;
	};

	const itemOf = async (provider: IntegrationsProvider, ...labels: string[]): Promise<vscode.TreeItem> => {
		const children = await childrenOf(provider, ...labels.slice(0, -1));
		const item = children.find((child) => child.label === labels.at(-1));
		assert.isDefined(item, `'${labels.at(-1)}' is not among ${children.map((child) => child.label).join(', ')}`);
		return item!;
	};

	const updateFilesSetting = (value: string[] | undefined) =>
		vscode.workspace.getConfiguration().update(KAOTO_INTEGRATIONS_FILES_REGEXP_SETTING_ID, value, vscode.ConfigurationTarget.Workspace);

	suiteSetup(async () => {
		root = await mkdtemp(path.join(os.tmpdir(), 'kaoto-integrations-view-'));
		for (const [workspace, workspaceFiles] of Object.entries(WORKSPACES)) {
			await mkdir(folderPath(workspace), { recursive: true });
			for (const [file, content] of Object.entries(workspaceFiles)) {
				await mkdir(path.dirname(folderPath(workspace, file)), { recursive: true });
				await writeFile(folderPath(workspace, file), content);
			}
		}
	});

	suiteTeardown(async () => {
		await rm(root, { recursive: true, force: true });
	});

	setup(() => {
		files = filesOf('app');
		findFilesCalls = [];
		integrationExists = [];
		useWorkspaceFolders('app');
		vscode.workspace.findFiles = async (include: vscode.GlobPattern, exclude?: vscode.GlobPattern | null) => {
			findFilesCalls.push({ include, exclude });
			return files;
		};
		(vscode.commands as unknown as Record<string, unknown>).executeCommand = async (command: string, ...args: unknown[]) => {
			if (command === 'setContext' && args[0] === CONTEXT_INTEGRATION_EXISTS) {
				integrationExists.push(args[1] as boolean);
				return undefined;
			}
			return originalCommands.executeCommand(command, ...args);
		};
	});

	teardown(() => {
		providers.splice(0).forEach((provider) => provider.dispose());
		vscode.workspace.findFiles = originalFindFiles;
		Object.assign(vscode.commands, originalCommands);
		Object.defineProperty(vscode.workspace, 'workspaceFolders', originalWorkspaceFolders);
		Object.defineProperty(vscode.workspace, 'onDidChangeConfiguration', originalOnDidChangeConfiguration);
		Object.defineProperty(vscode.workspace, 'fs', originalFs);
	});

	test('lists the folders first, then the files, by name', async () => {
		const children = await createProvider().getChildren();

		assert.deepEqual(
			children.map((child) => child.label),
			['maven-app', 'standalone', 'a-route.camel.yaml'],
		);
		assert.instanceOf(children[0], Folder);
		assert.instanceOf(children[1], Folder);
		assert.instanceOf(children[2], Integration);
	});

	test('opens a Camel file at the workspace root with Kaoto, as a top-level integration', async () => {
		const integration = (await itemOf(createProvider(), 'a-route.camel.yaml')) as Integration;
		const file = folderPath('app', 'a-route.camel.yaml');

		assert.strictEqual(integration.name, 'a-route');
		assert.strictEqual(integration.type, 'route');
		assert.strictEqual(integration.dsl, 'yaml');
		assert.strictEqual(integration.description, 'Camel Route');
		assert.strictEqual(integration.contextValue, 'integration');
		assert.strictEqual(integration.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
		assert.strictEqual(integration.tooltip, file);
		assert.strictEqual(integration.resourceUri?.fsPath, file);
		assert.strictEqual(integration.command?.command, COMMAND_OPEN_WITH_KAOTO);
		assert.strictEqual((integration.command?.arguments?.[0] as vscode.Uri).fsPath, file);
	});

	test('shows a folder without a pom.xml as a plain folder', async () => {
		const folder = (await itemOf(createProvider(), 'standalone')) as Folder;
		const folderFsPath = folderPath('app', 'standalone');

		assert.strictEqual(folder.contextValue, 'folder');
		assert.strictEqual((folder.iconPath as vscode.ThemeIcon).id, 'symbol-folder');
		assert.isUndefined(folder.description);
		assert.strictEqual(folder.collapsibleState, vscode.TreeItemCollapsibleState.Collapsed);
		assert.strictEqual(folder.tooltip, folderFsPath);
		assert.strictEqual(folder.folderUri.fsPath, folderFsPath);
		assert.strictEqual(folder.resourceUri?.fsPath, folderFsPath);
	});

	test('shows a folder with a pom.xml as a Maven root, and what it contains as Maven children', async () => {
		const provider = createProvider();
		const mavenRoot = (await itemOf(provider, 'maven-app')) as Folder;

		assert.strictEqual(mavenRoot.contextValue, 'folder-maven-root');
		assert.strictEqual((mavenRoot.iconPath as vscode.ThemeIcon).id, 'folder-library');
		assert.strictEqual(mavenRoot.description, 'M');

		const children = await provider.getChildren(mavenRoot);
		assert.deepEqual(
			children.map((child) => [child.label, child.contextValue]),
			[
				['src', 'folder-maven-child'],
				['pom.xml', 'file'],
			],
		);
		assert.instanceOf(children[1], File);
		assert.strictEqual(children[1].command?.command, 'vscode.open');

		const integration = await itemOf(provider, 'maven-app', 'src', 'main', 'resources', 'camel', 'hotel.camel.yaml');
		assert.strictEqual(integration.contextValue, 'integration-maven-child');
	});

	test('tells Camel routes, Kamelets, Pipes and other files apart', async () => {
		const children = await childrenOf(createProvider(), 'standalone');

		assert.deepEqual(
			children.map((child) =>
				child instanceof Integration
					? [child.label, child.name, child.type, child.dsl, child.description, child.contextValue]
					: [child.label, child.contextValue],
			),
			[
				['alpha.camel.yaml', 'alpha', 'route', 'yaml', 'Camel Route', 'integration-standalone-child'],
				['application.properties', 'file'],
				['bravo.camel.xml', 'bravo', 'route', 'xml', 'Camel Route', 'integration-standalone-child'],
				['charlie.kamelet.yaml', 'charlie', 'kamelet', 'yaml', 'Kamelet', 'integration-standalone-child'],
				['delta.pipe.yaml', 'delta', 'pipe', 'yaml', 'Pipe', 'integration-standalone-child'],
				['echo-pipe.yaml', 'echo', 'pipe', 'yaml', 'Pipe', 'integration-standalone-child'],
				['foxtrot.camel.yaml', 'foxtrot', 'route', 'yaml', 'Camel Route', 'integration-standalone-child'],
				['golf.camel.yaml', 'golf', 'route', 'yaml', 'Camel Route', 'integration-standalone-child'],
			],
		);
		assert.instanceOf(children[1], File);
		assert.deepEqual(
			children
				.filter((child): child is Integration => child instanceof Integration)
				.map((child) => path.basename((child.iconPath as { light: vscode.Uri }).light.fsPath)),
			[
				'routes-file-icon-light.png',
				'routes-file-icon-light.png',
				'kamelets-file-icon-light.png',
				'pipes-file-icon-light.png',
				'pipes-file-icon-light.png',
				'routes-file-icon-light.png',
				'routes-file-icon-light.png',
			],
		);
	});

	test('expands the Camel files that have routes, and lists their routes', async () => {
		const provider = createProvider();
		const yamlFile = await itemOf(provider, 'standalone', 'alpha.camel.yaml');
		const xmlFile = await itemOf(provider, 'standalone', 'bravo.camel.xml');

		assert.strictEqual(yamlFile.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
		const yamlRoutes = await provider.getChildren(yamlFile);
		assert.deepEqual(
			yamlRoutes.map((route) => [route.label, route.description, route.tooltip, route.contextValue]),
			[
				['route-alpha', 'First route', undefined, 'route'],
				[undefined, '(missing id)', 'This route has no id.', 'route'],
			],
		);
		assert.instanceOf(yamlRoutes[0], Route);

		assert.strictEqual(xmlFile.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
		const xmlRoutes = await provider.getChildren(xmlFile);
		assert.deepEqual(
			xmlRoutes.map((route) => route.label),
			['route-bravo-1', 'route-bravo-2'],
		);
		assert.deepEqual(await provider.getChildren(xmlRoutes[0]), []);
	});

	test('does not expand Kamelets, Pipes, empty or broken Camel files, or other files', async () => {
		const provider = createProvider();
		const children = await childrenOf(provider, 'standalone');

		for (const label of ['application.properties', 'charlie.kamelet.yaml', 'delta.pipe.yaml', 'echo-pipe.yaml', 'foxtrot.camel.yaml', 'golf.camel.yaml']) {
			const item = children.find((child) => child.label === label)!;
			assert.strictEqual(item.collapsibleState, vscode.TreeItemCollapsibleState.None, label);
			assert.deepEqual(await provider.getChildren(item), [], label);
		}
	});

	test('shows the workspace folders that have files as root folders in a multi-root workspace', async () => {
		useWorkspaceFolders('app', 'empty', 'service');
		files = filesOf('app', 'service');

		const children = await createProvider().getChildren();

		assert.deepEqual(
			children.map((child) => [child.label, (child.iconPath as vscode.ThemeIcon).id, child.description]),
			[
				['app', 'file-submodule', undefined],
				['service', 'folder-library', 'M'],
			],
		);
		assert.strictEqual(children[1].contextValue, 'folder-maven-root');
		assert.strictEqual((children[0] as Folder).folderUri.fsPath, folderPath('app'));
	});

	test('gives the workspace root folders their own context value, as the Tests and OpenAPI views do', async () => {
		useWorkspaceFolders('app', 'service');
		files = filesOf('app', 'service');

		const children = await createProvider().getChildren();

		assert.deepEqual(
			children.map((child) => [child.label, child.contextValue]),
			[
				['app', 'folder-workspace-root'],
				['service', 'folder-maven-root'],
			],
		);
	});

	test('searches the files of the integrations setting outside the excluded folders', async () => {
		await createProvider().getChildren();

		const regexps = vscode.workspace.getConfiguration().get<string[]>(KAOTO_INTEGRATIONS_FILES_REGEXP_SETTING_ID)!;
		assert.include(regexps, '*.camel.yaml');
		assert.deepEqual(findFilesCalls[0], { include: `{${regexps.map((regexp) => `**/${regexp}`).join(',')}}`, exclude: KAOTO_EXCLUDE_PATTERN });
		assert.strictEqual(IntegrationsProvider.EXCLUDE_PATTERN, KAOTO_EXCLUDE_PATTERN);
	});

	test('tells whether the workspace has integration files', async () => {
		await createProvider().getChildren();
		assert.deepEqual(integrationExists, [true]);

		files = [];
		integrationExists = [];
		assert.deepEqual(await createProvider().getChildren(), []);
		assert.deepEqual(integrationExists, [false]);
	});

	test('reads the files once for all folders until the view is refreshed', async () => {
		const provider = createProvider();
		await childrenOf(provider, 'maven-app', 'src', 'main');
		await childrenOf(provider, 'standalone');

		assert.lengthOf(findFilesCalls, 1);
	});

	test('reads the files again on refresh', async () => {
		const provider = createProvider();
		assert.include(
			(await provider.getChildren()).map((child) => child.label),
			'a-route.camel.yaml',
		);

		files = files.filter((file) => path.basename(file.fsPath) !== 'a-route.camel.yaml');
		const changed = nextTreeChange(provider, 2_000);
		provider.refresh();

		assert.isTrue(await changed, 'the view did not change after a refresh');
		assert.deepEqual(
			(await provider.getChildren()).map((child) => child.label),
			['maven-app', 'standalone'],
		);
	});

	test('shares one file search between the requests made while it runs', async () => {
		const provider = createProvider();

		await Promise.all([provider.getChildren(), provider.getChildren(), provider.getChildren()]);

		assert.lengthOf(findFilesCalls, 1);
	});

	test('searches again after a file search fails', async () => {
		vscode.workspace.findFiles = async (include: vscode.GlobPattern, exclude?: vscode.GlobPattern | null) => {
			findFilesCalls.push({ include, exclude });
			if (findFilesCalls.length === 1) {
				throw new Error('The file search failed');
			}
			return files;
		};
		const provider = createProvider();

		try {
			await provider.getChildren();
			assert.fail('Should have thrown an error');
		} catch (error) {
			assert.include((error as Error).message, 'The file search failed');
		}

		assert.deepEqual(
			(await provider.getChildren()).map((child) => child.label),
			['maven-app', 'standalone', 'a-route.camel.yaml'],
		);
		assert.lengthOf(findFilesCalls, 2);
	});

	test('reads the files again after a refresh that comes during a file search', async () => {
		let finishFirstSearch = () => {};
		vscode.workspace.findFiles = async (include: vscode.GlobPattern, exclude?: vscode.GlobPattern | null) => {
			findFilesCalls.push({ include, exclude });
			if (findFilesCalls.length > 1) {
				return files;
			}
			// The first search lists the workspace before a-route.camel.yaml is created
			const filesBefore = files.filter((file) => path.basename(file.fsPath) !== 'a-route.camel.yaml');
			await new Promise<void>((resolve) => (finishFirstSearch = () => resolve()));
			return filesBefore;
		};
		const provider = createProvider();

		const firstRequest = provider.getChildren();
		provider.refresh();
		finishFirstSearch();
		await firstRequest;

		assert.include(
			(await provider.getChildren()).map((child) => child.label),
			'a-route.camel.yaml',
		);
		assert.lengthOf(findFilesCalls, 2);
	});

	test('checks for a pom.xml again after a refresh that comes during the check', async () => {
		const mavenAppPom = folderPath('app', 'maven-app/pom.xml');
		const realFs = vscode.workspace.fs;
		let pomChecks = 0;
		let firstCheckStarted = () => {};
		const firstCheck = new Promise<void>((resolve) => (firstCheckStarted = () => resolve()));
		let finishFirstCheck = () => {};
		const stat = async (uri: vscode.Uri) => {
			if (uri.fsPath === mavenAppPom && ++pomChecks === 1) {
				// The first check runs before the pom.xml of maven-app is created
				firstCheckStarted();
				await new Promise<void>((resolve) => (finishFirstCheck = () => resolve()));
				throw vscode.FileSystemError.FileNotFound(uri);
			}
			return realFs.stat(uri);
		};
		Object.defineProperty(vscode.workspace, 'fs', { value: { ...realFs, stat }, configurable: true });
		const provider = createProvider();

		const firstRequest = provider.getChildren();
		await firstCheck;
		provider.refresh();
		finishFirstCheck();
		await firstRequest;
		const mavenApp = (await provider.getChildren()).find((child) => child.label === 'maven-app');

		assert.strictEqual(mavenApp?.contextValue, 'folder-maven-root');
		assert.strictEqual(pomChecks, 2);
	});

	test('follows a change of the files setting', async function () {
		this.timeout(10_000);
		const provider = createProvider();
		await provider.getChildren();

		const changed = nextTreeChange(provider, 5_000);
		try {
			await updateFilesSetting(['*.kamelet.yaml']);
			assert.isTrue(await changed, 'the view did not change after a change of the files setting');
			await provider.getChildren();
			assert.strictEqual(findFilesCalls.at(-1)?.include, '{**/*.kamelet.yaml}');
		} finally {
			await updateFilesSetting(undefined);
		}
	});

	test('stops following the files setting once disposed', () => {
		const subscriptions: Array<{ disposed: boolean }> = [];
		const recordSubscriptions: typeof vscode.workspace.onDidChangeConfiguration = (listener, thisArgs, disposables) => {
			const subscription = onDidChangeConfiguration(listener, thisArgs, disposables);
			const record = { disposed: false };
			subscriptions.push(record);
			return {
				dispose: () => {
					record.disposed = true;
					subscription.dispose();
				},
			};
		};
		Object.defineProperty(vscode.workspace, 'onDidChangeConfiguration', { value: recordSubscriptions, configurable: true, writable: true });
		const provider = createProvider();
		Object.defineProperty(vscode.workspace, 'onDidChangeConfiguration', originalOnDidChangeConfiguration);

		assert.deepEqual(subscriptions, [{ disposed: false }]);
		provider.dispose();
		assert.deepEqual(subscriptions, [{ disposed: true }]);
	});
});

/**
 * Resolves to true when the provider fires a tree change within the timeout, and to false otherwise.
 * Subscribe before the action that should change the tree: some changes fire at once.
 */
function nextTreeChange(provider: IntegrationsProvider, timeoutMs: number): Promise<boolean> {
	return new Promise((resolve) => {
		const subscription = provider.onDidChangeTreeData(() => {
			clearTimeout(timer);
			subscription.dispose();
			resolve(true);
		});
		const timer = setTimeout(() => {
			subscription.dispose();
			resolve(false);
		}, timeoutMs);
	});
}
