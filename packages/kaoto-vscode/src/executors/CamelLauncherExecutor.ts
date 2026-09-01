import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { BaseExecutor } from './BaseExecutor';
import { CamelCommandBuilder } from './builders/CamelCommandBuilder';
import { CamelLauncherExecutorConfig } from './types/ExecutorConfig';

/**
 * Executes Camel Launcher JAR directly using java -jar.
 * Uses the static builder config from BaseExecutor (no dynamic prefix args needed).
 */
export class CamelLauncherExecutor extends BaseExecutor {
	private readonly jarPath: string;

	constructor(config: CamelLauncherExecutorConfig, jarPath: string) {
		super(config, {
			executable: 'java',
			prefixArgs: ['-jar', CamelCommandBuilder.strongQuote(jarPath)],
		});
		this.jarPath = jarPath;
	}

	getJarPath(): string {
		return this.jarPath;
	}

	async isAvailable(): Promise<boolean> {
		if (!existsSync(this.jarPath)) {
			return false;
		}
		try {
			execSync('java -version', { stdio: 'pipe' });
			return true;
		} catch {
			return false;
		}
	}
}
