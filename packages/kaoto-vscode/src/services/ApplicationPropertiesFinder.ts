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
import vscode from 'vscode';
import path from 'path'; // NOSONAR
import { Suggestion } from '@kaoto/kaoto';

export async function findAllApplicationPropertiesFiles(start: vscode.Uri | string): Promise<vscode.Uri[]> {
	const startUri = typeof start === 'string' ? vscode.Uri.file(start) : start;
	let currentDir = vscode.Uri.joinPath(startUri, '..');
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(startUri)?.uri;

	while (workspaceFolder && (currentDir.path === workspaceFolder.path || currentDir.path.startsWith(workspaceFolder.path.replace(/\/$/, '') + '/'))) {
		const entries = await vscode.workspace.fs.readDirectory(currentDir);
		const matchingFiles = entries
			.filter(([name, type]) => {
				return type === vscode.FileType.File && name.startsWith('application') && name.endsWith('.properties');
			})
			.map(([name]) => vscode.Uri.joinPath(currentDir, name));

		if (matchingFiles.length > 0) {
			return matchingFiles;
		}

		const parentDir = vscode.Uri.joinPath(currentDir, '..');
		if (parentDir.path === currentDir.path) {
			break;
		}
		currentDir = parentDir;
	}

	return [];
}

export async function parseMultipleApplicationPropertiesFiles(fileUris: vscode.Uri[]): Promise<Suggestion[]> {
	const suggestions: Suggestion[] = [];

	for (const uri of fileUris) {
		const bytes = await vscode.workspace.fs.readFile(uri);
		const content = new TextDecoder().decode(bytes);
		const fileName = path.posix.basename(uri.path);

		for (const line of content.split(/\r\n|\r|\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) {
				// skip comment and empty lines
				continue;
			}

			const equalIndex = trimmed.indexOf('=');
			if (equalIndex !== -1) {
				const key = trimmed.slice(0, equalIndex).trim();
				const valuePart = trimmed.slice(equalIndex + 1).trim();

				suggestions.push({
					value: key,
					description: valuePart,
					group: fileName,
				});
			}
		}
	}

	return suggestions;
}
