/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FileTypesResponse } from '@kaoto/kaoto/models';
import * as path from 'path'; // NOSONAR: node: prefix is unsupported by the webpack path-browserify polyfill fallback
import * as vscode from 'vscode';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';

/**
 * Reads all `.kamelet.yaml` files from the given directory.
 *
 * Directories that do not exist or are not accessible are silently skipped
 * (an error is logged). Individual files that cannot be read are also skipped
 * with an error log.
 *
 * @param dir Absolute path to the directory to read
 * @returns An array of {@link FileTypesResponse} objects, one per kamelet file found
 */
export async function readKameletsFromDirectory(dir: string): Promise<FileTypesResponse[]> {
	let entries: [string, vscode.FileType][];
	try {
		entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(dir));
	} catch (ex) {
		// Directory does not exist or is not accessible — skip it
		KaotoOutputChannel.logError(`Cannot read kamelet folder: ${dir}`, ex);
		return [];
	}

	const resources: FileTypesResponse[] = [];
	for (const [name, type] of entries) {
		if (type !== vscode.FileType.File || !name.endsWith('.kamelet.yaml')) {
			continue;
		}
		const fileUri = vscode.Uri.file(path.join(dir, name));
		try {
			const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(fileUri));
			resources.push({ filename: name, content });
		} catch (ex) {
			KaotoOutputChannel.logError(`Cannot read kamelet file: ${fileUri.fsPath}`, ex);
		}
	}
	return resources;
}
