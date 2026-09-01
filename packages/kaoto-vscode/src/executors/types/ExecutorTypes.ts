/**
 * Core types for the Camel executor system
 */

import { ShellExecution, ShellQuotedString } from 'vscode';

/**
 * Supported executor types
 */
export type ExecutorType = 'jbang' | 'camel-launcher';

/**
 * Supported runtime types
 */
export enum RuntimeType {
	QUARKUS = 'quarkus',
	SPRING_BOOT = 'spring-boot',
	MAIN = 'camel-main',
	CITRUS = 'citrus',
}

/**
 * Camel command types
 */
export type CamelCommand = 'run' | 'export' | 'init' | 'bind' | 'stop' | 'dependency' | 'cmd' | 'plugin' | 'test' | 'kubernetes' | 'infra';

/**
 * Command execution context
 */
export interface CommandContext {
	readonly cwd?: string;
	/** The Camel command being executed (e.g. 'run', 'test'). Used by executors that need per-command version constraints. */
	readonly command?: CamelCommand;
}

/**
 * Command execution result
 */
export interface CommandResult {
	readonly execution: ShellExecution;
	readonly resolvedPort?: number;
}

/**
 * A single command argument: either a plain string (passed to ShellExecution
 * with default quoting) or a ShellQuotedString (with explicit quoting control).
 */
export type CommandArg = string | ShellQuotedString;

/**
 * Generic command arguments -- supports mixed plain strings and explicitly-quoted args.
 */
export type CommandArguments = CommandArg[];

// ─── Infrastructure types ────────────────────────────────────────────────────

export interface InfraServiceDefinition {
	name: string;
	description?: string;
}

export interface InfraRunningServiceDetails {
	name: string;
	description?: string;
	host?: string;
	port?: number;
	url?: string;
	serviceData?: Record<string, unknown>;
}
