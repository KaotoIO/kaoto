/**
 * Unified command builder for all Camel executors
 */

import { ShellExecution, ShellQuotedString, ShellQuoting } from 'vscode';
import { CamelCommand, CommandArg, CommandArguments, CommandContext, CommandResult } from '../types/ExecutorTypes';

/**
 * Configuration for command builder
 */
export interface CommandBuilderConfig {
	/** Executable path (e.g., 'jbang' or '/path/to/camel-launcher/bin/camel') */
	executable: string;

	/** Prefix arguments to add before the Camel command (e.g., JBang needs [strongQuote('-Dcamel.jbang.version=X'), 'camel@apache/camel']) */
	prefixArgs?: CommandArg[];
}

/**
 * Unified command builder for all Camel executors
 * Handles both JBang and Camel Launcher with configuration
 *
 * Args can be plain strings (VS Code applies default heuristic quoting) or
 * ShellQuotedString objects (explicit quoting control). Use strongQuote()
 * for args that contain shell-sensitive characters (dots in -D properties,
 * file paths with spaces, URLs, etc.).
 */
export class CamelCommandBuilder {
	constructor(private readonly config: CommandBuilderConfig) {}

	/**
	 * Wrap a value in ShellQuoting.Strong for cross-platform safety.
	 * - bash: single quotes (prevents glob, word splitting, special char interpretation)
	 * - PowerShell: single quotes (prevents property access on dots, variable expansion)
	 * - cmd.exe: double quotes (proper path and special char handling)
	 */
	static strongQuote(value: string): ShellQuotedString {
		return { value, quoting: ShellQuoting.Strong };
	}

	/**
	 * Build command for execution
	 * Structure: <executable> [...prefixArgs] <command> <args>
	 */
	buildCommand(command: CamelCommand, args: CommandArguments, context?: CommandContext): CommandResult {
		const commandParts = CamelCommandBuilder.filterEmptyArgs([...(this.config.prefixArgs || []), command, ...args]);

		const execution = this.buildExecution(this.config.executable, commandParts, context);
		const resolvedPort = this.extractPort(args);

		return this.buildResult(execution, resolvedPort);
	}

	/**
	 * Build shell execution from command components.
	 * ShellExecution accepts mixed (string | ShellQuotedString)[] natively.
	 */
	private buildExecution(executable: string, commandParts: CommandArg[], context?: CommandContext): ShellExecution {
		return new ShellExecution(executable, commandParts, { cwd: context?.cwd });
	}

	/**
	 * Filter empty/null/undefined arguments from a command args array.
	 * Handles both plain strings and ShellQuotedString objects.
	 */
	static filterEmptyArgs(args: (CommandArg | undefined | null)[]): CommandArg[] {
		return args.filter((arg): arg is CommandArg => {
			if (arg === undefined || arg === null) {
				return false;
			}
			if (typeof arg === 'string') {
				return arg !== '';
			}
			return arg.value !== '';
		});
	}

	/**
	 * Build command result
	 */
	private buildResult(execution: ShellExecution, resolvedPort?: number): CommandResult {
		return {
			execution,
			resolvedPort,
		};
	}

	/**
	 * Extract port from arguments (handles both string and ShellQuotedString)
	 */
	private extractPort(args: CommandArguments): number | undefined {
		const portArg = args.find((arg) => {
			const value = typeof arg === 'string' ? arg : arg.value;
			return value.startsWith('--port=') || value.startsWith('--management-port=');
		});
		if (portArg) {
			const value = typeof portArg === 'string' ? portArg : portArg.value;
			const match = new RegExp(/=(-?\d+)/).exec(value);
			return match ? Number.parseInt(match[1], 10) : undefined;
		}
		return undefined;
	}
}
