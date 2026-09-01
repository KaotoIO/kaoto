import { workspace, window, Uri, RelativePattern } from 'vscode';
import { dirname } from 'path';
import { satisfies } from 'compare-versions';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';
import { ArgumentConflict, ArgumentConflictDetector } from '../../utils/ArgumentConflictDetector';
import { KaotoCatalogService } from '../../services/KaotoCatalogService';
import { RuntimeType, ExecutorType } from '../types/ExecutorTypes';
import {
	KAOTO_EXECUTOR_RUN_ARGUMENTS_SETTING_ID,
	KAOTO_EXECUTOR_RUN_SOURCE_DIR_ARGUMENTS_SETTING_ID,
	KAOTO_EXECUTOR_KUBERNETES_RUN_ARGUMENTS_SETTING_ID,
	KAOTO_EXECUTOR_EXPORT_ARGUMENTS_SETTING_ID,
	KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID,
	KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_SETTING_ID,
	KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_GLOBAL_SETTING_ID,
	KAOTO_EXECUTOR_TYPE_SETTING_ID,
} from '../../constants';
import { resolvePaths } from '../../utils/Path';
import { isRedHatBuild, normalizeVersionForSemver } from '../../utils/Version';

export interface ProcessedArguments {
	args: string[];
	conflicts: ArgumentConflict[];
}

interface CatalogContext {
	camelVersion: string;
	runtime: RuntimeType | '';
	frameworkVersion: string;
	executorType: ExecutorType | undefined;
}

/**
 * Helper class for processing Camel settings and arguments.
 * Catalog context is resolved once per instance via a cached promise.
 */
export class CamelSettingsHelper {
	private catalogContext: CatalogContext | undefined;
	private catalogContextPromise: Promise<CatalogContext> | undefined;

	private async ensureCatalogContext(resourceUri?: Uri): Promise<CatalogContext> {
		if (!this.catalogContextPromise) {
			this.catalogContextPromise = this.resolveCatalogContext(resourceUri);
			this.catalogContext = await this.catalogContextPromise;
		}
		return this.catalogContextPromise;
	}

	private async resolveCatalogContext(resourceUri?: Uri): Promise<CatalogContext> {
		const catalogService = KaotoCatalogService.getInstance();
		const catalog = await catalogService.getSelectedIntegrationCatalog(resourceUri);
		const executorType = workspace.getConfiguration().get<ExecutorType>(KAOTO_EXECUTOR_TYPE_SETTING_ID);

		return {
			camelVersion: catalogService.getCamelVersionForCLI(catalog, executorType) || '',
			runtime: catalogService.getRuntimeForCLI(catalog) || '',
			frameworkVersion: catalog?.frameworkVersion || '',
			executorType,
		};
	}

	async getRunArguments(filePath: string, cwd: string): Promise<ProcessedArguments> {
		await this.ensureCatalogContext(Uri.file(filePath));

		const runArgs = workspace.getConfiguration().get(KAOTO_EXECUTOR_RUN_ARGUMENTS_SETTING_ID) as string[];
		const xslFilteredArgs = await this.handleMissingXslFiles(filePath, runArgs);
		const processedArgs = await this.handleLocalKameletDirArgument(xslFilteredArgs, cwd);

		const result = ArgumentConflictDetector.mergeArguments(['--console'], processedArgs, 'run');
		return { args: result.merged, conflicts: result.conflicts };
	}

	async getRunSourceDirArguments(cwd: string): Promise<ProcessedArguments> {
		await this.ensureCatalogContext(Uri.file(cwd));

		const runArgs = workspace.getConfiguration().get(KAOTO_EXECUTOR_RUN_SOURCE_DIR_ARGUMENTS_SETTING_ID) as string[];
		const processedArgs = await this.handleLocalKameletDirArgument(runArgs, cwd);

		const result = ArgumentConflictDetector.mergeArguments(['--console'], processedArgs, 'runSourceDir');
		return { args: result.merged, conflicts: result.conflicts };
	}

	async getExportArguments(cwd: string): Promise<ProcessedArguments> {
		await this.ensureCatalogContext(Uri.file(cwd));

		const exportArgs = workspace.getConfiguration().get(KAOTO_EXECUTOR_EXPORT_ARGUMENTS_SETTING_ID) as string[];
		const processedArgs = await this.handleLocalKameletDirArgument(exportArgs, cwd);
		return { args: processedArgs, conflicts: [] };
	}

	async getKubernetesRunArguments(cwd: string): Promise<ProcessedArguments> {
		await this.ensureCatalogContext(Uri.file(cwd));

		const kubernetesArgs = workspace.getConfiguration().get(KAOTO_EXECUTOR_KUBERNETES_RUN_ARGUMENTS_SETTING_ID) as string[];
		const result = ArgumentConflictDetector.mergeArguments([], kubernetesArgs, 'kubernetesRun');
		return { args: result.merged, conflicts: result.conflicts };
	}

	getPortArgument(port?: number, userArgs: string[] = []): { argument: string; resolvedPort: number } {
		const userDefinedPort = ArgumentConflictDetector.extractPortValue(userArgs);

		if (userDefinedPort !== undefined) {
			return { argument: '', resolvedPort: userDefinedPort };
		}

		const ctx = this.getCatalogContextSync();
		const normalizedVersion = normalizeVersionForSemver(ctx.camelVersion);
		const useManagementPort =
			ctx.runtime === RuntimeType.QUARKUS || ctx.runtime === RuntimeType.SPRING_BOOT || !normalizedVersion || satisfies(normalizedVersion, '>=4.14');
		const effectivePort = port ?? 8080;
		const argument = useManagementPort ? `--management-port=${effectivePort}` : `--port=${effectivePort}`;

		return { argument, resolvedPort: effectivePort };
	}

	/**
	 * Get Camel version argument from catalog selection.
	 * Returns empty string for Camel Launcher (version baked into JAR) and
	 * for JBang with Quarkus/Spring Boot (version passed via system properties).
	 */
	async getCamelVersionArgument(userArgs: string[] = []): Promise<string> {
		if (ArgumentConflictDetector.hasArgument(userArgs, 'camel-version')) {
			return '';
		}

		const ctx = await this.ensureCatalogContext();

		if (ctx.executorType === 'camel-launcher') {
			return '';
		}

		if (ctx.runtime === RuntimeType.QUARKUS || ctx.runtime === RuntimeType.SPRING_BOOT) {
			return '';
		}

		return ctx.camelVersion ? `--camel-version=${ctx.camelVersion}` : '';
	}

	/**
	 * Get Quarkus-related CLI arguments for JBang.
	 * Due to Camel JBang CLI bugs, these need to be provided as CLI arguments in addition to system properties.
	 */
	async getQuarkusArguments(userArgs: string[] = []): Promise<string[]> {
		const ctx = await this.ensureCatalogContext();

		if (ctx.runtime !== RuntimeType.QUARKUS || !ctx.camelVersion) {
			return [];
		}

		const args: string[] = [];

		if (!ArgumentConflictDetector.hasArgument(userArgs, 'quarkus-version')) {
			args.push(`--quarkus-version=${ctx.frameworkVersion}`);
		}

		if (isRedHatBuild(ctx.camelVersion) && !ArgumentConflictDetector.hasArgument(userArgs, 'quarkus-group-id')) {
			args.push('--quarkus-group-id=com.redhat.quarkus.platform');
		}

		return args;
	}

	/**
	 * Get Spring Boot-related CLI arguments for JBang.
	 * Due to Camel JBang CLI bugs, these need to be provided as CLI arguments in addition to system properties.
	 */
	async getSpringBootArguments(userArgs: string[] = []): Promise<string[]> {
		const ctx = await this.ensureCatalogContext();

		if (ctx.runtime !== RuntimeType.SPRING_BOOT || !ctx.camelVersion) {
			return [];
		}

		const args: string[] = [];

		if (!ArgumentConflictDetector.hasArgument(userArgs, 'camel-spring-boot-version')) {
			args.push(`--camel-spring-boot-version=${ctx.camelVersion}`);
		}

		if (ctx.frameworkVersion && !ArgumentConflictDetector.hasArgument(userArgs, 'spring-boot-version')) {
			args.push(`--spring-boot-version=${ctx.frameworkVersion}`);
		}

		return args;
	}

	getRuntimeArgument(userArgs: string[] = []): string {
		if (ArgumentConflictDetector.hasArgument(userArgs, 'runtime')) {
			return '';
		}

		const ctx = this.getCatalogContextSync();
		return ctx.runtime ? `--runtime=${ctx.runtime}` : '';
	}

	async getRedHatMavenRepositoryArgument(userArgs: string[] = []): Promise<string> {
		if (ArgumentConflictDetector.hasArgument(userArgs, 'repos')) {
			return '';
		}

		const ctx = await this.ensureCatalogContext();
		if (isRedHatBuild(ctx.camelVersion)) {
			const url = workspace.getConfiguration().get(KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_SETTING_ID) as string;
			const reposPlaceholder = this.getCamelGlobalRepos();
			return url ? `--repos=${reposPlaceholder}${url}` : '';
		}
		return '';
	}

	/**
	 * Synchronous access to already-resolved catalog context.
	 * Only safe to call after ensureCatalogContext() has been awaited
	 * (guaranteed by getRunArguments/getRunSourceDirArguments/etc. calling it first).
	 */
	private getCatalogContextSync(): CatalogContext {
		return this.catalogContext ?? { camelVersion: '', runtime: '', frameworkVersion: '', executorType: undefined };
	}

	/**
	 * Show warnings for detected argument conflicts
	 */
	async showConflictWarnings(conflicts: ArgumentConflict[]): Promise<void> {
		if (conflicts.length === 0) {
			return;
		}

		const message =
			`Camel argument conflicts detected (user settings override code defaults):\n` +
			conflicts.map((c) => `  - ${c.argument}: code="${c.codeValue}" overridden by user="${c.userValue}"`).join('\n');

		KaotoOutputChannel.logWarning(message);

		const selection = await window.showInformationMessage(
			`Camel: ${conflicts.length} argument(s) overridden by user settings. Check output for details.`,
			'View Output',
		);
		if (selection === 'View Output') {
			KaotoOutputChannel.getInstance().show();
		}
	}

	/**
	 * Handle local kamelet directory argument
	 */
	private async handleLocalKameletDirArgument(runArgs: string[], cwd: string): Promise<string[]> {
		const localKameletDirIndex = runArgs.findIndex((parameter) => parameter.startsWith('--local-kamelet-dir'));

		// If already present, resolve paths
		if (localKameletDirIndex !== -1) {
			runArgs[localKameletDirIndex] = await this.resolveAlreadyExistingLocalKameletDirArgument(runArgs[localKameletDirIndex], cwd);
			return runArgs;
		}

		// Try to get from global setting
		const localKameletDirectoriesGlobalArgument = await this.resolveLocalKameletDirsFromGlobalSetting(cwd);
		if (!localKameletDirectoriesGlobalArgument) {
			return runArgs;
		}

		return [...runArgs, localKameletDirectoriesGlobalArgument];
	}

	/**
	 * Resolve existing local kamelet directory argument
	 */
	private async resolveAlreadyExistingLocalKameletDirArgument(existingKameletDirArgument: string, cwd: string): Promise<string> {
		const kameletDirPaths = existingKameletDirArgument
			.replace('--local-kamelet-dir=', '')
			.split(',')
			.map((path) => path.trim());
		const resolvedKameletDirPaths = resolvePaths(kameletDirPaths, cwd);
		return `--local-kamelet-dir=${Array.from(resolvedKameletDirPaths).join(',')}`;
	}

	/**
	 * Resolve local kamelet directories from global setting
	 */
	private async resolveLocalKameletDirsFromGlobalSetting(cwd: string): Promise<string | undefined> {
		const localKameletDirectories = workspace.getConfiguration().get(KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID) as string[];
		if (localKameletDirectories.length > 0) {
			return `--local-kamelet-dir=${Array.from(resolvePaths(localKameletDirectories, cwd)).join(',')}`;
		}
		return undefined;
	}

	/**
	 * Get Camel global repos prefix
	 */
	private getCamelGlobalRepos(): string {
		const globalRepos = workspace.getConfiguration().get(KAOTO_EXECUTOR_RED_HAT_MAVEN_REPOSITORY_GLOBAL_SETTING_ID) as boolean;
		return globalRepos ? '#repos,' : '';
	}

	/**
	 * Handle missing XSL files in run arguments
	 * Mainly in ZSH shell there is problem when Camel is executed with non existing files
	 * added using '*.xsl' file pattern - it is caused by null glob option disabled by default for ZSH shell
	 */
	private async handleMissingXslFiles(filePath: string, runArgs: string[]): Promise<string[]> {
		const folderUri = Uri.file(dirname(filePath));
		const xsls = await workspace.findFiles(new RelativePattern(folderUri, '*.xsl'));
		if (xsls.length > 0) {
			return runArgs; // don't modify default run arguments which should contain *.xsl
		} else {
			return runArgs.filter((parameter) => parameter !== '*.xsl');
		}
	}
}
