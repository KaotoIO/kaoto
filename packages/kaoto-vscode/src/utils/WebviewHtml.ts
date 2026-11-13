/**
 * Copyright 2026 Red Hat, Inc. and/or its affiliates.
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

/** Escapes a value for a double-quoted HTML attribute. */
export function escapeAttribute(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * The stylesheet and the script of the editor page, as the Vite dev server serves it. `webview.html` keeps these
 * paths, so it stays a regular page for Vite; production swaps them for the bundle copied into the extension.
 */
export const DEV_STYLESHEET_PATH = '/src/webview/webview-shell.scss';
export const DEV_SCRIPT_PATH = '/src/webview/start.tsx';
/** The scripts the Vite dev server injects into the page */
const VITE_SCRIPT_PATHS = ['/@vite/client', '/@react-refresh'];

export interface WebviewPageValues {
	csp: string;
	fileExtension: string;
	resourcesPathPrefix: string;
	hostShim: string;
}

/**
 * Fills the editor page copied into the extension: the bundle replaces the dev stylesheet and script, and the
 * nonce allows its scripts. Throws when the page misses one of them, as the editor would not start.
 */
export function fillWebviewHtml(template: string, values: WebviewPageValues & { nonce: string; stylesheet: string; script: string }): string {
	let page = fillPageValues(template, values);
	page = replaceToken(page, '__KAOTO_NONCE__', values.nonce);
	page = replaceToken(page, `"${DEV_STYLESHEET_PATH}"`, `"${escapeAttribute(values.stylesheet)}"`);
	page = replaceToken(page, `"${DEV_SCRIPT_PATH}"`, `"${escapeAttribute(values.script)}"`);
	return page;
}

/**
 * Fills the editor page that the Vite dev server serves: the editor, its loader styles and the scripts Vite injects
 * load from the dev server. Throws when the page misses one of them, as the editor would not start.
 */
export function fillDevWebviewHtml(html: string, origin: string, values: Omit<WebviewPageValues, 'resourcesPathPrefix'>): string {
	let page = fillPageValues(html, { ...values, resourcesPathPrefix: origin });
	for (const path of [DEV_STYLESHEET_PATH, DEV_SCRIPT_PATH, ...VITE_SCRIPT_PATHS]) {
		page = replaceToken(page, `"${path}"`, `"${escapeAttribute(origin)}${path}"`);
	}
	return page;
}

function fillPageValues(html: string, values: WebviewPageValues): string {
	let page = html;
	page = replaceToken(page, '__KAOTO_CSP__', escapeAttribute(values.csp));
	page = replaceToken(page, '__KAOTO_FILE_EXTENSION__', escapeAttribute(values.fileExtension));
	page = replaceToken(page, '__KAOTO_RESOURCES_PATH_PREFIX__', escapeAttribute(values.resourcesPathPrefix));
	page = replaceToken(page, '__KAOTO_HOST_SHIM__', escapeAttribute(values.hostShim));
	return page;
}

function replaceToken(html: string, token: string, replacement: string): string {
	if (!html.includes(token)) {
		throw new Error(`The Kaoto editor page is missing ${token}`);
	}
	return html.replaceAll(token, replacement);
}
