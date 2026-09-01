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
import { Uri, WorkspaceFolder, workspace } from 'vscode';
import isValidFilename from 'valid-filename';
import path from 'path'; // NOSONAR

export interface CamelRouteDSL {
	language: string;
	extension: string;
	placeHolder: string;
}

export abstract class AbstractCamelCommand {
	protected singleWorkspaceFolder: WorkspaceFolder | undefined;
	protected camelDSL: CamelRouteDSL | undefined;

	constructor(dsl?: string) {
		this.camelDSL = this.getDSL(dsl);
		this.singleWorkspaceFolder = this.getSingleWorkspaceFolder();
	}

	protected getDSL(dsl?: string): CamelRouteDSL | undefined {
		if (dsl === 'YAML') {
			return { language: 'YAML', extension: 'camel.yaml', placeHolder: 'sample-route' };
		} else if (dsl === 'XML') {
			return { language: 'XML', extension: 'camel.xml', placeHolder: 'sample-route' };
		} else {
			return undefined;
		}
	}

	/**
	 * Resolves first opened folder in vscode existing workspace
	 *
	 * @returns WorkspaceFolder object
	 */
	private getSingleWorkspaceFolder(): WorkspaceFolder | undefined {
		if (workspace.workspaceFolders) {
			// default to root workspace folder
			return workspace.workspaceFolders[0];
		}
		return undefined;
	}

	/**
	 * Camel file name validation
	 *  - no empty name
	 *  - name without extension
	 *  - file already exists check
	 *  - name cannot contains eg. special characters
	 *
	 * @param name
	 * @returns string | undefined
	 */
	public async validateCamelFileName(name: string, folderPath?: string): Promise<string | undefined> {
		if (!name) {
			return 'Please provide a name for the new file (without extension).';
		}

		if (name.includes('.')) {
			return 'Please provide a name without the extension.';
		}

		if (!this.singleWorkspaceFolder) {
			return 'Please open a workspace folder first.';
		}

		if (!this.camelDSL) {
			throw new Error('Camel DSL cannot be undefined.');
		}
		const newFilePotentialFullPath: string = this.computeFullPath(
			folderPath ?? this.singleWorkspaceFolder.uri.fsPath,
			this.getFullName(name, this.camelDSL.extension),
		);
		let newFilePotentialPathExist = false;
		try {
			await workspace.fs.stat(Uri.file(newFilePotentialFullPath));
			newFilePotentialPathExist = true;
		} catch (error) {
			// do nothing, file does not exist
		}
		if (newFilePotentialPathExist) {
			return 'The file already exists. Please choose a different file name.';
		}

		if (!isValidFilename(name)) {
			return 'The filename is invalid.';
		}
		return undefined;
	}

	/**
	 * Get the full file name for provided name and suffix
	 *
	 * @param name of the file
	 * @param suffix of the file
	 * @returns the full file name format [name.suffix] eg. foo.yaml
	 */
	protected getFullName(name: string, suffix: string): string {
		return `${name}.${suffix}`;
	}

	/**
	 * Resolves absolute path for the given workspace and file
	 *
	 * @param folderPath
	 * @param file
	 * @returns absolute string Path
	 */
	protected computeFullPath(folderPath: string, file: string): string {
		return path.join(folderPath, file);
	}
}
