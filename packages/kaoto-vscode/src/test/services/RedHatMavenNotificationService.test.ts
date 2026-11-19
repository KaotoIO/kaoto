import { expect } from 'chai';
import * as vscode from 'vscode';
import { RedHatMavenNotificationService } from '../../services/RedHatMavenNotificationService';

const RED_HAT_VERSION = '4.18.3.redhat-00005';
const COMMUNITY_VERSION = '4.18.0';

suite('RedHatMavenNotificationService', () => {
	const restores: (() => void)[] = [];
	let globalState: Map<string, unknown>;
	let messages: { message: string; actions: string[] }[];
	let answer: string | undefined;
	let openedUris: vscode.Uri[];
	let service: RedHatMavenNotificationService;

	const stub = (target: object, key: string, value: unknown) => {
		const original = (target as Record<string, unknown>)[key];
		Object.defineProperty(target, key, { value, configurable: true });
		restores.push(() => Object.defineProperty(target, key, { value: original, configurable: true }));
	};

	setup(() => {
		globalState = new Map();
		messages = [];
		answer = undefined;
		openedUris = [];
		stub(vscode.window, 'showInformationMessage', async (message: string, ...actions: string[]) => {
			messages.push({ message, actions });
			return actions.length > 0 ? answer : undefined;
		});
		stub(vscode.env, 'openExternal', async (uri: vscode.Uri) => {
			openedUris.push(uri);
			return true;
		});
		const context = {
			globalState: {
				get: (key: string, defaultValue?: unknown) => (globalState.has(key) ? globalState.get(key) : defaultValue),
				update: async (key: string, value: unknown) => {
					globalState.set(key, value);
				},
			},
		} as unknown as vscode.ExtensionContext;
		service = new RedHatMavenNotificationService(context);
	});

	teardown(() => {
		while (restores.length > 0) {
			restores.pop()!();
		}
	});

	test('recognizes Red Hat catalog versions', () => {
		expect(service.isRedHatCatalog(RED_HAT_VERSION)).to.equal(true);
		expect(service.isRedHatCatalog(COMMUNITY_VERSION)).to.equal(false);
	});

	test('asks about the Maven settings for a Red Hat catalog with JBang', async () => {
		await service.showRedHatMavenNotification(RED_HAT_VERSION, 'jbang');

		expect(messages).to.have.lengthOf(1);
		expect(messages[0].message).to.include(`Red Hat Camel catalog (${RED_HAT_VERSION}) with JBang CLI`);
		expect(messages[0].actions).to.deep.equal(['View Documentation', "Don't Show Again"]);
	});

	for (const [description, version, executor] of [
		['with the Camel Launcher', RED_HAT_VERSION, 'camel-launcher'],
		['for a community catalog', COMMUNITY_VERSION, 'jbang'],
	]) {
		test(`does not ask ${description}`, async () => {
			await service.showRedHatMavenNotification(version, executor);

			expect(messages).to.have.lengthOf(0);
		});
	}

	test('opens the Red Hat Maven documentation when asked to', async () => {
		answer = 'View Documentation';

		await service.showRedHatMavenNotification(RED_HAT_VERSION, 'jbang');

		expect(openedUris).to.have.lengthOf(1);
		expect(openedUris[0].authority).to.equal('docs.redhat.com');
	});

	test('stops asking once the user chose not to be asked again', async () => {
		answer = "Don't Show Again";
		await service.showRedHatMavenNotification(RED_HAT_VERSION, 'jbang');
		messages = [];

		await service.showRedHatMavenNotification(RED_HAT_VERSION, 'jbang');

		expect(messages).to.have.lengthOf(0);
		expect(globalState.get('kaoto.redhat.maven.notification.dontShowAgain')).to.equal(true);
	});

	test('confirms that it will not ask again', async () => {
		answer = "Don't Show Again";

		await service.showRedHatMavenNotification(RED_HAT_VERSION, 'jbang');

		expect(messages.map(({ message }) => message)).to.include('Red Hat Maven notification disabled. You can re-enable it in extension settings.');
	});
});
