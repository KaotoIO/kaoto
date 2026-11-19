import { expect } from 'chai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { CamelSettingsHelper } from '../../executors/helpers/CamelSettingsHelper';
import { ExecutorType } from '../../executors/types/ExecutorTypes';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';
import {
	KAOTO_EXECUTOR_KUBERNETES_RUN_ARGUMENTS_SETTING_ID,
	KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_GLOBAL_SETTING_ID,
	KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_SETTING_ID,
	KAOTO_EXECUTOR_RUN_ARGUMENTS_SETTING_ID,
	KAOTO_EXECUTOR_TYPE_SETTING_ID,
	KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID,
} from '../../constants';
import { initializeKaotoCatalogService, preserveKaotoCatalogServiceInstance } from '../utils/TestSetup';

const RED_HAT_REPOSITORY = 'https://maven.repository.redhat.com/ga/';

suite('CamelSettingsHelper arguments from the catalog and the settings', () => {
	const restores: (() => void)[] = [];
	let catalogService: KaotoCatalogService;
	let restoreCatalogServiceInstance: () => void;
	let helper: CamelSettingsHelper;
	let folder: string;

	const stub = (target: object, key: string, value: unknown) => {
		const original = (target as Record<string, unknown>)[key];
		Object.defineProperty(target, key, { value, configurable: true });
		restores.push(() => Object.defineProperty(target, key, { value: original, configurable: true }));
	};

	const catalog = (runtime: string, version: string): CatalogLibraryEntry => {
		const found = catalogService.getCatalogs().find((entry) => entry.runtime === runtime && entry.version === version);
		if (!found) {
			throw new Error(`No bundled ${runtime} catalog ${version}`);
		}
		return found;
	};

	/** Make the helper resolve this catalog; the given settings override their configured values */
	const select = (selected: CatalogLibraryEntry, settings: Record<string, unknown> = {}) => {
		stub(catalogService, 'getSelectedIntegrationCatalog', async () => selected);
		const originalGetConfiguration = vscode.workspace.getConfiguration;
		stub(vscode.workspace, 'getConfiguration', (section?: string, scope?: vscode.ConfigurationScope | null) => {
			const config = originalGetConfiguration(section, scope);
			return { ...config, get: (key: string, defaultValue?: unknown) => (key in settings ? settings[key] : config.get(key, defaultValue)) };
		});
	};

	const executor = (type: ExecutorType) => ({ [KAOTO_EXECUTOR_TYPE_SETTING_ID]: type });

	suiteSetup(async () => {
		restoreCatalogServiceInstance = preserveKaotoCatalogServiceInstance();
		catalogService = await initializeKaotoCatalogService();
	});

	setup(() => {
		helper = new CamelSettingsHelper();
		folder = fs.mkdtempSync(path.join(os.tmpdir(), 'kaoto-settings-helper-'));
	});

	teardown(() => {
		while (restores.length > 0) {
			restores.pop()!();
		}
		fs.rmSync(folder, { recursive: true, force: true });
	});

	suiteTeardown(() => {
		restoreCatalogServiceInstance();
	});

	suite('Quarkus arguments', () => {
		test('pass the Quarkus platform version of a Quarkus catalog', async () => {
			const quarkus = catalog('Quarkus', '3.33.3');
			select(quarkus, executor('jbang'));

			expect(await helper.getQuarkusArguments()).to.deep.equal([`--quarkus-version=${quarkus.frameworkVersion}`]);
		});

		test('also pass the Red Hat Quarkus group id for a Red Hat Quarkus catalog', async () => {
			const quarkus = catalog('Quarkus', '3.33.0.redhat-00010');
			select(quarkus, executor('jbang'));

			expect(await helper.getQuarkusArguments()).to.deep.equal([
				`--quarkus-version=${quarkus.frameworkVersion}`,
				'--quarkus-group-id=com.redhat.quarkus.platform',
			]);
		});

		test('leave out what the user already passes', async () => {
			select(catalog('Quarkus', '3.33.0.redhat-00010'), executor('jbang'));

			expect(await helper.getQuarkusArguments(['--quarkus-version=3.0.0', '--quarkus-group-id=io.quarkus'])).to.deep.equal([]);
		});

		test('are empty for a catalog of another runtime', async () => {
			select(catalog('Main', '4.18.4'), executor('jbang'));

			expect(await helper.getQuarkusArguments()).to.deep.equal([]);
		});
	});

	suite('runtime argument', () => {
		test('names the runtime of the selected catalog', async () => {
			select(catalog('Quarkus', '3.33.3'), executor('jbang'));
			await helper.getRunSourceDirArguments(folder);

			expect(helper.getRuntimeArgument()).to.equal('--runtime=quarkus');
		});

		test('is left out when the user already passes a runtime', async () => {
			select(catalog('Quarkus', '3.33.3'), executor('jbang'));
			await helper.getRunSourceDirArguments(folder);

			expect(helper.getRuntimeArgument(['--runtime=spring-boot'])).to.equal('');
		});

		test('is empty before the catalog is resolved', () => {
			expect(helper.getRuntimeArgument()).to.equal('');
		});
	});

	suite('Camel version argument', () => {
		test('passes the catalog version for Camel Main with JBang', async () => {
			select(catalog('Main', '4.18.4'), executor('jbang'));

			expect(await helper.getCamelVersionArgument()).to.equal('--camel-version=4.18.4');
		});

		for (const [description, runtime, version, executorType] of [
			['with the Camel Launcher, which brings its own version', 'Main', '4.18.4', 'camel-launcher'],
			['for Quarkus, which gets the version as a system property', 'Quarkus', '3.33.3', 'jbang'],
		] as const) {
			test(`is left out ${description}`, async () => {
				select(catalog(runtime, version), executor(executorType));

				expect(await helper.getCamelVersionArgument()).to.equal('');
			});
		}
	});

	suite('Red Hat Maven repository argument', () => {
		test('adds the Red Hat repository to the global repositories for a Red Hat catalog', async () => {
			select(catalog('Main', '4.18.3.redhat-00005'), {
				[KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_SETTING_ID]: RED_HAT_REPOSITORY,
				[KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_GLOBAL_SETTING_ID]: true,
			});

			expect(await helper.getRedHatMavenRepositoryArgument()).to.equal(`--repos=#repos,${RED_HAT_REPOSITORY}`);
		});

		test('passes only the Red Hat repository when it should not be added to the global ones', async () => {
			select(catalog('Main', '4.18.3.redhat-00005'), {
				[KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_SETTING_ID]: RED_HAT_REPOSITORY,
				[KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_GLOBAL_SETTING_ID]: false,
			});

			expect(await helper.getRedHatMavenRepositoryArgument()).to.equal(`--repos=${RED_HAT_REPOSITORY}`);
		});

		test('is left out when no Red Hat repository is configured', async () => {
			select(catalog('Main', '4.18.3.redhat-00005'), { [KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_SETTING_ID]: '' });

			expect(await helper.getRedHatMavenRepositoryArgument()).to.equal('');
		});

		test('is left out for a community catalog', async () => {
			select(catalog('Main', '4.18.4'));

			expect(await helper.getRedHatMavenRepositoryArgument()).to.equal('');
		});
	});

	suite('port argument', () => {
		for (const [description, version, expected] of [
			['the HTTP port before Camel 4.14', '4.10.7', '--port=8081'],
			['the management port from Camel 4.14 on', '4.14.9', '--management-port=8081'],
		] as const) {
			test(`uses ${description}`, async () => {
				select(catalog('Main', version), executor('jbang'));
				await helper.getRunSourceDirArguments(folder);

				expect(helper.getPortArgument(8081).argument).to.equal(expected);
			});
		}

		test('defaults to port 8080', () => {
			expect(helper.getPortArgument().resolvedPort).to.equal(8080);
		});
	});

	suite('run arguments', () => {
		const testFile = () => path.join(folder, 'route.camel.yaml');

		test('pass the Kubernetes run arguments of the settings', async () => {
			select(catalog('Main', '4.18.4'), { [KAOTO_EXECUTOR_KUBERNETES_RUN_ARGUMENTS_SETTING_ID]: ['--cluster-type=kind', '--dev'] });

			const { args, conflicts } = await helper.getKubernetesRunArguments(folder);

			expect(args).to.deep.equal(['--cluster-type=kind', '--dev']);
			expect(conflicts).to.deep.equal([]);
		});

		test('resolve the local Kamelet folders of the run arguments against the working folder', async () => {
			select(catalog('Main', '4.18.4'), {
				[KAOTO_EXECUTOR_RUN_ARGUMENTS_SETTING_ID]: ['--local-kamelet-dir=kamelets, shared/kamelets'],
				[KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID]: ['ignored'],
			});

			const { args } = await helper.getRunArguments(testFile(), folder);

			expect(args).to.include(`--local-kamelet-dir=${path.join(folder, 'kamelets')},${path.join(folder, 'shared', 'kamelets')}`);
			expect(args.filter((arg) => arg.startsWith('--local-kamelet-dir'))).to.have.lengthOf(1);
		});

		test('add the local Kamelet folders of the settings when the run arguments have none', async () => {
			select(catalog('Main', '4.18.4'), {
				[KAOTO_EXECUTOR_RUN_ARGUMENTS_SETTING_ID]: ['--dev'],
				[KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID]: ['kamelets'],
			});

			const { args } = await helper.getRunArguments(testFile(), folder);

			expect(args).to.include(`--local-kamelet-dir=${path.join(folder, 'kamelets')}`);
		});

		test('add no local Kamelet folder when the settings have none', async () => {
			select(catalog('Main', '4.18.4'), { [KAOTO_EXECUTOR_RUN_ARGUMENTS_SETTING_ID]: ['--dev'], [KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID]: [] });

			const { args } = await helper.getRunArguments(testFile(), folder);

			expect(args.some((arg) => arg.startsWith('--local-kamelet-dir'))).to.equal(false);
		});

		for (const [description, files, kept] of [
			['drop the *.xsl pattern when the folder has no XSL file', [], false],
			['keep the *.xsl pattern when the folder has an XSL file', ['transform.xsl'], true],
		] as const) {
			test(description, async () => {
				for (const file of files) {
					fs.writeFileSync(path.join(folder, file), '<xsl:stylesheet/>');
				}
				select(catalog('Main', '4.18.4'), {
					[KAOTO_EXECUTOR_RUN_ARGUMENTS_SETTING_ID]: ['--dev', '*.xsl'],
					[KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID]: [],
				});

				const { args } = await helper.getRunArguments(testFile(), folder);

				expect(args.includes('*.xsl')).to.equal(kept);
			});
		}
	});

	suite('conflict warnings', () => {
		let messages: string[];
		let answer: string | undefined;
		let shownOutput: boolean;

		setup(() => {
			messages = [];
			answer = undefined;
			shownOutput = false;
			stub(vscode.window, 'showInformationMessage', async (message: string) => {
				messages.push(message);
				return answer;
			});
			stub(KaotoOutputChannel.getInstance(), 'show', () => {
				shownOutput = true;
			});
		});

		const conflict = { argument: 'console', codeValue: '(flag)', userValue: '(flag)', context: 'run' };

		test('say nothing without conflicts', async () => {
			await helper.showConflictWarnings([]);

			expect(messages).to.deep.equal([]);
		});

		test('report the number of overridden arguments', async () => {
			await helper.showConflictWarnings([conflict, { ...conflict, argument: 'port' }]);

			expect(messages).to.deep.equal(['Camel: 2 argument(s) overridden by user settings. Check output for details.']);
			expect(shownOutput).to.equal(false);
		});

		test('show the output on request', async () => {
			answer = 'View Output';

			await helper.showConflictWarnings([conflict]);

			expect(shownOutput).to.equal(true);
		});
	});
});
