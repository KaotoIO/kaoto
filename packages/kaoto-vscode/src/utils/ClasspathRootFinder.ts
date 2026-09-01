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
import path from 'path'; // NOSONAR
import vscode from 'vscode';

/**
 *
 * @param camelRouteFile
 * @returns The classpath root for the corresponding Camel Route file.
 *          In Maven-based project, it is searching for the closest src/main/resources folder.
 *          If not found, it supposed that it is a Camel project and so that it is a flat classpath, using the parent folder of the Camel route.
 */
export function findClasspathRoot(camelRouteFile: vscode.Uri): string {
	const camelRoutePath = camelRouteFile.fsPath;
	const folderClasspathPattern = `src${path.sep}main${path.sep}resources`;
	const indexOfClasspath = camelRoutePath.lastIndexOf(folderClasspathPattern);
	let classpathRoot: string;
	if (indexOfClasspath !== -1) {
		classpathRoot = camelRoutePath.substring(0, indexOfClasspath + folderClasspathPattern.length);
	} else {
		// In non Maven based project, we consider the folder at same level than Camel route to be the classpath route
		classpathRoot = path.dirname(camelRouteFile.fsPath);
	}
	return classpathRoot;
}
