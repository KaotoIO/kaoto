import * as vscode from 'vscode';
import { parseDocument } from 'yaml';
import { CatalogDefinition, CatalogLibrary, StarterTemplateId } from '@kaoto/camel-catalog/types';
import { BUNDLED_CATALOG_PATH } from '../constants';

/**
 * Stands in for a generated number in the starter templates, for example `route-__KAOTO_ID__`.
 */
export const KAOTO_ID_TOKEN = '__KAOTO_ID__';

/**
 * Where each template keeps the name given to the new file. Routes have none, they only get a generated id.
 */
const NAME_FIELD: Partial<Record<StarterTemplateId, readonly string[]>> = {
	'kamelet-source-yaml': ['metadata', 'name'],
	'kamelet-action-yaml': ['metadata', 'name'],
	'kamelet-sink-yaml': ['metadata', 'name'],
	'pipe-yaml': ['metadata', 'name'],
};

/**
 * A number from 1000 to 9999. It uses `globalThis.crypto` because the web worker build has no Node `crypto` module.
 */
export function randomKaotoId(): string {
	return String(1000 + (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
}

/**
 * Replaces every {@link KAOTO_ID_TOKEN} in the text, each one with its own `nextId()`.
 */
export function resolveKaotoIds(text: string, nextId: () => string = randomKaotoId): string {
	return text.replaceAll(KAOTO_ID_TOKEN, () => nextId());
}

interface StarterManifest {
	uri: vscode.Uri;
	definition: CatalogDefinition;
}

/**
 * Renders the starter templates published by `@kaoto/camel-catalog` and writes them as new files.
 * The templates come from the catalog bundled with the extension, never from the `kaoto.catalog.url` setting.
 */
export class StarterTemplateService {
	private manifest: Promise<StarterManifest> | undefined;

	constructor(private readonly catalogRoot: vscode.Uri) {}

	/**
	 * A service reading the catalog bundled with the extension, at {@link BUNDLED_CATALOG_PATH}.
	 */
	static forExtension(extensionUri: vscode.Uri): StarterTemplateService {
		return new StarterTemplateService(vscode.Uri.joinPath(extensionUri, BUNDLED_CATALOG_PATH));
	}

	/**
	 * The template exactly as published, with its tokens unresolved.
	 * Rejects with an error naming what is missing: the catalog index, its `starterTemplates` entry, the template's
	 * manifest entry or the template file.
	 */
	async getTemplate(id: StarterTemplateId): Promise<string> {
		const { uri: manifestUri, definition } = await this.loadManifest();
		const entry = definition.catalogs?.[id];
		if (!entry?.file) {
			throw new Error(`The starter templates manifest ${manifestUri.toString(true)} has no entry for "${id}"`);
		}
		// The file is named relative to the folder of the manifest.
		return readText(vscode.Uri.joinPath(manifestUri, '..', entry.file), `the starter template "${id}"`);
	}

	/**
	 * The template with every token resolved and its name field set to `name`, when the template has one and a name is
	 * given. The tokens are resolved first, so a name that happens to contain {@link KAOTO_ID_TOKEN} stays as it was typed.
	 */
	async renderTemplate(id: StarterTemplateId, name?: string): Promise<string> {
		const resolved = resolveKaotoIds(await this.getTemplate(id));
		const nameField = NAME_FIELD[id];
		return name !== undefined && nameField ? withName(resolved, nameField, name) : resolved;
	}

	/**
	 * Writes the rendered template to `target`, creating missing folders. Rejects when `target` already exists,
	 * and nothing is written when rendering fails.
	 * When the write itself fails, the partly written file is deleted on a best-effort basis and the error of the
	 * write is rethrown. An existing target is never deleted, and the folders created for the file are left in place.
	 */
	async writeStarterFile(id: StarterTemplateId, target: vscode.Uri, name?: string): Promise<void> {
		const content = await this.renderTemplate(id, name);
		if (await exists(target)) {
			throw new Error(`${target.fsPath} already exists`);
		}
		await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(target, '..'));
		try {
			await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(content));
		} catch (error) {
			// The target did not exist a moment ago, so whatever is there now is what this write left behind.
			await deleteQuietly(target);
			throw error;
		}
	}

	private loadManifest(): Promise<StarterManifest> {
		this.manifest ??= this.readManifest().catch((error: unknown) => {
			// A failed load is not kept: the next call reads the catalog again, so a repaired catalog works without a reload.
			this.manifest = undefined;
			throw error;
		});
		return this.manifest;
	}

	private async readManifest(): Promise<StarterManifest> {
		const indexUri = vscode.Uri.joinPath(this.catalogRoot, 'index.json');
		const index = await readJson<CatalogLibrary>(indexUri, 'the catalog index');
		if (!index?.starterTemplates) {
			throw new Error(`The catalog index ${indexUri.toString(true)} has no "starterTemplates" entry`);
		}
		const uri = vscode.Uri.joinPath(this.catalogRoot, index.starterTemplates);
		return { uri, definition: await readJson<CatalogDefinition>(uri, 'the starter templates manifest') };
	}
}

/**
 * Sets one field through the YAML document, so a name such as `123`, `true` or `orders #1` is quoted where YAML
 * would read it as something else. Everything else keeps the template's text, which is why the stringifier is told
 * not to re-wrap long lines.
 */
function withName(template: string, field: readonly string[], name: string): string {
	const document = parseDocument(template);
	document.setIn(field, name);
	return document.toString({ lineWidth: 0 });
}

async function readText(uri: vscode.Uri, what: string): Promise<string> {
	try {
		return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
	} catch (error) {
		const reason = error instanceof Error ? error.message : String(error);
		throw new Error(`Cannot read ${what} (${uri.toString(true)}): ${reason}`, { cause: error });
	}
}

async function readJson<T>(uri: vscode.Uri, what: string): Promise<T> {
	return JSON.parse(await readText(uri, what)) as T;
}

/**
 * Only a missing file counts as absent. Any other failure to look it up is rethrown, so that an existing file is
 * never overwritten on the strength of a failed lookup.
 */
async function exists(uri: vscode.Uri): Promise<boolean> {
	try {
		await vscode.workspace.fs.stat(uri);
		return true;
	} catch (error) {
		if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') {
			return false;
		}
		throw error;
	}
}

/**
 * Deletes a file and ignores a failure to do so: the caller has an error of its own to report.
 * Only call it for a file that the caller created.
 */
async function deleteQuietly(uri: vscode.Uri): Promise<void> {
	try {
		await vscode.workspace.fs.delete(uri, { useTrash: false });
	} catch {
		// Best effort only.
	}
}
