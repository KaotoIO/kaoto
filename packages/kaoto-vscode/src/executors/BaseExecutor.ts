import { ICamelExecutor } from './ICamelExecutor';
import { CamelCommandBuilder, CommandBuilderConfig } from './builders/CamelCommandBuilder';
import { ExecutorConfig } from './types/ExecutorConfig';
import { CamelCommand, CommandArguments, CommandContext, CommandResult } from './types/ExecutorTypes';

/**
 * Base executor using template method pattern.
 * Subclasses override buildCommandBuilderConfig() to provide dynamic prefix args per execution.
 */
export abstract class BaseExecutor implements ICamelExecutor {
	constructor(
		protected readonly config: ExecutorConfig,
		private readonly defaultBuilderConfig: CommandBuilderConfig,
	) {}

	getConfig(): ExecutorConfig {
		return this.config;
	}

	async execute(command: CamelCommand, args: CommandArguments, context?: CommandContext): Promise<CommandResult> {
		if (!(await this.isAvailable())) {
			throw new Error(`Executor ${this.config.type} is not available`);
		}

		const builderConfig = await this.buildCommandBuilderConfig({ ...context, command });
		const builder = new CamelCommandBuilder(builderConfig);
		return builder.buildCommand(command, args, context);
	}

	/**
	 * Template method: return the CommandBuilderConfig for this execution.
	 * Default implementation returns the static config from construction.
	 * Subclasses override to compute dynamic prefix args per execution.
	 */
	protected async buildCommandBuilderConfig(_context?: CommandContext): Promise<CommandBuilderConfig> {
		return this.defaultBuilderConfig;
	}

	abstract isAvailable(): Promise<boolean>;

	getVersion(): string {
		return this.config.version;
	}
}
