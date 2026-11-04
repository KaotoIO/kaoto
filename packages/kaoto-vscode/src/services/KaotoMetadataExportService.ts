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
import * as vscode from 'vscode';
import { arePathsEqual } from '../utils/Path';
import { parseAllDocuments } from 'yaml';
import { KaotoOutputChannel } from '../extension/KaotoOutputChannel';
import { findClasspathRoot } from '../utils/ClasspathRootFinder';
import { findExistingKaotoMetadataFile } from '../utils/KaotoMetadataFileUtils';

export interface DataMapperMetadataEntry {
	xsltPath?: string;
	sourceBody?: {
		filePath?: string[];
	};
	targetBody?: {
		filePath?: string[];
	};
	sourceParameters?: Record<string, { filePath?: string[] }>;
	[key: string]: unknown;
}

export interface RouteReferences {
	stepIds: Set<string>;
}

/** References collected from a single exported route file. */
interface RouteWithReferences {
	routeUri: vscode.Uri;
	refs: RouteReferences;
}

/** Everything the resource export needs besides the entries themselves. */
interface ResourceExportContext {
	/** Folder of the source .kaoto file, one of the bases a relative path can be written against. */
	sourceKaotoDir: string;
	/** Classpath root of the exported project; every copied file lands inside it. */
	targetResourcesDir: string;
	/** Every exported route, used when no owning route resolves a reference. */
	routeUris: vscode.Uri[];
	/** Workspace folder of the source, the boundary the lookup must not leave. */
	workspaceDir?: string;
}

/** A metadata entry together with the exported routes that reference it. */
interface OwnedMetadataEntry {
	key: string;
	entry: DataMapperMetadataEntry;
	ownerRoutes: vscode.Uri[];
}

const IGNORED_DIRECTORIES = new Set(['node_modules', 'target', '.git', '.vscode', '.bob']);

export class KaotoMetadataExportService {
	/**
	 * Recursively collect every `id` and `stepId` of a parsed YAML or object hierarchy. A .kaoto entry
	 * belongs to a route when its key is one of them: the DataMapper looks its metadata up by step ID,
	 * so an entry keyed by anything else could not be read in the exported project anyway.
	 */
	static collectReferencesFromObject(obj: unknown, refs: RouteReferences): void {
		if (!obj || typeof obj !== 'object') {
			return;
		}

		if (Array.isArray(obj)) {
			obj.forEach((item) => KaotoMetadataExportService.collectReferencesFromObject(item, refs));
			return;
		}

		const record = obj as Record<string, unknown>;
		KaotoMetadataExportService.collectStepId(record.id, refs.stepIds);
		KaotoMetadataExportService.collectStepId(record.stepId, refs.stepIds);

		for (const value of Object.values(record)) {
			KaotoMetadataExportService.collectReferencesFromObject(value, refs);
		}
	}

	/** Record a non-empty `id`/`stepId` value, trimmed, as a step ID of the route. */
	private static collectStepId(value: unknown, stepIds: Set<string>): void {
		if (typeof value === 'string' && value.trim().length > 0) {
			stepIds.add(value.trim());
		}
	}

	/**
	 * Collect the step IDs of a route file (YAML or XML).
	 */
	static collectRouteReferencesFromContent(content: string): RouteReferences {
		const refs: RouteReferences = { stepIds: new Set<string>() };

		if (content.trimStart().startsWith('<')) {
			KaotoMetadataExportService.collectXmlRouteReferences(content, refs);
		} else {
			KaotoMetadataExportService.collectYamlRouteReferences(content, refs);
		}

		return refs;
	}

	/**
	 * Collect step IDs of an XML DSL route. The ids are read textually rather than with a parser, which
	 * the extension does not depend on; commented out and escaped sections are removed first so that a
	 * step a user has commented out does not keep its metadata alive.
	 */
	private static collectXmlRouteReferences(content: string, refs: RouteReferences): void {
		const activeContent = content.replaceAll(/<!--[\s\S]*?-->/g, '').replaceAll(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
		// An XML attribute is always `name="value"`, and the whole value is the ID: stopping at the first
		// punctuation character would turn "order.mapping" into "order" and silently drop its metadata.
		const idRegex = /\b(?:id|stepId)\s*=\s*(["'])(.*?)\1/g;
		for (const match of activeContent.matchAll(idRegex)) {
			const id = match[2].trim();
			if (id) {
				refs.stepIds.add(id);
			}
		}
	}

	/** Collect step IDs of a YAML route, including multi-document files. Documents that fail to parse are skipped. */
	private static collectYamlRouteReferences(content: string, refs: RouteReferences): void {
		const docs = parseAllDocuments(content);
		for (const doc of docs) {
			if (doc.contents && (!doc.errors || doc.errors.length === 0)) {
				KaotoMetadataExportService.collectReferencesFromObject(doc.toJS(), refs);
			}
		}
	}

	/**
	 * Collect all route file URIs for a given source URI (single file, folder, or workspace).
	 */
	static async collectSourceRouteUris(sourceUri: vscode.Uri): Promise<vscode.Uri[]> {
		const stat = await vscode.workspace.fs.stat(sourceUri);
		if (stat.type === vscode.FileType.File) {
			return [sourceUri];
		}

		const routeUris: vscode.Uri[] = [];
		const isRouteFile = (name: string) => /\.(yaml|yml|xml)$/i.test(name);

		const scanDirectory = async (dirUri: vscode.Uri) => {
			let entries: [string, vscode.FileType][];
			try {
				entries = await vscode.workspace.fs.readDirectory(dirUri);
			} catch (err) {
				KaotoOutputChannel.logWarning(`Failed to read directory at ${dirUri.fsPath}: ${err}`);
				return;
			}

			const subDirPromises: Promise<void>[] = [];
			for (const [name, type] of entries) {
				if (IGNORED_DIRECTORIES.has(name)) {
					continue;
				}
				const childUri = vscode.Uri.joinPath(dirUri, name);
				if (type === vscode.FileType.Directory) {
					subDirPromises.push(scanDirectory(childUri));
				} else if (type === vscode.FileType.File && isRouteFile(name)) {
					routeUris.push(childUri);
				}
			}
			await Promise.all(subDirPromises);
		};

		await scanDirectory(sourceUri);
		// Subdirectories are scanned in parallel, so the collected order follows I/O timing. Resource
		// resolution resolves clashes by keeping the first match, which must not change between runs:
		// sort by code point rather than by locale so the winner is the same on every machine too.
		return routeUris.sort((a, b) => (a.fsPath < b.fsPath ? -1 : Number(a.fsPath > b.fsPath)));
	}

	/**
	 * Extract referenced schema and XSLT relative file paths from a metadata entry.
	 */
	static extractReferencedFilesFromEntry(entry: DataMapperMetadataEntry): string[] {
		const files: string[] = [];

		if (typeof entry.xsltPath === 'string' && entry.xsltPath.trim().length > 0) {
			files.push(entry.xsltPath.trim());
		}

		const collectArrayPaths = (filePaths?: string[]) => {
			if (Array.isArray(filePaths)) {
				for (const fp of filePaths) {
					if (typeof fp === 'string' && fp.trim().length > 0) {
						files.push(fp.trim());
					}
				}
			}
		};

		collectArrayPaths(entry.sourceBody?.filePath);
		collectArrayPaths(entry.targetBody?.filePath);

		if (entry.sourceParameters && typeof entry.sourceParameters === 'object' && !Array.isArray(entry.sourceParameters)) {
			for (const param of Object.values(entry.sourceParameters)) {
				collectArrayPaths(param?.filePath);
			}
		}

		return files;
	}

	/**
	 * Filter .kaoto metadata entries to only keep those relevant to the exported routes.
	 */
	static filterMetadata(sourceMetadata: Record<string, DataMapperMetadataEntry>, refs: RouteReferences): Record<string, DataMapperMetadataEntry> {
		const filtered: Record<string, DataMapperMetadataEntry> = {};

		for (const [key, entry] of Object.entries(sourceMetadata)) {
			if (refs.stepIds.has(key)) {
				filtered[key] = entry;
			}
		}

		return filtered;
	}

	/**
	 * Find an existing source file by searching candidate paths concurrently.
	 * Priorities:
	 * 1. Classpath root of each exported route
	 * 2. .kaoto directory
	 * 3. Workspace directory
	 * 4. Parent directory of each exported route
	 *
	 * A relative path may legitimately point above its base (e.g. "../shared/order.xsd"), so candidates
	 * are kept only when they stay inside the workspace folder: the export must not reach out into
	 * arbitrary locations of the file system. Outside of a workspace folder there is no such boundary.
	 */
	static async findSourceFile(relFilePath: string, sourceKaotoDir: string, routeUris: vscode.Uri[], workspaceDir?: string): Promise<vscode.Uri | undefined> {
		const candidates: vscode.Uri[] = [];

		for (const routeUri of routeUris) {
			candidates.push(vscode.Uri.file(path.resolve(findClasspathRoot(routeUri), relFilePath)));
		}
		candidates.push(vscode.Uri.file(path.resolve(sourceKaotoDir, relFilePath)));
		if (workspaceDir) {
			candidates.push(vscode.Uri.file(path.resolve(workspaceDir, relFilePath)));
		}
		for (const routeUri of routeUris) {
			candidates.push(vscode.Uri.file(path.resolve(path.dirname(routeUri.fsPath), relFilePath)));
		}

		const searchable = candidates.filter((candidate) => KaotoMetadataExportService.isWithinWorkspace(candidate.fsPath, workspaceDir));
		if (searchable.length < candidates.length) {
			KaotoOutputChannel.logWarning(`Kaoto export: "${relFilePath}" points outside the workspace folder; those locations are not searched.`);
		}

		const stats = await Promise.all(
			searchable.map(async (candidate) => {
				try {
					await vscode.workspace.fs.stat(candidate);
					return candidate;
				} catch {
					return undefined;
				}
			}),
		);

		return stats.find((candidate): candidate is vscode.Uri => candidate !== undefined);
	}

	/**
	 * Route files the export produced, or none when it did not even create the classpath root.
	 */
	private static async collectExportedRouteUris(targetResourcesDir: string): Promise<vscode.Uri[]> {
		try {
			return await KaotoMetadataExportService.collectSourceRouteUris(vscode.Uri.file(targetResourcesDir));
		} catch {
			return [];
		}
	}

	/** Whether a path stays inside a directory, rather than pointing next to or above it. */
	private static isInsideDirectory(directory: string, candidatePath: string): boolean {
		const relative = path.relative(directory, candidatePath);
		return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !relative.startsWith('../') && !path.isAbsolute(relative);
	}

	/**
	 * Whether a resolved path stays inside the given workspace folder. Without a workspace folder
	 * (a route opened on its own) every path is accepted, which matches the .kaoto lookup.
	 */
	private static isWithinWorkspace(candidatePath: string, workspaceDir?: string): boolean {
		return workspaceDir === undefined || KaotoMetadataExportService.isInsideDirectory(workspaceDir, candidatePath);
	}

	/**
	 * Post-export handler: copies relevant schemas, XSLT files, and writes a filtered .kaoto file
	 * into the exported project.
	 */
	static async copyMetadataAndResources(sourceUri: vscode.Uri, outputFolder: vscode.Uri): Promise<void> {
		// Find the existing .kaoto file by walking upwards from the source route/folder to the workspace root.
		// Note: As specified in #1808, .kaoto metadata discovery is an upward search; any .kaoto file located
		// in subfolders below the exported route/folder will not be discovered.
		const sourceKaotoUri = await findExistingKaotoMetadataFile(sourceUri);
		if (!sourceKaotoUri) {
			KaotoOutputChannel.logInfo(`Kaoto export: no .kaoto metadata file found when searching upwards from ${sourceUri.fsPath}. Nothing to export.`);
			return;
		}
		KaotoOutputChannel.logInfo(`Kaoto export: using metadata file ${sourceKaotoUri.fsPath}.`);

		const sourceMetadata = await KaotoMetadataExportService.readMetadataFile(sourceKaotoUri);
		if (!sourceMetadata) {
			KaotoOutputChannel.logWarning(`Kaoto export: ${sourceKaotoUri.fsPath} does not contain a JSON object. Nothing to export.`);
			return;
		}

		const { routeUris, routeRefs, refs } = await KaotoMetadataExportService.collectAllRouteReferences(sourceUri);
		const filteredMetadata = KaotoMetadataExportService.filterMetadata(sourceMetadata, refs);
		KaotoOutputChannel.logInfo(
			`Kaoto export: scanned ${routeUris.length} route file(s), found ${refs.stepIds.size} step id(s); ` +
				`${Object.keys(filteredMetadata).length} of ${Object.keys(sourceMetadata).length} metadata entries are relevant.`,
		);
		if (Object.keys(filteredMetadata).length === 0) {
			KaotoOutputChannel.logInfo('Kaoto export: no metadata entry matches the exported routes. Skipping the .kaoto write.');
			return;
		}

		const context: ResourceExportContext = {
			sourceKaotoDir: path.dirname(sourceKaotoUri.fsPath),
			targetResourcesDir: path.join(outputFolder.fsPath, 'src', 'main', 'resources'),
			routeUris,
			workspaceDir: vscode.workspace.getWorkspaceFolder(sourceUri)?.uri.fsPath,
		};

		// Camel JBang reports success even when it exported no route at all, for instance when the routes
		// sit in subfolders it does not scan. Metadata and schemas have nothing to belong to then.
		const exportedRoutes = await KaotoMetadataExportService.collectExportedRouteUris(context.targetResourcesDir);
		if (exportedRoutes.length === 0) {
			KaotoOutputChannel.logWarning('Kaoto export: the exported project contains no route file. Skipping the DataMapper metadata export.');
			return;
		}

		const destKaotoUri = vscode.Uri.joinPath(outputFolder, '.kaoto');
		const isInPlaceExport = arePathsEqual(destKaotoUri.fsPath, sourceKaotoUri.fsPath);
		// The target can already be a Kaoto project, for instance when the same folder is exported into
		// twice. Its entries are read before anything is copied so that they survive the write below.
		const targetMetadata = isInPlaceExport ? { metadata: {} } : await KaotoMetadataExportService.readDestinationMetadata(destKaotoUri);

		const ownedEntries = KaotoMetadataExportService.resolveEntryOwners(filteredMetadata, routeRefs);
		const { missingFiles, conflicts } = await KaotoMetadataExportService.copyReferencedResources(ownedEntries, context);

		if (missingFiles.length > 0) {
			vscode.window.showWarningMessage(
				`Kaoto export: The following schema/XSLT files were not found and could not be copied: ${missingFiles.join(', ')}`,
			);
		}

		if (conflicts.length > 0) {
			vscode.window.showWarningMessage(`Kaoto export: ${conflicts.join(' ')}`);
		}

		if (isInPlaceExport) {
			KaotoOutputChannel.logInfo('Kaoto export: the target already holds the source .kaoto file, so it is left as it is.');
			return;
		}
		await KaotoMetadataExportService.writeExportedMetadata(destKaotoUri, filteredMetadata, targetMetadata);
	}

	/**
	 * Write the metadata of this export to the target, keeping the entries it already holds. Entries of
	 * the current export win when both name the same step ID.
	 */
	private static async writeExportedMetadata(
		destKaotoUri: vscode.Uri,
		filteredMetadata: Record<string, DataMapperMetadataEntry>,
		targetMetadata: { metadata: Record<string, DataMapperMetadataEntry>; unreadable?: boolean },
	): Promise<void> {
		if (targetMetadata.unreadable) {
			vscode.window.showWarningMessage(
				`Kaoto export: ${destKaotoUri.fsPath} could not be read, so it was left untouched and the exported DataMapper metadata was not written.`,
			);
			return;
		}

		const exportedMetadata = { ...targetMetadata.metadata, ...filteredMetadata };
		await vscode.workspace.fs.writeFile(destKaotoUri, new TextEncoder().encode(JSON.stringify(exportedMetadata, null, '\t')));
		KaotoOutputChannel.logInfo(
			`Kaoto export: wrote ${Object.keys(filteredMetadata).length} metadata entries to ${destKaotoUri.fsPath} ` +
				`(${Object.keys(targetMetadata.metadata).length} entries already present were kept).`,
		);
	}

	/**
	 * Read the `.kaoto` file of the export target, if any. Only a missing file counts as "nothing there":
	 * a file that cannot be read or does not hold a JSON object must not be replaced, because that would
	 * destroy metadata of routes outside this export.
	 */
	private static async readDestinationMetadata(uri: vscode.Uri): Promise<{ metadata: Record<string, DataMapperMetadataEntry>; unreadable?: boolean }> {
		try {
			const metadata = await KaotoMetadataExportService.readMetadataFile(uri);
			if (!metadata) {
				KaotoOutputChannel.logWarning(`Kaoto export: ${uri.fsPath} does not contain a JSON object; it will not be replaced.`);
				return { metadata: {}, unreadable: true };
			}
			return { metadata };
		} catch (error) {
			if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
				return { metadata: {} };
			}
			KaotoOutputChannel.logWarning(`Kaoto export: cannot read ${uri.fsPath}; it will not be replaced. ${error}`);
			return { metadata: {}, unreadable: true };
		}
	}

	/** Parse a .kaoto file, or `undefined` when its content is not a JSON object. Read errors are thrown to the caller. */
	private static async readMetadataFile(uri: vscode.Uri): Promise<Record<string, DataMapperMetadataEntry> | undefined> {
		const raw = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return undefined;
		}
		return parsed as Record<string, DataMapperMetadataEntry>;
	}

	/** Step IDs of every exported route, both per route (to tell entries apart) and merged (to filter them). */
	private static async collectAllRouteReferences(
		sourceUri: vscode.Uri,
	): Promise<{ routeUris: vscode.Uri[]; routeRefs: RouteWithReferences[]; refs: RouteReferences }> {
		const routeUris = await KaotoMetadataExportService.collectSourceRouteUris(sourceUri);
		const perFileRefs = await Promise.all(routeUris.map((routeUri) => KaotoMetadataExportService.readRouteReferences(routeUri)));

		const routeRefs: RouteWithReferences[] = [];
		const refs: RouteReferences = { stepIds: new Set<string>() };
		for (const [index, fileRefs] of perFileRefs.entries()) {
			if (!fileRefs) {
				continue;
			}
			routeRefs.push({ routeUri: routeUris[index], refs: fileRefs });
			fileRefs.stepIds.forEach((id) => refs.stepIds.add(id));
		}

		return { routeUris, routeRefs, refs };
	}

	/**
	 * Associate every kept metadata entry with the exported routes that reference it, so that its
	 * resources are resolved against the classpath root of the route that owns them. Without this,
	 * a same-named resource belonging to an unrelated route can be picked up instead.
	 */
	private static resolveEntryOwners(filteredMetadata: Record<string, DataMapperMetadataEntry>, routeRefs: RouteWithReferences[]): OwnedMetadataEntry[] {
		return Object.entries(filteredMetadata).map(([key, entry]) => ({
			key,
			entry,
			ownerRoutes: routeRefs.filter(({ refs }) => refs.stepIds.has(key)).map(({ routeUri }) => routeUri),
		}));
	}

	/**
	 * Reads a single route file and extracts its references.
	 * Failures are logged and result in `undefined` so that one broken route doesn't abort the export.
	 */
	private static async readRouteReferences(routeUri: vscode.Uri): Promise<RouteReferences | undefined> {
		let content: string;
		try {
			content = new TextDecoder().decode(await vscode.workspace.fs.readFile(routeUri));
		} catch (err) {
			KaotoOutputChannel.logWarning(`Failed to read route file at ${routeUri.fsPath}: ${err}`);
			return undefined;
		}

		if (!content) {
			return undefined;
		}

		try {
			return KaotoMetadataExportService.collectRouteReferencesFromContent(content);
		} catch (err) {
			KaotoOutputChannel.logWarning(`Failed to parse route references from ${routeUri.fsPath}: ${err}`);
			return undefined;
		}
	}

	/** Copy every resource the kept entries reference into the exported classpath root, and rewrite their paths. */
	private static async copyReferencedResources(
		ownedEntries: OwnedMetadataEntry[],
		context: ResourceExportContext,
	): Promise<{ missingFiles: string[]; conflicts: string[] }> {
		// Several references can name one file differently ("schemas/a.xsd" and "../schemas/a.xsd"),
		// and once the parent segments are dropped they share a destination. Grouping by destination
		// makes "one destination, one exported file" a property of the data rather than something the
		// copy order has to maintain.
		const byDestination = new Map<string, { files: string[]; owners: vscode.Uri[] }>();
		for (const { entry, ownerRoutes } of ownedEntries) {
			for (const file of KaotoMetadataExportService.extractReferencedFilesFromEntry(entry)) {
				const destination = path.resolve(context.targetResourcesDir, KaotoMetadataExportService.normalizePath(file));
				const group = byDestination.get(destination) ?? { files: [], owners: [] };
				if (!group.files.includes(file)) {
					group.files.push(file);
				}
				for (const owner of ownerRoutes) {
					if (!group.owners.some((known) => arePathsEqual(known.fsPath, owner.fsPath))) {
						group.owners.push(owner);
					}
				}
				byDestination.set(destination, group);
			}
		}

		const results = await Promise.all(
			Array.from(byDestination, ([destination, group]) => KaotoMetadataExportService.exportDestination(destination, group, context)),
		);

		for (const { entry } of ownedEntries) {
			KaotoMetadataExportService.normalizeEntryPaths(entry);
		}

		return {
			missingFiles: results.flatMap((result) => result.missingFiles),
			conflicts: results.flatMap((result) => (result.conflict ? [result.conflict] : [])),
		};
	}

	/**
	 * Export the single file a destination stands for: gather the sources its references point at,
	 * report a clash when they are not the same file, and copy the winner once. A clash can come from
	 * routes that disagree on a path as well as from two spellings of one destination; both mean the
	 * exported project can only hold one of the candidates.
	 */
	private static async exportDestination(
		destination: string,
		group: { files: string[]; owners: vscode.Uri[] },
		context: ResourceExportContext,
	): Promise<{ missingFiles: string[]; conflict?: string }> {
		if (!KaotoMetadataExportService.isInsideDirectory(context.targetResourcesDir, destination)) {
			KaotoOutputChannel.logWarning(`Kaoto export: "${group.files.join('", "')}" would be written outside the exported project. Skipping it.`);
			return { missingFiles: group.files };
		}

		const candidates = (
			await Promise.all(group.files.map((file) => KaotoMetadataExportService.resolveResourceSources(file, group.owners, context)))
		).flat();

		const distinct: vscode.Uri[] = [];
		for (const candidate of candidates) {
			if (!distinct.some((known) => arePathsEqual(known.fsPath, candidate.fsPath))) {
				distinct.push(candidate);
			}
		}

		if (distinct.length === 0) {
			KaotoOutputChannel.logWarning(`Kaoto export: referenced resource "${group.files.join('", "')}" was not found in the source project.`);
			return { missingFiles: group.files };
		}

		let conflict: string | undefined;
		if (distinct.length > 1) {
			const named = group.files.map((file) => `"${file}"`).join(' and ');
			conflict =
				`${named} ${group.files.length === 1 ? 'resolves' : 'resolve'} to several different files ` +
				`(${distinct.map((uri) => uri.fsPath).join(', ')}); exported ${distinct[0].fsPath}.`;
			KaotoOutputChannel.logWarning(`Kaoto export: ${conflict}`);
		}

		const copied = await KaotoMetadataExportService.copyResourceFile(distinct[0], destination);
		return { missingFiles: copied ? [] : group.files, conflict };
	}

	/**
	 * Every source file the given reference can stand for: one per owning route, because a relative
	 * path means something different under each classpath root. The lookup keeps the original path
	 * including leading "../" segments; those are stripped only for the destination.
	 */
	private static async resolveResourceSources(relFilePath: string, ownerRoutes: vscode.Uri[], context: ResourceExportContext): Promise<vscode.Uri[]> {
		const lookupRelPath = relFilePath.replaceAll('\\', '/');
		const perOwner = await Promise.all(
			ownerRoutes.map((ownerRoute) =>
				KaotoMetadataExportService.findSourceFile(lookupRelPath, context.sourceKaotoDir, [ownerRoute], context.workspaceDir),
			),
		);
		const resolved = perOwner.filter((candidate): candidate is vscode.Uri => candidate !== undefined);
		if (resolved.length > 0) {
			return resolved;
		}

		// No owning route resolved it (or the entry has no owner): fall back to every exported route.
		const fallback = await KaotoMetadataExportService.findSourceFile(lookupRelPath, context.sourceKaotoDir, context.routeUris, context.workspaceDir);
		return fallback ? [fallback] : [];
	}

	/** Copy one resolved source file to its destination inside the exported classpath root. */
	private static async copyResourceFile(srcFileUri: vscode.Uri, destination: string): Promise<boolean> {
		if (arePathsEqual(srcFileUri.fsPath, destination)) {
			return true; // already in place, nothing to copy
		}

		try {
			const destFileUri = vscode.Uri.file(destination);
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(destination)));
			await vscode.workspace.fs.copy(srcFileUri, destFileUri, { overwrite: true });
			KaotoOutputChannel.logInfo(`Kaoto export: copied ${srcFileUri.fsPath} to ${destination}.`);
			return true;
		} catch (copyError) {
			KaotoOutputChannel.logWarning(`Kaoto export: failed to copy a resource to "${destination}": ${copyError}`);
			return false;
		}
	}

	/**
	 * Normalizes path separators to forward slashes and strips leading './' or '../' segments
	 * so that paths are safely resolved relative to the target classpath root (src/main/resources).
	 * Note: files referencing paths genuinely outside the project tree will be reported as missing
	 * rather than written outside the target directory.
	 */
	private static normalizePath(p: string): string {
		return p.replaceAll('\\', '/').replace(/^(\.[/\\]|\.\.[/\\])+/, '');
	}

	/** Rewrite the paths of an entry to where its files were exported, relative to the exported classpath root. */
	private static normalizeEntryPaths(entry: DataMapperMetadataEntry): void {
		const norm = KaotoMetadataExportService.normalizePath;
		if (entry.xsltPath) {
			entry.xsltPath = norm(entry.xsltPath);
		}
		if (Array.isArray(entry.sourceBody?.filePath)) {
			entry.sourceBody.filePath = entry.sourceBody.filePath.map(norm);
		}
		if (Array.isArray(entry.targetBody?.filePath)) {
			entry.targetBody.filePath = entry.targetBody.filePath.map(norm);
		}
		if (entry.sourceParameters && typeof entry.sourceParameters === 'object' && !Array.isArray(entry.sourceParameters)) {
			for (const param of Object.values(entry.sourceParameters)) {
				if (Array.isArray(param?.filePath)) {
					param.filePath = param.filePath.map(norm);
				}
			}
		}
	}
}
