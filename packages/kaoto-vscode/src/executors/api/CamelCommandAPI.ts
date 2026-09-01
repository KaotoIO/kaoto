import { execFile } from 'child_process'; // NOSONAR
import { promisify } from 'util'; // NOSONAR
import { dirname, relative } from 'path'; // NOSONAR
import { workspace } from 'vscode';
import { CamelExecutorFactory } from '../CamelExecutorFactory';
import { CamelCommandBuilder } from '../builders/CamelCommandBuilder';
import {
	CamelCommand,
	CommandArg,
	CommandArguments,
	CommandResult,
	InfraRunningServiceDetails,
	InfraServiceDefinition,
	RuntimeType,
} from '../types/ExecutorTypes';
import { CamelSettingsHelper } from '../helpers/CamelSettingsHelper';
import { TestFolderResolver } from '../../services/TestFolderResolver';
import { arePathsEqual } from '../../utils/Path';
import { KAOTO_EXECUTOR_INFRA_ARGUMENTS_SETTING_ID } from '../../constants';
import { KaotoOutputChannel } from '../../extension/KaotoOutputChannel';

interface ResolvedSettings {
	camelVersionArg: string;
	quarkusArgs: string[];
	springBootArgs: string[];
	reposArg: string;
}

const sq = CamelCommandBuilder.strongQuote;

/**
 * High-level API for executing Camel commands.
 * Used by task classes to abstract executor details.
 * Integrates user settings from VS Code configuration.
 *
 * Uses ShellQuotedString.Strong (via sq()) for args that may contain
 * shell-sensitive characters: file paths (spaces, special chars),
 * --option=path args, URLs, and args with # or dots.
 * Plain strings are used for command keywords and simple flags.
 */
export class CamelCommandAPI {
	private static async resolveCommonSettings(settingsHelper: CamelSettingsHelper, userArgs: string[]): Promise<ResolvedSettings> {
		const [camelVersionArg, quarkusArgs, springBootArgs, reposArg] = await Promise.all([
			settingsHelper.getCamelVersionArgument(userArgs),
			settingsHelper.getQuarkusArguments(userArgs),
			settingsHelper.getSpringBootArguments(userArgs),
			settingsHelper.getRedHatMavenRepositoryArgument(userArgs),
		]);
		return { camelVersionArg, quarkusArgs, springBootArgs, reposArg };
	}

	private static applyPortOverride(result: CommandResult, portArg: string, resolvedPort: number): CommandResult {
		if (portArg) {
			return { ...result, resolvedPort };
		}
		return result;
	}

	private static async executeSimple(command: CamelCommand, args: CommandArguments, cwd?: string): Promise<CommandResult> {
		const executor = await CamelExecutorFactory.createExecutor();
		return await executor.execute(command, args, { cwd });
	}

	/**
	 * Execute a Camel command and capture its stdout output as a string.
	 * Used for commands that need to read CLI output in-process (e.g. infra list, infra ps).
	 *
	 * Builds the command via the executor system (preserving executor type, version, and
	 * quoting), then runs it with execFile so each argument keeps its own boundaries
	 * without shell interpolation.
	 */
	private static async captureOutput(command: CamelCommand, args: CommandArguments, cwd?: string): Promise<string> {
		const execFilePromise = promisify(execFile);
		const result = await this.executeSimple(command, args, cwd);
		const { execution } = result;

		const binary = typeof execution.command === 'string' ? execution.command : (execution.command?.value ?? 'jbang');
		const argList = execution.args?.map((arg) => (typeof arg === 'string' ? arg : arg.value)) ?? [];

		const { stdout, stderr } = await execFilePromise(binary, argList, { cwd });
		return stdout || stderr;
	}

	/**
	 * Quote resolved settings values that may contain URLs or special chars.
	 */
	private static quoteCommonSettings(common: ResolvedSettings): CommandArg[] {
		return CamelCommandBuilder.filterEmptyArgs([sq(common.camelVersionArg), ...common.quarkusArgs, ...common.springBootArgs, sq(common.reposArg)]);
	}

	/**
	 * Run a Camel integration with user settings
	 */
	static async run(filePath: string, cwd: string, port?: number, additionalArgs: CommandArguments = []): Promise<CommandResult> {
		const executor = await CamelExecutorFactory.createExecutor();
		const settingsHelper = new CamelSettingsHelper();

		const { args: userArgs, conflicts } = await settingsHelper.getRunArguments(filePath, cwd);
		const { argument: portArg, resolvedPort } = settingsHelper.getPortArgument(port, userArgs);
		const runtimeArg = settingsHelper.getRuntimeArgument(userArgs);
		const common = await this.resolveCommonSettings(settingsHelper, userArgs);

		await settingsHelper.showConflictWarnings(conflicts);

		const args: CommandArguments = CamelCommandBuilder.filterEmptyArgs([
			sq(filePath),
			portArg,
			runtimeArg,
			...userArgs,
			...additionalArgs,
			...this.quoteCommonSettings(common),
		]);

		const result = await executor.execute('run', args, { cwd });
		return this.applyPortOverride(result, portArg, resolvedPort);
	}

	/**
	 * Run a Camel integration from source directory with user settings
	 */
	static async runSourceDir(sourceDir: string, port?: number, additionalArgs: CommandArguments = []): Promise<CommandResult> {
		const executor = await CamelExecutorFactory.createExecutor();
		const settingsHelper = new CamelSettingsHelper();

		const { args: userArgs, conflicts } = await settingsHelper.getRunSourceDirArguments(sourceDir);
		const { argument: portArg, resolvedPort } = settingsHelper.getPortArgument(port, userArgs);
		const runtimeArg = settingsHelper.getRuntimeArgument(userArgs);
		const common = await this.resolveCommonSettings(settingsHelper, userArgs);

		await settingsHelper.showConflictWarnings(conflicts);

		const args: CommandArguments = CamelCommandBuilder.filterEmptyArgs([
			sq(`--source-dir=${sourceDir}`),
			portArg,
			runtimeArg,
			...userArgs,
			...additionalArgs,
			...this.quoteCommonSettings(common),
		]);

		const result = await executor.execute('run', args, { cwd: sourceDir });
		return this.applyPortOverride(result, portArg, resolvedPort);
	}

	/**
	 * Export a Camel integration to Maven project with user settings.
	 *
	 * Restores two behaviors from the pre-migration CamelJBang.export():
	 * 1. Converts filePath to a relative path (relative to cwd) to avoid Windows
	 *    path-handling issues with absolute paths containing spaces/special chars.
	 * 2. Omits --directory when outputPath equals the file's parent directory
	 *    (documented Camel JBang Windows workaround).
	 */
	static async export(
		filePath: string,
		gav: string,
		runtime: RuntimeType,
		outputPath: string,
		cwd: string,
		kubernetes?: boolean,
		additionalArgs: CommandArguments = [],
	): Promise<CommandResult> {
		const executor = await CamelExecutorFactory.createExecutor();
		const settingsHelper = new CamelSettingsHelper();

		const { args: userArgs, conflicts } = await settingsHelper.getExportArguments(cwd);
		const common = await this.resolveCommonSettings(settingsHelper, userArgs);

		await settingsHelper.showConflictWarnings(conflicts);

		const relPath = relative(cwd, filePath);
		const relativeFilePath = !relPath || relPath === '.' ? '.' : relPath;
		const directoryArg = arePathsEqual(dirname(filePath), outputPath) ? '' : `--directory=${outputPath}`;
		const quarkusOpenshiftDependency = runtime === RuntimeType.QUARKUS && kubernetes ? ['--dependency=mvn:io.quarkus:quarkus-openshift'] : [];

		const args: CommandArguments = CamelCommandBuilder.filterEmptyArgs([
			sq(relativeFilePath),
			`--runtime=${runtime}`,
			sq(`--gav=${gav}`),
			directoryArg ? sq(directoryArg) : '',
			...quarkusOpenshiftDependency,
			...userArgs,
			...additionalArgs,
			...this.quoteCommonSettings(common),
		]);

		if (kubernetes) {
			return await executor.execute('kubernetes', ['export', ...args], { cwd });
		} else {
			return await executor.execute('export', args, { cwd });
		}
	}

	/**
	 * Initialize a new Camel file
	 */
	static async init(filePath: string, cwd?: string): Promise<CommandResult> {
		return this.executeSimple('init', [sq(filePath)], cwd);
	}

	/**
	 * Stop a running integration
	 */
	static async stop(name: string, cwd?: string): Promise<CommandResult> {
		return this.executeSimple('stop', [name], cwd);
	}

	/**
	 * Bind a Kamelet to a source/sink
	 */
	static async bind(file: string, source: string, sink: string, cwd?: string, additionalArgs: CommandArguments = []): Promise<CommandResult> {
		const args: CommandArguments = CamelCommandBuilder.filterEmptyArgs(['--source', source, '--sink', sink, sq(file), ...additionalArgs]);
		return this.executeSimple('bind', args, cwd);
	}

	/**
	 * Add a plugin
	 */
	static async pluginAdd(pluginName: string, cwd?: string, additionalArgs: CommandArguments = []): Promise<CommandResult> {
		const args: CommandArguments = CamelCommandBuilder.filterEmptyArgs(['add', pluginName, ...additionalArgs]);
		return this.executeSimple('plugin', args, cwd);
	}

	/**
	 * Update dependencies in pom.xml
	 */
	static async dependencyUpdate(pomPath: string, integrationFilePath: string, cwd?: string): Promise<CommandResult> {
		return this.executeSimple('dependency', ['update', sq(pomPath), sq(integrationFilePath), '--lazy-bean', '--ignore-loading-error'], cwd);
	}

	/**
	 * Execute route operations (start, stop, suspend, resume)
	 */
	static async routeOperation(operation: string, integration: string, routeId: string, cwd?: string): Promise<CommandResult> {
		return this.executeSimple('cmd', [`${operation}-route`, integration, `--id=${routeId}`], cwd);
	}

	/**
	 * Initialize a new Camel test file
	 */
	static async testInit(filePath: string, cwd?: string): Promise<CommandResult> {
		return this.executeSimple('test', ['init', sq(filePath)], cwd);
	}

	/**
	 * Run Camel tests
	 */
	static async testRun(filePath: string, cwd?: string, additionalArgs: CommandArguments = []): Promise<CommandResult> {
		const args: CommandArguments = CamelCommandBuilder.filterEmptyArgs(['run', sq(filePath), ...additionalArgs]);
		return this.executeSimple('test', args, cwd);
	}

	/**
	 * Run all Camel tests in a folder
	 * Automatically resolves to the actual test folder if the provided path is not a test folder
	 */
	static async testRunFolder(folderPath: string): Promise<CommandResult> {
		const testFolder = await TestFolderResolver.resolveTestFolder(folderPath);
		return this.executeSimple('test', ['run', '*'], testFolder);
	}

	/**
	 * Execute Kubernetes run operation with user settings
	 */
	static async kubernetesRun(filePattern: string, cwd?: string, additionalArgs: CommandArguments = []): Promise<CommandResult> {
		const executor = await CamelExecutorFactory.createExecutor();
		const settingsHelper = new CamelSettingsHelper();

		const { args: userArgs, conflicts } = await settingsHelper.getKubernetesRunArguments(cwd || '');
		const runtimeArg = settingsHelper.getRuntimeArgument(userArgs);
		const common = await this.resolveCommonSettings(settingsHelper, userArgs);

		await settingsHelper.showConflictWarnings(conflicts);

		const args: CommandArguments = CamelCommandBuilder.filterEmptyArgs([
			'run',
			sq(filePattern),
			...userArgs,
			runtimeArg,
			...this.quoteCommonSettings(common),
			...additionalArgs,
		]);
		return await executor.execute('kubernetes', args, { cwd });
	}

	/**
	 * List available infrastructure services (infra list --json)
	 */
	static async infraList(cwd?: string): Promise<CommandResult> {
		return this.executeSimple('infra', ['list', '--json'], cwd);
	}

	/**
	 * Capture the JSON output of `infra list` directly as a string.
	 * Use this for in-process parsing instead of running via a VS Code task.
	 */
	static async captureInfraList(cwd?: string): Promise<string> {
		return this.captureOutput('infra', ['list', '--json'], cwd);
	}

	/**
	 * Start an infrastructure service (infra run <service> [args])
	 */
	static async infraRun(service: string, port?: number, additionalArgs: CommandArguments = [], cwd?: string): Promise<CommandResult> {
		const args: CommandArguments = ['run', service];
		if (port !== undefined) {
			args.push(`--port=${port}`);
		}
		args.push(...additionalArgs);
		return this.executeSimple('infra', args, cwd);
	}

	/**
	 * Stop an infrastructure service (infra stop <service>)
	 */
	static async infraStop(service: string, cwd?: string): Promise<CommandResult> {
		return this.executeSimple('infra', ['stop', service], cwd);
	}

	/**
	 * List running infrastructure services (infra ps --json)
	 */
	static async infraPs(cwd?: string): Promise<CommandResult> {
		return this.executeSimple('infra', ['ps', '--json'], cwd);
	}

	/**
	 * Capture the JSON output of `infra ps` directly as a string.
	 * Use this for in-process parsing instead of running via a VS Code task.
	 */
	static async captureInfraPs(cwd?: string): Promise<string> {
		return this.captureOutput('infra', ['ps', '--json'], cwd);
	}

	/**
	 * Returns the user-configured default arguments for infra commands.
	 */
	static getInfraDefaultArgs(): string[] {
		const args = workspace.getConfiguration().get<string[]>(KAOTO_EXECUTOR_INFRA_ARGUMENTS_SETTING_ID);
		return Array.isArray(args) ? args : [];
	}

	/**
	 * Parse the JSON output of `infra list` into service definitions.
	 */
	static extractAvailableServices(output: string): InfraServiceDefinition[] {
		type AvailableServiceEntry = { name?: string; alias?: string; description?: string; aliasImplementation?: string };
		let parsed: AvailableServiceEntry[];
		try {
			const raw: unknown = JSON.parse(output);
			if (!Array.isArray(raw)) {
				KaotoOutputChannel.logError('Available services JSON is not an array. Raw output: ' + output);
				return [];
			}
			parsed = raw as AvailableServiceEntry[];
		} catch (error) {
			KaotoOutputChannel.logError('Failed to parse available services JSON. Raw output: ' + output, error);
			return [];
		}

		const services: InfraServiceDefinition[] = [];
		for (const service of parsed) {
			const name = service.alias ?? service.name;
			if (typeof name !== 'string' || name.trim().length === 0) {
				continue;
			}
			const aliasImplementation = service.aliasImplementation?.trim();
			const description = [service.description?.trim(), aliasImplementation ? `Implementations: ${aliasImplementation}` : undefined]
				.filter(Boolean)
				.join(' — ');
			services.push({ name: name.trim(), description: description || undefined });
		}
		return services.sort((a, b) => a.name.localeCompare(b.name));
	}

	/**
	 * Parse the JSON output of `infra ps` into running service details.
	 */
	static extractRunningServices(output: string): InfraRunningServiceDetails[] {
		type RunningServiceEntry = { name?: string; alias?: string; description?: string; serviceData?: Record<string, unknown> };
		let parsed: RunningServiceEntry[];
		try {
			const raw: unknown = JSON.parse(output);
			if (!Array.isArray(raw)) {
				KaotoOutputChannel.logError('Running services JSON is not an array. Raw output: ' + output);
				return [];
			}
			parsed = raw as RunningServiceEntry[];
		} catch (error) {
			KaotoOutputChannel.logError('Failed to parse running services JSON. Raw output: ' + output, error);
			return [];
		}

		const services: InfraRunningServiceDetails[] = [];
		for (const service of parsed) {
			const identifier = service.alias?.trim() || service.name?.trim();
			if (!identifier) {
				continue;
			}
			const serviceData = service.serviceData;
			const host = CamelCommandAPI.extractInfraHost(serviceData);
			const port = CamelCommandAPI.extractInfraPort(serviceData);
			const url = host && port ? `${host}:${port}` : undefined;
			services.push({ name: identifier, description: service.description?.trim() || undefined, host, port, url, serviceData });
		}
		return services.sort((a, b) => a.name.localeCompare(b.name));
	}

	private static extractInfraPort(serviceData?: Record<string, unknown>): number | undefined {
		if (!serviceData) {
			return undefined;
		}
		const directPort = serviceData.port;
		if (typeof directPort === 'number' && Number.isFinite(directPort)) {
			return directPort;
		}
		if (typeof directPort === 'string') {
			const parsed = Number(directPort);
			if (Number.isFinite(parsed)) {
				return parsed;
			}
		}
		for (const value of Object.values(serviceData)) {
			if (typeof value !== 'string') {
				continue;
			}
			// Matches port numbers in URLs like "http://host:8080" or "host:8080/path"
			const match = /:(\d+)(?:\/|$)/.exec(value);
			if (match) {
				return Number(match[1]);
			}
		}
		return undefined;
	}

	private static extractInfraHost(serviceData?: Record<string, unknown>): string | undefined {
		if (!serviceData) {
			return undefined;
		}
		const directHost = serviceData.host;
		if (typeof directHost === 'string' && directHost.trim().length > 0) {
			return directHost.trim();
		}
		for (const value of Object.values(serviceData)) {
			if (typeof value !== 'string') {
				continue;
			}
			// Normalize compound URI schemes like "jdbc:postgresql://host:5432/db" → "postgresql://host:5432/db"
			const normalized = /^[a-z][a-z0-9+.-]*:[a-z]/i.test(value) ? value.replace(/^[^:]+:/, '') : value;
			// Matches hostnames in URLs like "http://hostname:8080" or "hostname:8080"
			const match = /^(?:[a-z][a-z0-9+.-]*:\/\/)?([^:/\s]+):\d+/i.exec(normalized);
			if (match) {
				return match[1];
			}
		}
		return undefined;
	}
}
