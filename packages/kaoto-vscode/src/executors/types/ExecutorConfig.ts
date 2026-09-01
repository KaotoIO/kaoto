/**
 * Executor configuration types
 */

import { ExecutorType } from './ExecutorTypes';

/**
 * Base executor configuration
 */
export interface ExecutorConfig {
	readonly type: ExecutorType;
	readonly version: string;
}

/**
 * JBang executor configuration
 */
export interface JBangExecutorConfig extends ExecutorConfig {
	readonly type: 'jbang';
}

/**
 * Camel Launcher executor configuration
 */
export interface CamelLauncherExecutorConfig extends ExecutorConfig {
	readonly type: 'camel-launcher';
}

/**
 * Union type for all executor configurations
 * Note: Extensible for future executor types (e.g., Kaoto Companion)
 */
export type AnyExecutorConfig = JBangExecutorConfig | CamelLauncherExecutorConfig;
