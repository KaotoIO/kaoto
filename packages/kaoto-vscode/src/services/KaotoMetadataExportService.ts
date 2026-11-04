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
	xsltReferences: Set<string>;
}

/** References collected from a single exported route file. */
interface RouteWithReferences {
	routeUri: vscode.Uri;
	refs: RouteReferences;
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
	 * Recursively extract all `id` values and URI references from parsed YAML or object hierarchy.
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

		for (const [propName, value] of Object.entries(record)) {
			KaotoMetadataExportService.collectPropertyReference(propName, value, refs);
		}
	}

	private static collectStepId(value: unknown, stepIds: Set<string>): void {
		if (typeof value === 'string' && value.trim().length > 0) {
			stepIds.add(value.trim());
		}
	}

	private static collectPropertyReference(propName: string, value: unknown, refs: RouteReferences): void {
		if (typeof value === 'string') {
			KaotoMetadataExportService.extractXsltFromUriString(value, refs.xsltReferences);
			return;
		}

		if (typeof value === 'object' && value !== null) {
			if (propName === 'xslt-saxon' || propName === 'xslt') {
				const resourceUri = (value as Record<string, unknown>).resourceUri;
				if (typeof resourceUri === 'string') {
					refs.xsltReferences.add(resourceUri.trim());
				}
			}
			KaotoMetadataExportService.collectReferencesFromObject(value, refs);
		}
	}

	/**
	 * Extract XSLT file references from a Camel URI string (e.g. "xslt-saxon:transform.xsl",
	 * "xslt:classpath:path/to/mapping.xsl", or "xslt:file:mappings/transform.xsl").
	 */
	static extractXsltFromUriString(uriStr: string, xsltRefs: Set<string>): void {
		const match = /(?:xslt-saxon|xslt):(?:classpath:|file:)?([^?\s"']+)/.exec(uriStr);
		if (match?.[1]) {
			xsltRefs.add(match[1].trim());
		}
	}

	/**
	 * Collect step IDs and XSLT references from route file content (YAML or XML).
	 */
	static collectRouteReferencesFromContent(content: string): RouteReferences {
		const refs: RouteReferences = {
			stepIds: new Set<string>(),
			xsltReferences: new Set<string>(),
		};

		if (content.trimStart().startsWith('<')) {
			KaotoMetadataExportService.collectXmlRouteReferences(content, refs);
		} else {
			KaotoMetadataExportService.collectYamlRouteReferences(content, refs);
		}

		return refs;
	}

	private static collectXmlRouteReferences(content: string, refs: RouteReferences): void {
		const idRegex = /\b(?:id|stepId)\s*[:=]\s*["']?([a-zA-Z0-9_-]+)["']?/g;
		for (const match of content.matchAll(idRegex)) {
			if (match[1]) {
				refs.stepIds.add(match[1]);
			}
		}

		const xsltRegex = /(?:xslt-saxon|xslt):(?:classpath:|file:)?([^?\s"']+)/g;
		for (const match of content.matchAll(xsltRegex)) {
			if (match[1]) {
				refs.xsltReferences.add(match[1].trim());
			}
		}
	}

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
			if (KaotoMetadataExportService.isEntryReferenced(key, entry, refs)) {
				filtered[key] = entry;
			}
		}

		return filtered;
	}

	/**
	 * Whether a metadata entry belongs to the given set of route references, either because the entry
	 * key is one of the route step IDs or because its XSLT file is referenced by the route.
	 */
	private static isEntryReferenced(key: string, entry: DataMapperMetadataEntry, refs: RouteReferences): boolean {
		if (refs.stepIds.has(key)) {
			return true;
		}

		if (!entry.xsltPath) {
			return false;
		}

		const cleanXsltPath = KaotoMetadataExportService.normalizePath(entry.xsltPath);
		const xsltBaseName = path.posix.basename(cleanXsltPath);

		return Array.from(refs.xsltReferences).some((ref) => {
			const cleanRef = KaotoMetadataExportService.normalizePath(ref);
			if (cleanRef === cleanXsltPath) {
				return true;
			}
			// Only match by basename if the route reference contains no directory path
			return !cleanRef.includes('/') && xsltBaseName === cleanRef;
		});
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
	 * Whether a resolved path stays inside the given workspace folder. Without a workspace folder
	 * (a route opened on its own) every path is accepted, which matches the .kaoto lookup.
	 */
	private static isWithinWorkspace(candidatePath: string, workspaceDir?: string): boolean {
		if (!workspaceDir) {
			return true;
		}
		const relative = path.relative(workspaceDir, candidatePath);
		return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
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
			`Kaoto export: scanned ${routeUris.length} route file(s), found ${refs.stepIds.size} step id(s) and ${refs.xsltReferences.size} XSLT reference(s); ` +
				`${Object.keys(filteredMetadata).length} of ${Object.keys(sourceMetadata).length} metadata entries are relevant.`,
		);
		if (Object.keys(filteredMetadata).length === 0) {
			KaotoOutputChannel.logInfo('Kaoto export: no metadata entry matches the exported routes. Skipping the .kaoto write.');
			return;
		}

		// The export target can already be a Kaoto project, for instance when the same folder is exported
		// into twice. Its entries are read before anything is copied so that they are preserved.
		const destKaotoUri = vscode.Uri.joinPath(outputFolder, '.kaoto');
		const destination = arePathsEqual(destKaotoUri.fsPath, sourceKaotoUri.fsPath)
			? { metadata: {} }
			: await KaotoMetadataExportService.readDestinationMetadata(destKaotoUri);

		const sourceKaotoDir = path.dirname(sourceKaotoUri.fsPath);
		const workspaceDir = vscode.workspace.getWorkspaceFolder(sourceUri)?.uri.fsPath;
		const targetResourcesDir = path.join(outputFolder.fsPath, 'src', 'main', 'resources');

		const ownedEntries = KaotoMetadataExportService.resolveEntryOwners(filteredMetadata, routeRefs);
		const { missingFiles, conflicts } = await KaotoMetadataExportService.copyReferencedResources(
			ownedEntries,
			sourceKaotoDir,
			targetResourcesDir,
			routeUris,
			workspaceDir,
		);

		if (missingFiles.length > 0) {
			vscode.window.showWarningMessage(
				`Kaoto export: The following schema/XSLT files were not found and could not be copied: ${missingFiles.join(', ')}`,
			);
		}

		if (conflicts.length > 0) {
			vscode.window.showWarningMessage(`Kaoto export: ${conflicts.join(' ')}`);
		}

		// Write the filtered .kaoto file to the root of the exported project
		if (arePathsEqual(destKaotoUri.fsPath, sourceKaotoUri.fsPath)) {
			KaotoOutputChannel.logInfo('Export target already contains the source .kaoto file. Skipping the filtered .kaoto write.');
			return;
		}

		if (destination.unreadable) {
			vscode.window.showWarningMessage(
				`Kaoto export: ${destKaotoUri.fsPath} could not be read, so it was left untouched and the exported DataMapper metadata was not written.`,
			);
			return;
		}

		// Entries of the current export win over entries of the same step ID already in the target.
		const exportedMetadata = { ...destination.metadata, ...filteredMetadata };
		await vscode.workspace.fs.writeFile(destKaotoUri, new TextEncoder().encode(JSON.stringify(exportedMetadata, null, '\t')));
		KaotoOutputChannel.logInfo(
			`Kaoto export: wrote ${Object.keys(filteredMetadata).length} metadata entries to ${destKaotoUri.fsPath} ` +
				`(${Object.keys(destination.metadata).length} entries already present were kept).`,
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

	private static async readMetadataFile(uri: vscode.Uri): Promise<Record<string, DataMapperMetadataEntry> | undefined> {
		const raw = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return undefined;
		}
		return parsed as Record<string, DataMapperMetadataEntry>;
	}

	private static async collectAllRouteReferences(
		sourceUri: vscode.Uri,
	): Promise<{ routeUris: vscode.Uri[]; routeRefs: RouteWithReferences[]; refs: RouteReferences }> {
		const routeUris = await KaotoMetadataExportService.collectSourceRouteUris(sourceUri);
		const perFileRefs = await Promise.all(routeUris.map((routeUri) => KaotoMetadataExportService.readRouteReferences(routeUri)));

		const routeRefs: RouteWithReferences[] = [];
		const refs: RouteReferences = {
			stepIds: new Set<string>(),
			xsltReferences: new Set<string>(),
		};
		for (const [index, fileRefs] of perFileRefs.entries()) {
			if (!fileRefs) {
				continue;
			}
			routeRefs.push({ routeUri: routeUris[index], refs: fileRefs });
			fileRefs.stepIds.forEach((id) => refs.stepIds.add(id));
			fileRefs.xsltReferences.forEach((xslt) => refs.xsltReferences.add(xslt));
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
			ownerRoutes: routeRefs.filter(({ refs }) => KaotoMetadataExportService.isEntryReferenced(key, entry, refs)).map(({ routeUri }) => routeUri),
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

	private static async copyReferencedResources(
		ownedEntries: OwnedMetadataEntry[],
		sourceKaotoDir: string,
		targetResourcesDir: string,
		routeUris: vscode.Uri[],
		workspaceDir?: string,
	): Promise<{ missingFiles: string[]; conflicts: string[] }> {
		const missingFiles: string[] = [];
		const conflicts: string[] = [];

		// Group by referenced path so a file shared by several entries is copied once, while keeping
		// every owning route so the source can be resolved against the route it belongs to.
		const filesWithOwners = new Map<string, vscode.Uri[]>();
		for (const { entry, ownerRoutes } of ownedEntries) {
			for (const file of KaotoMetadataExportService.extractReferencedFilesFromEntry(entry)) {
				const owners = filesWithOwners.get(file) ?? [];
				owners.push(...ownerRoutes.filter((owner) => !owners.some((known) => arePathsEqual(known.fsPath, owner.fsPath))));
				filesWithOwners.set(file, owners);
			}
		}

		const resolutions = await Promise.all(
			Array.from(filesWithOwners.entries()).map(async ([file, owners]) => ({
				file,
				...(await KaotoMetadataExportService.resolveResourceSource(file, sourceKaotoDir, owners, routeUris, workspaceDir)),
			})),
		);

		// Leading "../" segments are stripped from the destination, so unrelated references can end up on the
		// same file inside the exported classpath root. Only the first one is exported; the rest would
		// silently overwrite it, leaving a metadata entry pointing at another entry's schema.
		const takenDestinations = new Map<string, { file: string; srcFileUri?: vscode.Uri }>();
		const copyResults = await Promise.all(
			resolutions.map(async (resolution) => {
				const destination = path.resolve(targetResourcesDir, KaotoMetadataExportService.normalizePath(resolution.file));
				const claim = takenDestinations.get(destination);
				if (claim?.srcFileUri && resolution.srcFileUri) {
					if (!arePathsEqual(claim.srcFileUri.fsPath, resolution.srcFileUri.fsPath)) {
						const conflict =
							`"${resolution.file}" and "${claim.file}" are both exported as "${path.relative(targetResourcesDir, destination)}"; ` +
							`kept the file of "${claim.file}".`;
						KaotoOutputChannel.logWarning(`Kaoto export: ${conflict}`);
						return { file: resolution.file, copied: true, conflict };
					}
					// The same file spelled differently, e.g. "schemas/a.xsd" and "../schemas/a.xsd" in one
					// .kaoto: the first claim already copies it, so this is not a clash and not a second copy.
					return { file: resolution.file, copied: true, conflict: resolution.conflict };
				}
				// A claim that resolved to a file is never downgraded by a later unresolved reference,
				// otherwise a third reference would no longer be compared against it.
				if (!claim?.srcFileUri) {
					takenDestinations.set(destination, { file: resolution.file, srcFileUri: resolution.srcFileUri });
				}

				const copied = await KaotoMetadataExportService.copyResourceFile(resolution.file, resolution.srcFileUri, targetResourcesDir);
				return { file: resolution.file, copied, conflict: resolution.conflict };
			}),
		);

		for (const result of copyResults) {
			if (!result.copied) {
				missingFiles.push(result.file);
			}
			if (result.conflict) {
				conflicts.push(result.conflict);
			}
		}

		for (const { entry } of ownedEntries) {
			KaotoMetadataExportService.normalizeEntryPaths(entry);
		}

		return { missingFiles, conflicts };
	}

	/**
	 * Resolve the source file of a referenced resource, preferring the classpath root of the routes
	 * that own the metadata entry. When owning routes disagree on the source file, the first one wins
	 * and the clash is reported, because both would otherwise be exported to the same destination.
	 */
	private static async resolveResourceSource(
		relFilePath: string,
		sourceKaotoDir: string,
		ownerRoutes: vscode.Uri[],
		routeUris: vscode.Uri[],
		workspaceDir?: string,
	): Promise<{ srcFileUri?: vscode.Uri; conflict?: string }> {
		// The lookup keeps the original relative path, including leading "../" segments: those are only
		// stripped for the destination, which must stay inside the exported classpath root.
		const lookupRelPath = relFilePath.replaceAll('\\', '/');

		const perOwner = await Promise.all(
			ownerRoutes.map((ownerRoute) => KaotoMetadataExportService.findSourceFile(lookupRelPath, sourceKaotoDir, [ownerRoute], workspaceDir)),
		);
		const resolved = perOwner.filter((candidate): candidate is vscode.Uri => candidate !== undefined);

		const distinct: vscode.Uri[] = [];
		for (const candidate of resolved) {
			if (!distinct.some((known) => arePathsEqual(known.fsPath, candidate.fsPath))) {
				distinct.push(candidate);
			}
		}

		if (distinct.length > 1) {
			const conflict =
				`"${relFilePath}" resolves to several different files (${distinct.map((uri) => uri.fsPath).join(', ')}); ` + `exported ${distinct[0].fsPath}.`;
			KaotoOutputChannel.logWarning(`Kaoto export: ${conflict}`);
			return { srcFileUri: distinct[0], conflict };
		}

		if (distinct.length === 1) {
			return { srcFileUri: distinct[0] };
		}

		// No owning route could resolve the file (or the entry has no owner): fall back to every exported route.
		return { srcFileUri: await KaotoMetadataExportService.findSourceFile(lookupRelPath, sourceKaotoDir, routeUris, workspaceDir) };
	}

	private static async copyResourceFile(relFilePath: string, srcFileUri: vscode.Uri | undefined, targetResourcesDir: string): Promise<boolean> {
		const cleanRelPath = KaotoMetadataExportService.normalizePath(relFilePath);
		const resolvedDestPath = path.resolve(targetResourcesDir, cleanRelPath);

		// Path traversal check
		const relToTarget = path.relative(targetResourcesDir, resolvedDestPath);
		const isTraversal = relToTarget === '..' || relToTarget.startsWith(`..${path.sep}`) || relToTarget.startsWith('../') || path.isAbsolute(relToTarget);
		if (isTraversal) {
			KaotoOutputChannel.logWarning(`Path traversal or invalid path detected for "${relFilePath}". Skipping export.`);
			return false;
		}

		if (!srcFileUri) {
			KaotoOutputChannel.logWarning(`Referenced resource file "${relFilePath}" was not found in source project.`);
			return false;
		}

		if (arePathsEqual(srcFileUri.fsPath, resolvedDestPath)) {
			return true; // already in place, nothing to copy
		}

		try {
			const destFileUri = vscode.Uri.file(resolvedDestPath);
			await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.dirname(destFileUri.fsPath)));
			await vscode.workspace.fs.copy(srcFileUri, destFileUri, { overwrite: true });
			KaotoOutputChannel.logInfo(`Kaoto export: copied "${relFilePath}" from ${srcFileUri.fsPath} to ${resolvedDestPath}.`);
			return true;
		} catch (copyError) {
			KaotoOutputChannel.logWarning(`Failed to copy resource file "${relFilePath}": ${copyError}`);
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
