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
import * as path from 'path'; // NOSONAR
import * as vscode from 'vscode';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID, KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID } from '../constants';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { KaotoCatalogService } from '../services/KaotoCatalogService';
import { expandPath } from '../utils/Path';

/** The runtime provider of the catalog of the Camel Language Server. */
export type CamelLspRuntimeProvider = 'DEFAULT' | 'QUARKUS' | 'SPRINGBOOT';

/**
 * The settings of the Camel Language Server, sent in its initializationOptions and in workspace/didChangeConfiguration.
 * Without a catalog version, the server uses the catalog it bundles.
 */
export interface CamelLspSettings {
	camel: {
		'Camel catalog version'?: string;
		'Camel catalog runtime provider'?: CamelLspRuntimeProvider;
		/** The Camel Quarkus or Camel Spring Boot version, whose catalog the server downloads. */
		'Camel catalog runtime provider version'?: string;
		'extra-components'?: unknown[];
		/** The directories of the local Kamelets: the server resolves a relative directory against the folder of the edited file. */
		'local-kamelet-directories'?: string[];
	};
}

/**
 * @returns the settings of the server for the integration catalog of the canvas, the one selected in Kaoto or the default one
 * in a Maven project, `kaoto.lsp.extraComponents` and `kaoto.localKameletDirectories`
 */
export async function readCamelLspSettings(catalogService: KaotoCatalogService): Promise<CamelLspSettings> {
	// the canvas of a Maven project uses the default catalog, not the selected one
	const catalog = (await isMavenWindow()) ? catalogService.getDefaultIntegrationCatalog() : catalogService.resolveSelectedIntegrationCatalog();
	const configuration = vscode.workspace.getConfiguration();
	const extraComponents = configuration.get<unknown[] | null>(KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID);
	const localKameletDirectories = toLocalKameletDirectories(
		configuration.get<unknown>(KAOTO_LOCAL_KAMELET_DIRECTORIES_SETTING_ID),
		vscode.workspace.workspaceFolders,
	);
	return toCamelLspSettings(catalog, extraComponents, localKameletDirectories);
}

/**
 * @returns whether every folder of the window is a Maven project, since one server serves the window
 */
async function isMavenWindow(): Promise<boolean> {
	const folders = vscode.workspace.workspaceFolders ?? [];
	const mavenFolders = await Promise.all(folders.map((folder) => KaotoCatalogService.isMavenProject(folder.uri)));
	return folders.length > 0 && mavenFolders.every(Boolean);
}

/**
 * Maps a Kaoto catalog to the settings of the server: the Camel version of the catalog, which is not the version of a
 * Camel Quarkus catalog, its runtime provider, and the Camel Quarkus or Camel Spring Boot version.
 * The catalogs of the indexes before @kaoto/camel-catalog 0.4.8 lack these versions: the version of the catalog stands in for
 * the Camel Quarkus or Camel Spring Boot version, and for the Camel version except in a Camel Quarkus catalog.
 * Citrus catalogs are not Camel catalogs: nothing is set for them, and the server keeps the catalog it bundles.
 */
export function toCamelLspSettings(
	catalog: CatalogLibraryEntry | undefined,
	extraComponents?: unknown[] | null,
	localKameletDirectories?: string[],
): CamelLspSettings {
	const settings: CamelLspSettings = { camel: {} };
	if (catalog && !catalog.runtime.toLowerCase().includes('citrus')) {
		const runtimeProvider = toCamelLspRuntimeProvider(catalog.runtime);
		// without a Camel version, the server keeps its bundled Camel catalog
		const camelVersion = catalog.camelCatalogVersion || (runtimeProvider === 'QUARKUS' ? undefined : catalog.version);
		if (camelVersion) {
			settings.camel['Camel catalog version'] = camelVersion;
		}
		settings.camel['Camel catalog runtime provider'] = runtimeProvider;
		if (runtimeProvider !== 'DEFAULT') {
			settings.camel['Camel catalog runtime provider version'] = catalog.runtimeProviderVersion || catalog.version;
		}
	}
	const components = toExtraComponents(extraComponents);
	if (components.length > 0) {
		settings.camel['extra-components'] = components;
	}
	if (localKameletDirectories && localKameletDirectories.length > 0) {
		settings.camel['local-kamelet-directories'] = localKameletDirectories;
	}
	return settings;
}

/**
 * Maps `kaoto.localKameletDirectories` to the directories of the server with `expandPath`, the expansion of the canvas.
 * The canvas resolves the directories against the folder of the edited file, and the server resolves a relative directory
 * against it too: so a relative directory stays relative, and `${cwd}`, the folder of the file, becomes `.`, as does an
 * empty entry, which the canvas reads as that folder. The canvas takes the workspace folder of the edited file for
 * `${workspaceFolder}` and `${workspaceFolderBasename}`, while one list serves all the files of the window: so they give
 * one directory per workspace folder. The server reads them in the order of the folders and keeps the first Kamelet of a
 * name, so a Kamelet of an earlier folder wins over the one of the same name in the folder of the edited file.
 *
 * @returns the directories, without duplicates
 */
export function toLocalKameletDirectories(
	directories: unknown,
	workspaceFolders: readonly Pick<vscode.WorkspaceFolder, 'uri' | 'name'>[] | undefined,
): string[] {
	if (!Array.isArray(directories)) {
		return [];
	}
	// without a folder, the workspace folder variables stay as they are, as on the canvas
	const folders = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders : [undefined];
	const resolved = new Set<string>();
	for (const directory of directories) {
		if (typeof directory !== 'string') {
			continue;
		}
		// the server drops a blank directory, and reads the folder of the edited file for '.'
		const entry = directory === '' ? '.' : directory;
		if (entry.trim() === '') {
			continue;
		}
		for (const folder of folders) {
			const expanded = expandPath(entry, '.', folder);
			resolved.add(path.isAbsolute(expanded) ? path.normalize(expanded) : expanded);
		}
	}
	return [...resolved];
}

/**
 * @returns the entries of `kaoto.lsp.extraComponents` that describe a component with a scheme: the server fails its whole
 * catalog on any other entry
 */
function toExtraComponents(entries: unknown[] | null | undefined): unknown[] {
	if (!Array.isArray(entries)) {
		return [];
	}
	const components = entries.filter((entry) => typeof (entry as { component?: { scheme?: unknown } } | null)?.component?.scheme === 'string');
	if (components.length < entries.length) {
		KaotoOutputChannel.logWarning(
			`Ignored ${entries.length - components.length} entries of ${KAOTO_LSP_EXTRA_COMPONENTS_SETTING_ID} that describe no component with a scheme`,
		);
	}
	return components;
}

/**
 * Maps the runtime of a Kaoto catalog, Main, Quarkus or Spring Boot, to the runtime provider of the server.
 */
export function toCamelLspRuntimeProvider(runtime: string): CamelLspRuntimeProvider {
	const normalized = runtime.toLowerCase();
	if (normalized.includes('quarkus')) {
		return 'QUARKUS';
	}
	if (normalized.includes('spring')) {
		return 'SPRINGBOOT';
	}
	return 'DEFAULT';
}
