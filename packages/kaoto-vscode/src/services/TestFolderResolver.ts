import * as path from 'path';
import { readdir } from 'fs/promises';
import { Dirent } from 'fs';

/**
 * Utility class for resolving test folders in a project structure.
 * Uses BFS (Breadth-First Search) to find test directories.
 */
export class TestFolderResolver {
	private static readonly EXCLUDED_DIRS = new Set([
		'node_modules',
		'.git',
		'dist',
		'lib',
		'target',
		'.citrus-jbang',
		'.camel-jbang',
		'.vscode',
		'.mvn',
		'out',
	]);

	/**
	 * Resolves the test folder from a given base directory.
	 * Uses BFS to find the first subdirectory whose name contains 'test'.
	 * Returns baseDir itself if it already contains 'test' in its name,
	 * or falls back to baseDir when no test directory is found.
	 *
	 * @param baseDir - The base directory to start searching from
	 * @returns The resolved test folder path
	 */
	static async resolveTestFolder(baseDir: string): Promise<string> {
		// Check if the base directory itself is a test folder
		if (this.isTestFolder(path.basename(baseDir))) {
			return baseDir;
		}

		// BFS through the directory hierarchy
		const queue: string[] = [baseDir];

		while (queue.length > 0) {
			const current = queue.shift()!;
			let entries: Dirent[] = [];

			try {
				entries = await readdir(current, { withFileTypes: true });
			} catch {
				// Skip directories we can't read
				continue;
			}

			for (const entry of entries) {
				// Skip non-directories and excluded directories
				if (!entry.isDirectory() || TestFolderResolver.EXCLUDED_DIRS.has(entry.name)) {
					continue;
				}

				const fullPath = path.join(current, entry.name);

				// Check if this is a test folder
				if (this.isTestFolder(entry.name)) {
					return fullPath;
				}

				// Add to queue for further exploration
				queue.push(fullPath);
			}
		}

		// No test folder found, return the base directory
		return baseDir;
	}

	/**
	 * Checks if a directory name indicates it's a test folder.
	 *
	 * @param name - The directory name to check
	 * @returns true if the name indicates a test folder
	 */
	private static isTestFolder(name: string): boolean {
		const n = name.toLowerCase();
		return n === 'test' || n === 'tests' || n.endsWith('-test') || n.endsWith('-tests');
	}
}
