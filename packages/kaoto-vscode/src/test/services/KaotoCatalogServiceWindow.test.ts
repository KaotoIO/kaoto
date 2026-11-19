import { expect } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { COMMAND_SELECT_CAMEL_CATALOG } from '../../constants/commands';
import { closeAllEditors, getExtensionContext, getTestWorkspaceFolder, preserveKaotoCatalogServiceInstance } from '../utils/TestSetup';

/** A status bar item that records what the service does with it */
interface FakeStatusBarItem {
	text: string;
	tooltip: string | undefined;
	command: string | undefined;
	visible: boolean;
	disposed: boolean;
	show(): void;
	hide(): void;
	dispose(): void;
}

const createFakeStatusBarItem = (): FakeStatusBarItem => ({
	text: '',
	tooltip: undefined,
	command: undefined,
	visible: false,
	disposed: false,
	show() {
		this.visible = true;
	},
	hide() {
		this.visible = false;
	},
	dispose() {
		this.disposed = true;
	},
});

async function waitFor(condition: () => boolean, description: string): Promise<void> {
	const deadline = Date.now() + 5_000;
	while (!condition() && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 20));
	}
	expect(condition(), description).to.equal(true);
}

suite('KaotoCatalogService in the window', () => {
	const createdFiles: string[] = [];
	const restores: (() => void)[] = [];
	let subscriptions: vscode.Disposable[];
	let service: KaotoCatalogService;
	let infoMessages: string[];
	let warningMessages: string[];
	let errorMessages: string[];
	let executedCommands: unknown[][];
	let restoreCatalogServiceInstance: () => void;

	/** Replace a VS Code API function for the current test */
	const stub = (target: object, key: string, value: unknown) => {
		const original = (target as Record<string, unknown>)[key];
		Object.defineProperty(target, key, { value, configurable: true });
		restores.push(() => Object.defineProperty(target, key, { value: original, configurable: true }));
	};

	const writeWorkspaceFile = (relativePath: string, content = '- route:\n    from:\n      uri: timer:tick\n') => {
		const filePath = path.join(getTestWorkspaceFolder(), relativePath);
		fs.mkdirSync(path.dirname(filePath), { recursive: true });
		fs.writeFileSync(filePath, content);
		createdFiles.push(filePath);
		return vscode.Uri.file(filePath);
	};

	/** Opens the file as text, so that it is the active tab and the active text editor */
	const openAsText = async (relativePath: string) => {
		const uri = writeWorkspaceFile(relativePath);
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
		return uri;
	};

	const updateSetting = async (key: string, value: string | undefined) => {
		await vscode.workspace.getConfiguration('kaoto').update(key, value, vscode.ConfigurationTarget.Workspace);
	};

	const integrationCatalog = (excluded?: CatalogLibraryEntry) =>
		service.getCatalogs().find((catalog) => catalog.runtime.toLowerCase() === 'main' && catalog.version !== excluded?.version)!;

	const citrusCatalog = (excluded?: CatalogLibraryEntry) =>
		service.getCatalogs().find((catalog) => catalog.runtime.toLowerCase() === 'citrus' && catalog.version !== excluded?.version)!;

	suiteSetup(() => {
		restoreCatalogServiceInstance = preserveKaotoCatalogServiceInstance();
	});

	setup(async () => {
		await closeAllEditors();
		infoMessages = [];
		warningMessages = [];
		errorMessages = [];
		executedCommands = [];
		stub(vscode.window, 'showInformationMessage', async (message: string) => {
			infoMessages.push(message);
			return undefined;
		});
		stub(vscode.window, 'showWarningMessage', async (message: string) => {
			warningMessages.push(message);
			return undefined;
		});
		stub(vscode.window, 'showErrorMessage', async (message: string) => {
			errorMessages.push(message);
			return undefined;
		});
		// The service gets its own subscriptions, so that its listeners end with the test
		subscriptions = [];
		const context = Object.create(await getExtensionContext(), { subscriptions: { value: subscriptions } });
		service = new KaotoCatalogService(context);
		await service.initialize();
	});

	teardown(async () => {
		for (const disposable of subscriptions) {
			disposable.dispose();
		}
		while (restores.length > 0) {
			restores.pop()!();
		}
		await closeAllEditors();
		await updateSetting('runtimeCatalogName', undefined);
		await updateSetting('testingCatalogName', undefined);
		while (createdFiles.length > 0) {
			fs.rmSync(createdFiles.pop()!, { force: true });
		}
	});

	suiteTeardown(() => {
		restoreCatalogServiceInstance();
	});

	suite('status bar', () => {
		let item: FakeStatusBarItem;

		const createStatusBar = () => {
			item = createFakeStatusBarItem();
			stub(vscode.window, 'createStatusBarItem', () => item);
			return service.createStatusBarItem();
		};

		test('stays hidden while no Kaoto file is active', async () => {
			createStatusBar();
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(item.visible).to.equal(false);
			expect(item.command).to.equal(COMMAND_SELECT_CAMEL_CATALOG);
		});

		test('shows the default integration catalog for an active integration file', async () => {
			await openAsText('status-bar.camel.yaml');

			createStatusBar();

			const label = `$(package) ${KaotoCatalogService.buildDisplayLabel(service.getDefaultIntegrationCatalog()!)}`;
			await waitFor(() => item.visible && item.text === label, `status bar shows ${label}`);
		});

		test('shows the default test catalog for an active Citrus test file', async () => {
			await openAsText('status-bar.citrus.yaml');

			createStatusBar();

			const label = `$(package) ${KaotoCatalogService.buildDisplayLabel(service.getDefaultTestCatalog()!)}`;
			await waitFor(() => item.visible && item.text === label, `status bar shows ${label}`);
		});

		test('stays hidden in a Maven project', async () => {
			writeWorkspaceFile('pom.xml', '<project/>');
			await openAsText('maven.camel.yaml');

			createStatusBar();
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(item.visible).to.equal(false);
		});

		test('follows the active editor', async () => {
			await openAsText('first.camel.yaml');
			createStatusBar();
			await waitFor(() => item.visible, 'status bar shows for the integration file');

			await openAsText('second.citrus.yaml');

			const label = `$(package) ${KaotoCatalogService.buildDisplayLabel(service.getDefaultTestCatalog()!)}`;
			await waitFor(() => item.text === label, `status bar switches to ${label}`);
		});

		test('shows the integration catalog selected in the settings once it changes', async () => {
			await openAsText('setting.camel.yaml');
			createStatusBar();
			await waitFor(() => item.visible, 'status bar shows for the integration file');
			const other = integrationCatalog(service.getDefaultIntegrationCatalog());

			await updateSetting('runtimeCatalogName', other.name);

			const label = `$(package) ${KaotoCatalogService.buildDisplayLabel(other)}`;
			await waitFor(() => item.text === label, `status bar switches to ${label}`);
		});

		test('disposes the status bar item with the service', () => {
			createStatusBar();

			service.dispose();

			expect(item.disposed).to.equal(true);
		});
	});

	suite('Red Hat Maven notification', () => {
		const redHatNotifications = () => infoMessages.filter((message) => message.includes('Red Hat Camel catalog'));

		test('is shown once for an active integration file with a Red Hat catalog', async function () {
			const catalog = service.getDefaultIntegrationCatalog()!;
			if (!catalog.version.includes('redhat')) {
				this.skip();
			}
			await openAsText('redhat.camel.yaml');
			stub(vscode.window, 'createStatusBarItem', createFakeStatusBarItem);
			service.createStatusBarItem();
			await waitFor(() => redHatNotifications().length === 1, 'the notification is shown');

			await openAsText('redhat-again.camel.yaml');
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(redHatNotifications()).to.have.lengthOf(1);
		});

		test('is not shown for an active Citrus test file', async () => {
			await openAsText('redhat.citrus.yaml');
			stub(vscode.window, 'createStatusBarItem', createFakeStatusBarItem);
			service.createStatusBarItem();
			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(redHatNotifications()).to.have.lengthOf(0);
		});
	});

	suite('selecting a catalog', () => {
		test('stores a Citrus catalog as the test catalog and any other as the integration catalog', async () => {
			const citrus = citrusCatalog();
			const integration = integrationCatalog();

			await service.setSelectedCatalog(citrus);
			await service.setSelectedCatalog(integration);

			const config = vscode.workspace.getConfiguration('kaoto');
			expect(config.get('testingCatalogName')).to.equal(citrus.name);
			expect(config.get('runtimeCatalogName')).to.equal(integration.name);
		});

		test('reopens the active editor when the integration catalog changes and the user asks for it', async () => {
			const uri = await openAsText('reopen.camel.yaml');
			stub(vscode.window, 'showInformationMessage', async (message: string) => {
				infoMessages.push(message);
				return message.includes('catalog version changed') ? 'Reopen' : undefined;
			});
			stub(vscode.commands, 'executeCommand', async (...args: unknown[]) => {
				executedCommands.push(args);
				return undefined;
			});

			await service.setSelectedIntegrationCatalog(integrationCatalog(service.getDefaultIntegrationCatalog()));

			expect(infoMessages).to.include('Integration catalog version changed. Reopen editor to apply changes.');
			// Other parts of the extension run setContext meanwhile
			const editorCommands = executedCommands.filter(([command]) => command !== 'setContext');
			expect(editorCommands.map(([command]) => command)).to.deep.equal(['workbench.action.closeActiveEditor', 'vscode.open']);
			expect((editorCommands[1][1] as vscode.Uri).fsPath).to.equal(uri.fsPath);
		});

		test('reports a failed reopen', async () => {
			await openAsText('reopen-fails.camel.yaml');
			stub(vscode.window, 'showInformationMessage', async () => 'Reopen');
			stub(vscode.commands, 'executeCommand', async () => {
				throw new Error('cannot close');
			});

			await service.setSelectedIntegrationCatalog(integrationCatalog(service.getDefaultIntegrationCatalog()));

			expect(errorMessages).to.include('Failed to reopen editor. Please close and reopen manually.');
		});

		test('asks to reopen an active Citrus test file when the test catalog changes', async () => {
			await openAsText('reopen.citrus.yaml');

			await service.setSelectedTestCatalog(citrusCatalog(service.getDefaultTestCatalog()));

			expect(infoMessages).to.include('Test catalog version changed. Reopen editor to apply changes.');
		});

		test('does not ask to reopen an active integration file when the test catalog changes', async () => {
			await openAsText('other-kind.camel.yaml');

			await service.setSelectedTestCatalog(citrusCatalog(service.getDefaultTestCatalog()));

			expect(infoMessages.filter((message) => message.includes('catalog version changed'))).to.have.lengthOf(0);
		});

		test('does not ask to reopen when the selected catalog stays the same', async () => {
			await openAsText('unchanged.camel.yaml');

			await service.setSelectedIntegrationCatalog(service.getDefaultIntegrationCatalog()!);

			expect(infoMessages.filter((message) => message.includes('catalog version changed'))).to.have.lengthOf(0);
		});

		test('falls back to the default catalog for an unknown catalog name and offers to select a valid one', async () => {
			await updateSetting('runtimeCatalogName', 'no-such-catalog');
			stub(vscode.window, 'showWarningMessage', async (message: string) => {
				warningMessages.push(message);
				return 'Select Valid Catalog';
			});
			stub(vscode.commands, 'executeCommand', async (...args: unknown[]) => {
				executedCommands.push(args);
				return undefined;
			});

			const catalog = await service.getSelectedIntegrationCatalog();

			expect(catalog).to.deep.equal(service.getDefaultIntegrationCatalog());
			expect(warningMessages).to.include('Kaoto: Invalid runtime catalog name "no-such-catalog". Using default instead.');
			await waitFor(() => executedCommands.some((args) => args[0] === COMMAND_SELECT_CAMEL_CATALOG), 'the catalog picker is opened');
		});
	});

	suite('catalog picker', () => {
		let pickedItems: (vscode.QuickPickItem & { catalog?: CatalogLibraryEntry })[];
		let placeHolder: string | undefined;

		const answerQuickPick = (choose: (items: typeof pickedItems) => (typeof pickedItems)[number] | undefined) => {
			stub(vscode.window, 'showQuickPick', async (items: typeof pickedItems, options: vscode.QuickPickOptions) => {
				pickedItems = items;
				placeHolder = options.placeHolder;
				return choose(items);
			});
		};

		const runtimesOf = (items: typeof pickedItems) => new Set(items.filter((item) => item.catalog).map((item) => item.catalog!.runtime.toLowerCase()));

		test('offers the integration catalogs grouped by runtime for an integration file and marks the current one', async () => {
			await openAsText('picker.camel.yaml');
			answerQuickPick(() => undefined);

			await service.showCatalogPicker();

			expect(placeHolder).to.equal('Select Camel Catalog Version');
			expect(runtimesOf(pickedItems)).to.not.include('citrus');
			expect(runtimesOf(pickedItems)).to.not.include('xslt');
			expect(pickedItems.some((item) => item.kind === vscode.QuickPickItemKind.Separator)).to.equal(true);
			const current = pickedItems.filter((item) => item.detail === 'Currently selected');
			expect(current).to.have.lengthOf(1);
			expect(current[0].label).to.equal(`$(check) ${KaotoCatalogService.buildDisplayLabel(service.getDefaultIntegrationCatalog()!)}`);
		});

		test('offers only the Citrus catalogs for a Citrus test file', async () => {
			await openAsText('picker.citrus.yaml');
			answerQuickPick(() => undefined);

			await service.showCatalogPicker();

			expect(placeHolder).to.equal('Select Citrus Catalog Version');
			expect([...runtimesOf(pickedItems)]).to.deep.equal(['citrus']);
		});

		test('stores the picked catalog', async () => {
			await openAsText('pick.camel.yaml');
			const other = integrationCatalog(service.getDefaultIntegrationCatalog());
			answerQuickPick((items) => items.find((item) => item.catalog?.name === other.name));

			const picked = await service.showCatalogPicker();

			expect(picked).to.equal(true);
			expect(vscode.workspace.getConfiguration('kaoto').get('runtimeCatalogName')).to.equal(other.name);
		});

		test('stores nothing when the picker is closed', async () => {
			await openAsText('cancel.camel.yaml');
			answerQuickPick(() => undefined);

			const picked = await service.showCatalogPicker();

			expect(picked).to.equal(false);
			expect(vscode.workspace.getConfiguration('kaoto').inspect('runtimeCatalogName')?.workspaceValue).to.be.undefined;
		});

		test('points to pom.xml in a Maven project instead of offering catalogs', async () => {
			writeWorkspaceFile('pom.xml', '<project/>');
			await openAsText('maven-picker.camel.yaml');
			let opened = false;
			stub(vscode.window, 'showQuickPick', async () => {
				opened = true;
				return undefined;
			});

			const picked = await service.showCatalogPicker();

			expect(picked).to.equal(false);
			expect(opened).to.equal(false);
			expect(infoMessages).to.include('Catalog version is managed by pom.xml in Maven projects.');
		});
	});
});
