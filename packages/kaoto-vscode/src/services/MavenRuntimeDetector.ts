import { execSync } from 'child_process';
import { satisfies } from 'compare-versions';
import { RuntimeMavenInformation } from '@kaoto/kaoto';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { KaotoCatalogService } from './KaotoCatalogService';
import { CamelExecutorFactory } from '../executors/CamelExecutorFactory';
import { CamelLauncherExecutor } from '../executors/CamelLauncherExecutor';
import { findFolderOfPomXml } from '../utils/Path';
import { normalizeVersionForSemver } from '../utils/Version';
import { DEFAULT_CAMEL_VERSION_FALLBACK } from '../constants';

/**
 * Utility for detecting Maven runtime information from pom.xml
 */
export class MavenRuntimeDetector {
	/**
	 * Get runtime information from Maven context using the configured executor
	 * This uses the Camel CLI to detect existing Maven project configuration
	 */
	public static async getRuntimeInfoFromMavenContext(integrationFilePath: string): Promise<RuntimeMavenInformation | undefined> {
		const folderOfPomXml = findFolderOfPomXml(integrationFilePath);
		if (folderOfPomXml === undefined) {
			return undefined;
		}

		try {
			// Get executor configuration to build the correct command
			const executor = await CamelExecutorFactory.createExecutor();
			const config = executor.getConfig();

			// Get Camel version from catalog service - use selected catalog
			const catalogService = KaotoCatalogService.getInstance();
			const catalog = await catalogService.getSelectedIntegrationCatalog();
			const camelVersion = catalogService.getCamelVersionForCLI(catalog, config.type) || DEFAULT_CAMEL_VERSION_FALLBACK;

			// Ensure minimum version 4.13 for dependency runtime --json support
			const camelVersionToUse = satisfies(normalizeVersionForSemver(camelVersion), '>=4.13') ? camelVersion : '4.13.0';

			// Build command string based on executor type
			// Use double quotes for -D and paths: single quotes are literal in cmd.exe on Windows
			let fullCommand: string;
			if (config.type === 'jbang') {
				fullCommand = `jbang "-Dcamel.jbang.version=${camelVersionToUse}" camel@apache/camel dependency runtime --json pom.xml`;
			} else {
				const jarPath = (executor as CamelLauncherExecutor).getJarPath();
				fullCommand = `java -jar "${jarPath}" dependency runtime --json pom.xml`;
			}

			const response: string = execSync(fullCommand, {
				stdio: 'pipe',
				cwd: folderOfPomXml,
			}).toString();

			return JSON.parse(response) as RuntimeMavenInformation;
		} catch (ex) {
			KaotoOutputChannel.logError('Error while trying to retrieve the runtime information from Maven context', ex);
			return undefined;
		}
	}
}
