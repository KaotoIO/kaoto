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
import * as vscode from 'vscode';

/**
 * Look for a .kaoto file from the folder of the given file/directory up to the workspace folder (included).
 * Inside a workspace folder, the lookup never goes above it, so a .kaoto file located elsewhere
 * (e.g. in the user home directory) is ignored. Outside of a workspace folder, only the folder of
 * the given file is considered.
 *
 * Note: Discovery intentionally searches only upwards (current directory up to workspace root).
 * Subdirectories below the target are not scanned per #1808 design.
 *
 * @param fileOrDirUri URI of the file or directory to start searching from.
 * @param isDirectory Optional flag indicating if fileOrDirUri is known to be a directory.
 */
export async function findExistingKaotoMetadataFile(fileOrDirUri: vscode.Uri, isDirectory?: boolean): Promise<vscode.Uri | undefined> {
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileOrDirUri)?.uri.toString();
	const isDir = isDirectory ?? (await isDirectoryUri(fileOrDirUri));

	let folder: vscode.Uri | undefined = isDir ? fileOrDirUri : vscode.Uri.joinPath(fileOrDirUri, '..');
	while (folder) {
		const candidate = vscode.Uri.joinPath(folder, '.kaoto');
		if (await fileExists(candidate)) {
			return candidate;
		}
		folder = getParentWithinWorkspace(folder, workspaceFolder);
	}

	return undefined;
}

async function isDirectoryUri(uri: vscode.Uri): Promise<boolean> {
	try {
		return (await vscode.workspace.fs.stat(uri)).type === vscode.FileType.Directory;
	} catch {
		return false;
	}
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(uri);
		return true;
	} catch (ex) {
		// Only a missing file lets the lookup continue upwards. Any other error must not make a farther .kaoto file win.
		if (ex instanceof vscode.FileSystemError && ex.code === 'FileNotFound') {
			return false;
		}
		throw ex;
	}
}

/**
 * @returns the parent folder, or `undefined` when the file system root is reached
 * or the parent is not inside the given workspace folder.
 */
function getParentWithinWorkspace(folder: vscode.Uri, workspaceFolder: string | undefined): vscode.Uri | undefined {
	const parent = vscode.Uri.joinPath(folder, '..');
	if (parent.path === folder.path) {
		return undefined;
	}
	const isInWorkspace = workspaceFolder !== undefined && vscode.workspace.getWorkspaceFolder(parent)?.uri.toString() === workspaceFolder;
	return isInWorkspace ? parent : undefined;
}
