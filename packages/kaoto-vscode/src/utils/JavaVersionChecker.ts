/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { execFile } from 'node:child_process';
import * as fs from 'fs'; // NOSONAR
import * as path from 'path'; // NOSONAR
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';

const JAVA_VERSION_TIMEOUT_MS = 10000;
/** What /usr/bin/java of macOS tells, and exits with 1, when no JDK is installed. */
const NO_JAVA_RUNTIME_PATTERN = /Unable to locate a Java Runtime/i;
/** The major version in the output of `java -version`, and the minor one of the legacy 1.x format. */
const JAVA_VERSION_PATTERN = /version\s+"(\d+)(?:\.(\d+))?/;

/** What `java -version` tells about a Java executable. */
export type JavaVersionCheck =
	| { status: 'version'; version: number }
	/** there is no such executable */
	| { status: 'missing' }
	/** the executable exists but could not run, or its output has no version */
	| { status: 'failed'; error: Error };

/** A Java that is recent enough, or why there is none. */
export type JavaLookup =
	| { status: 'found'; executable: string; version: number }
	| { status: 'tooOld'; executable: string; version: number }
	| { status: 'notRunnable'; executable: string; error: Error }
	| { status: 'notFound' };

/**
 * Finds a Java executable and checks its version with `java -version`.
 */
export class JavaVersionChecker {
	/**
	 * Finds a Java of at least the required version: the Java of JAVA_HOME, else java on the PATH,
	 * also when the Java of JAVA_HOME is too old or cannot run. Logs each Java that it passes over.
	 * @returns the first Java that is recent enough; else the problem of the first Java that exists
	 */
	static async findJava(requiredVersion: number): Promise<JavaLookup> {
		const candidates: string[] = [];
		const javaHome = process.env['JAVA_HOME'];
		if (javaHome) {
			const javaPath = JavaVersionChecker.getJavaHomeExecutable(javaHome);
			if (fs.existsSync(javaPath)) {
				candidates.push(javaPath);
			}
		}
		candidates.push('java');

		let problem: JavaLookup | undefined;
		for (const executable of candidates) {
			const check = await JavaVersionChecker.checkJavaVersion(executable);
			if (check.status === 'missing') {
				continue;
			}
			if (check.status === 'failed') {
				KaotoOutputChannel.logError(`Could not run ${executable} -version`, check.error);
				problem ??= { status: 'notRunnable', executable, error: check.error };
				continue;
			}
			if (check.version >= requiredVersion) {
				return { status: 'found', executable, version: check.version };
			}
			KaotoOutputChannel.logWarning(`Java ${check.version} at ${executable} is older than the required Java ${requiredVersion}`);
			problem ??= { status: 'tooOld', executable, version: check.version };
		}
		return problem ?? { status: 'notFound' };
	}

	/**
	 * @returns the java executable of a Java home, java.exe on Windows
	 */
	static getJavaHomeExecutable(javaHome: string, platform: NodeJS.Platform = process.platform): string {
		return path.join(javaHome, 'bin', platform === 'win32' ? 'java.exe' : 'java');
	}

	/**
	 * Runs `java -version` to get the major version of a Java.
	 * @returns the version; missing when there is no such executable, or only the macOS stub of one;
	 * failed when it cannot run, does not finish in time, or tells no version
	 */
	static checkJavaVersion(javaPath: string, timeoutMs = JAVA_VERSION_TIMEOUT_MS): Promise<JavaVersionCheck> {
		return new Promise<JavaVersionCheck>((resolve) => {
			execFile(javaPath, ['-version'], { timeout: timeoutMs }, (error, stdout, stderr) => {
				if (error) {
					if ((error as NodeJS.ErrnoException).code === 'ENOENT' || NO_JAVA_RUNTIME_PATTERN.test(`${stderr}${stdout}`)) {
						resolve({ status: 'missing' });
					} else if (error.killed) {
						resolve({ status: 'failed', error: new Error(`${javaPath} -version did not finish within ${timeoutMs / 1000} seconds`) });
					} else {
						resolve({ status: 'failed', error });
					}
					return;
				}
				// java -version writes to stderr
				const output = `${stderr}${stdout}`;
				const version = JavaVersionChecker.parseJavaVersion(output);
				if (version === undefined) {
					resolve({ status: 'failed', error: new Error(`${javaPath} -version did not tell a version: ${output.trim() || '(no output)'}`) });
				} else {
					resolve({ status: 'version', version });
				}
			});
		});
	}

	/**
	 * @returns the major version in the output of `java -version`, 8 for the legacy 1.8 format; undefined when it has none
	 */
	static parseJavaVersion(output: string): number | undefined {
		const match = JAVA_VERSION_PATTERN.exec(output);
		if (!match) {
			return undefined;
		}
		const major = Number.parseInt(match[1], 10);
		return major === 1 && match[2] ? Number.parseInt(match[2], 10) : major;
	}
}
