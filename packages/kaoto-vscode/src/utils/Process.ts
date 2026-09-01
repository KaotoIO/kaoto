/**
 * Copyright 2025 Red Hat, Inc. and/or its affiliates.
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

import { window } from 'vscode';
import { exec } from 'child_process'; // NOSONAR
import { promisify } from 'util'; // NOSONAR

export interface CommandOutput {
	stdout: string;
	stderr: string;
	success: boolean;
}

export async function verifyJBangExists(): Promise<boolean> {
	const output = await runJBangCommandWithStatusBar(`version`, `Checking JBang executable on PATH...`);
	return output.success;
}

export async function verifyJavaExists(): Promise<boolean> {
	const output = await runCommandWithStatusBar('java -version', 'Checking Java executable on PATH...');
	return output.success;
}

export async function verifyCamelPluginsAreInstalled(plugins: string[]): Promise<{ plugin: string; installed: boolean }[]> {
	return await runJBangCommandWithStatusBar(`camel@apache/camel plugin get`, `Checking Camel JBang plugins...`).then((output) => {
		return plugins.map((plugin) => ({ plugin, installed: output.stdout.includes(plugin) }));
	});
}

export async function verifyJBangTrustedSources(urls: string[]): Promise<{ url: string; exists: boolean }[]> {
	return await runJBangCommandWithStatusBar(`trust list`, `Checking JBang Trusted Sources...`).then((output) => {
		return urls.map((url) => ({ url, exists: output.stdout.includes(url) }));
	});
}

export async function runJBangCommandWithStatusBar(args: string, msg: string): Promise<CommandOutput> {
	return runCommandWithStatusBar(`jbang ${args}`, msg);
}

export async function runCommandWithStatusBar(command: string, msg: string): Promise<CommandOutput> {
	const execPromise = promisify(exec);
	const statusBarMessage = window.setStatusBarMessage(`Kaoto: ${msg}`);
	try {
		const { stdout, stderr } = await execPromise(command);
		return { stdout, stderr, success: true };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { stdout: '', stderr: message, success: false };
	} finally {
		statusBarMessage.dispose();
	}
}
