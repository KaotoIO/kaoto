import * as vscode from 'vscode';
import { DocumentFilter } from 'vscode-languageclient';

/**
 * Document selectors for Camel-specific files.
 * The LSP client will activate only for files matching these patterns.
 *
 * The files are matched by name only, whatever their language: a `files.associations` setting such as
 * `{ "*.yaml": "camel" }` gives them another language, and so do the Quarkus and Spring Boot extensions to
 * `application*.properties` (`quarkus-properties`, `spring-boot-properties`). The server tells YAML, XML and
 * properties files apart by their file extension, not by their language.
 */
// `satisfies` (rather than a `: DocumentFilter[]` annotation) validates each entry against the
// `DocumentFilter` union while keeping the narrower inferred element type (`{ pattern }`)
// so consumers (and this module's tests) can rely on `pattern` always being present.
export const CAMEL_LSP_DOCUMENT_SELECTORS = [
	{ pattern: '**/*.camel.{yaml,yml}' },
	{ pattern: '**/*.kamelet.{yaml,yml}' },
	{ pattern: '**/*.camel.xml' },
	{ pattern: '**/application*.properties' },
] satisfies DocumentFilter[];

/**
 * @returns whether the LSP serves the document; the LSP server is started when the first one is opened
 */
export function isCamelLspDocument(document: vscode.TextDocument): boolean {
	return vscode.languages.match(CAMEL_LSP_DOCUMENT_SELECTORS, document) > 0;
}

/**
 * @param except a document that is being closed, which does not count
 * @returns whether a document that the LSP serves is open: the LSP server runs only while one is
 */
export function hasOpenCamelLspDocument(except?: vscode.TextDocument): boolean {
	return vscode.workspace.textDocuments.some((document) => document !== except && isCamelLspDocument(document));
}

/**
 * @returns whether the active tab shows a document that the LSP serves, in a text editor or in a custom editor
 * such as the Kaoto editor, which has no active text editor
 */
export function isCamelLspTabActive(): boolean {
	const uris = getTabUris(vscode.window.tabGroups.activeTabGroup.activeTab?.input).map((uri) => uri.toString());
	return uris.length > 0 && vscode.workspace.textDocuments.some((document) => uris.includes(document.uri.toString()) && isCamelLspDocument(document));
}

/**
 * @returns the documents that a tab shows: one for an editor, the two sides of a diff, none for the other tabs
 */
function getTabUris(input: unknown): vscode.Uri[] {
	if (input instanceof vscode.TabInputText || input instanceof vscode.TabInputCustom) {
		return [input.uri];
	}
	if (input instanceof vscode.TabInputTextDiff) {
		return [input.original, input.modified];
	}
	return [];
}
