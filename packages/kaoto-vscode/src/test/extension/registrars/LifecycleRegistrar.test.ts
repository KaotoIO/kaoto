import { expect } from 'chai';
import * as vscode from 'vscode';
import { TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import { RecommendationCore } from '@redhat-developer/vscode-extension-proposals';
import { COMMAND_WHATS_NEW_SHOW, STATE_LAST_WHATS_NEW_SHOWN_VERSION } from '../../../constants';
import { LifecycleRegistrar } from '../../../extension/registrars/LifecycleRegistrar';
import { WhatsNewPanel } from '../../../extension/WhatsNewPanel';

suite('LifecycleRegistrar', () => {
	const restores: (() => void)[] = [];
	let globalState: Map<string, unknown>;
	let commandHandlers: Map<string, () => Promise<void>>;
	let shownVersions: string[];
	let panelFails: boolean;
	let telemetryEvents: TelemetryEvent[];
	let originalDisableWhatsNew: string | undefined;

	const stub = (target: object, key: string, value: unknown) => {
		const original = (target as Record<string, unknown>)[key];
		Object.defineProperty(target, key, { value, configurable: true });
		restores.push(() => Object.defineProperty(target, key, { value: original, configurable: true }));
	};

	const createRegistrar = (version: string | undefined) => {
		const context = {
			extension: { packageJSON: { version } },
			subscriptions: [] as vscode.Disposable[],
			globalState: {
				get: (key: string, defaultValue?: unknown) => (globalState.has(key) ? globalState.get(key) : defaultValue),
				update: async (key: string, value: unknown) => {
					globalState.set(key, value);
				},
			},
		} as unknown as vscode.ExtensionContext;
		const telemetry = {
			send: async (event: TelemetryEvent) => {
				telemetryEvents.push(event);
			},
		} as unknown as TelemetryService;
		return new LifecycleRegistrar(context, telemetry);
	};

	setup(() => {
		globalState = new Map();
		commandHandlers = new Map();
		shownVersions = [];
		panelFails = false;
		telemetryEvents = [];
		originalDisableWhatsNew = process.env['KAOTO_DISABLE_WHATS_NEW'];
		delete process.env['KAOTO_DISABLE_WHATS_NEW'];
		// The extension under test has registered its commands already
		stub(vscode.commands, 'registerCommand', (id: string, handler: () => Promise<void>) => {
			commandHandlers.set(id, handler);
			return { dispose: () => commandHandlers.delete(id) };
		});
		stub(WhatsNewPanel, 'show', async (_context: vscode.ExtensionContext, version: string) => {
			if (panelFails) {
				throw new Error('no release notes');
			}
			shownVersions.push(version);
		});
	});

	teardown(() => {
		while (restores.length > 0) {
			restores.pop()!();
		}
		if (originalDisableWhatsNew === undefined) {
			delete process.env['KAOTO_DISABLE_WHATS_NEW'];
		} else {
			process.env['KAOTO_DISABLE_WHATS_NEW'] = originalDisableWhatsNew;
		}
	});

	suite("What's New", () => {
		test('is shown after the first install and remembered', async () => {
			await createRegistrar('2.12.0').showWhatsNewIfNeeded();

			expect(shownVersions).to.deep.equal(['2.12.0']);
			expect(globalState.get(STATE_LAST_WHATS_NEW_SHOWN_VERSION)).to.equal('2.12.0');
		});

		test('is shown after an upgrade', async () => {
			globalState.set(STATE_LAST_WHATS_NEW_SHOWN_VERSION, '2.11.3');

			await createRegistrar('2.12.0').showWhatsNewIfNeeded();

			expect(shownVersions).to.deep.equal(['2.12.0']);
		});

		for (const lastShown of ['2.12.0', '2.13.0']) {
			test(`is not shown again when it was shown for ${lastShown}`, async () => {
				globalState.set(STATE_LAST_WHATS_NEW_SHOWN_VERSION, lastShown);

				await createRegistrar('2.12.0').showWhatsNewIfNeeded();

				expect(shownVersions).to.deep.equal([]);
			});
		}

		test('is not shown when it is turned off for the environment', async () => {
			process.env['KAOTO_DISABLE_WHATS_NEW'] = 'true';

			await createRegistrar('2.12.0').showWhatsNewIfNeeded();

			expect(shownVersions).to.deep.equal([]);
			expect(commandHandlers.has(COMMAND_WHATS_NEW_SHOW)).to.equal(true);
		});

		test('is not shown without an extension version', async () => {
			await createRegistrar(undefined).showWhatsNewIfNeeded();

			expect(shownVersions).to.deep.equal([]);
		});

		test('is shown again next time when it could not be shown', async () => {
			panelFails = true;

			await createRegistrar('2.12.0').showWhatsNewIfNeeded();

			expect(globalState.has(STATE_LAST_WHATS_NEW_SHOWN_VERSION)).to.equal(false);
		});
	});

	suite("What's New command", () => {
		test('shows the release notes of the installed version and tracks the command', async () => {
			process.env['KAOTO_DISABLE_WHATS_NEW'] = 'true';
			await createRegistrar('2.12.0').showWhatsNewIfNeeded();

			await commandHandlers.get(COMMAND_WHATS_NEW_SHOW)!();

			expect(shownVersions).to.deep.equal(['2.12.0']);
			expect(telemetryEvents.map((event) => event.properties?.identifier)).to.deep.equal([COMMAND_WHATS_NEW_SHOW]);
		});

		test('does not fail when the release notes cannot be shown', async () => {
			process.env['KAOTO_DISABLE_WHATS_NEW'] = 'true';
			await createRegistrar('2.12.0').showWhatsNewIfNeeded();
			panelFails = true;

			await commandHandlers.get(COMMAND_WHATS_NEW_SHOW)!();

			expect(telemetryEvents).to.deep.equal([]);
		});
	});

	test("recommends the XML and YAML extensions and shows What's New when registered", async () => {
		const recommended: string[] = [];
		stub(RecommendationCore, 'getService', () => ({
			create: (extensionId: string) => extensionId,
			register: async (recommendations: string[]) => {
				recommended.push(...recommendations);
			},
		}));

		await createRegistrar('2.12.0').register();

		expect(recommended).to.deep.equal(['redhat.vscode-xml', 'redhat.vscode-yaml']);
		expect(shownVersions).to.deep.equal(['2.12.0']);
	});
});
