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

import * as vscode from 'vscode';
import {
	BridgeError,
	createEventBus,
	createPostMessageBridge,
	type BridgeConnection,
	type ContentSnapshot,
	type IEventBus,
	type JsonValue,
	type KaotoRequests,
	type KaotoResponses,
	type SettingsSnapshot,
	type Unsubscribe,
} from '@kaoto/kaoto/host-bridge';
import type { FileTypes, SuggestionRequestContext } from '@kaoto/kaoto/models';
import { KaotoHostServices } from '../services/KaotoHostServices';
import { KAOTO_EDITOR_VIEW_TYPE } from '../constants';
import { KaotoOutputChannel } from './KaotoOutputChannel';

export type KaotoHostServicesFactory = (getDocumentUri: () => vscode.Uri) => KaotoHostServices;

interface DocumentState {
	document: vscode.TextDocument;
	content: string;
	revision: number;
	lastSave?: { session: EditorSession; epoch: number; revision: number; content: string };
	savedContent?: string;
	sourceVersion: number;
	mirroredContent?: string;
	readonly: boolean;
	disposed: boolean;
	closing?: Promise<void>;
	panelDisposal?: vscode.Disposable;
	services: KaotoHostServices;
	queue: Promise<unknown>;
	session?: EditorSession;
	diagnostics: Set<string>;
}
interface EditorSession {
	panel: vscode.WebviewPanel;
	bus: IEventBus;
	bridge: BridgeConnection;
	epoch: number;
	wireId?: string;
	stopped: boolean;
	initialized: boolean;
	initializing: boolean;
	settingsVersion: number;
	settingsQueue: Promise<unknown>;
	whenReady: ReturnType<typeof readiness>;
	dispose(): void;
}

/** Shares the native text document with the source editor; owns per-panel bridge connections. */
export class KaotoEditorProvider implements vscode.CustomTextEditorProvider, vscode.Disposable {
	private readonly documents = new Map<string, DocumentState>();
	private readonly diagnostics = vscode.languages.createDiagnosticCollection('kaoto');
	private readonly listeners: vscode.Disposable[];
	private active?: DocumentState;
	private disposed = false;

	constructor(
		private readonly context: Pick<vscode.ExtensionContext, 'extensionUri'>,
		private readonly factory: KaotoHostServicesFactory = (getUri) => new KaotoHostServices(getUri),
	) {
		this.listeners = [
			vscode.workspace.onDidChangeTextDocument((event) => {
				const state = this.documents.get(event.document.uri.toString());
				if (!state) {
					return;
				}
				if (!event.contentChanges.length) {
					this.notifyDirty(state);
					return;
				}
				const content = event.document.getText();
				if (event.reason === undefined && content === state.mirroredContent) {
					this.notifyDirty(state);
					return;
				}
				const cleanChange = !event.document.isDirty;
				state.sourceVersion++;
				void this.enqueue(state, async () => {
					// Content events can precede the dirty-state event. Only persisted text can update the saved baseline.
					if (cleanChange && content === (await this.readSavedContent(state.document).catch(report))) {
						state.savedContent = content;
					}
					const session = this.session(state);
					const epoch = session.epoch;
					await session.whenReady.promise;
					this.requireSession(state, session, epoch);
					const result = await session.bus.request('editor:document:setContent', {
						reason: 'hostUpdate',
						fileUri: state.document.uri.toString(),
						content,
					});
					this.requireSession(state, session, epoch);
					if (result.applied) {
						state.content = content;
						state.revision = result.revision;
					}
					this.notifyDirty(state);
				}).catch(report);
			}),
			vscode.workspace.onWillSaveTextDocument((event) => {
				const state = this.documents.get(event.document.uri.toString());
				if (state?.session?.initialized) {
					event.waitUntil(this.prepareSave(state));
				}
			}),
			vscode.workspace.onDidSaveTextDocument((document) => {
				const state = this.documents.get(document.uri.toString());
				if (!state) {
					return;
				}
				const saved = state.lastSave;
				const encoding = document.encoding;
				void this.enqueue(state, async () => {
					// onDidSave can expose a newer text version as clean while an older version was written.
					const content = await this.readSavedContent(document, encoding);
					if (state.disposed) {
						return;
					}
					state.savedContent = content;
					const session = state.session;
					if (session?.initialized && saved && session === saved.session && session.epoch === saved.epoch) {
						const revision = this.normalizedContent(state) === content ? state.revision : saved.content === content ? saved.revision : undefined;
						if (revision !== undefined) {
							session.bus.emit('host:document:saved', { revision, isDirty: this.isDirty(state) });
						}
					}
					this.notifyDirty(state);
				}).catch(report);
			}),
			vscode.workspace.onDidChangeConfiguration((event) => {
				if (event.affectsConfiguration('kaoto')) {
					this.pushSettings();
				}
			}),
			vscode.window.onDidChangeActiveColorTheme(() => {
				for (const state of this.documents.values()) {
					if (state.session?.initialized) {
						state.session.bus.emit('host:theme:changed', { theme: themeName() });
					}
				}
				this.pushSettings();
			}),
		];
	}

	get activeDocumentUri(): vscode.Uri | undefined {
		return this.active?.document.uri;
	}

	async applyHistory(command: 'undo' | 'redo'): Promise<void> {
		if (this.active) {
			await this.applyDocumentHistory(this.active, command, this.active.revision);
		}
	}

	private async applyDocumentHistory(state: DocumentState, command: 'undo' | 'redo', revision: number): Promise<null> {
		const session = this.session(state);
		const epoch = session.epoch;
		await this.enqueue(state, async () => {
			this.requireSession(state, session, epoch);
			const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
			const activeUri = input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText ? input.uri.toString() : undefined;
			// Native undo/redo targets the active editor, not a URI argument. Never redirect focus to a background document.
			if (!session.initialized || state.readonly || activeUri !== state.document.uri.toString()) {
				throw new BridgeError('NOT_READY', 'Focus this document before using Undo or Redo');
			}
			if (revision !== state.revision || this.normalizedContent(state) !== state.document.getText()) {
				throw new BridgeError('NOT_READY', 'The document changed; wait for synchronization before using Undo or Redo');
			}
			await vscode.commands.executeCommand(command);
		});
		// Content events produced by the native command queue the authoritative snapshot for the canvas.
		await state.queue;
		return null;
	}

	async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
		await this.documents.get(document.uri.toString())?.closing;
		checkCancellation(token);
		if (this.disposed) {
			throw new BridgeError('DISPOSED', 'The editor provider has been disposed');
		}
		if (this.documents.has(document.uri.toString())) {
			throw new BridgeError('NOT_READY', 'A graphical editor is already open for this document');
		}
		const state: DocumentState = {
			document,
			content: document.getText(),
			savedContent: document.isDirty ? undefined : document.getText(),
			revision: 0,
			sourceVersion: 0,
			readonly: vscode.workspace.fs.isWritableFileSystem(document.uri.scheme) === false,
			disposed: false,
			services: this.factory(() => document.uri),
			queue: Promise.resolve(),
			diagnostics: new Set(),
		};
		this.documents.set(document.uri.toString(), state);
		const listeners: (vscode.Disposable | Unsubscribe)[] = [];
		const session = {
			panel,
			epoch: 0,
			stopped: false,
			initialized: false,
			initializing: false,
			settingsVersion: -1,
			settingsQueue: Promise.resolve(),
			whenReady: readiness(),
		} as EditorSession;
		state.session = session;
		session.bus = createEventBus({
			role: 'host',
			onError: (error) => {
				report(error);
				// Invalid or retired frames are dropped by the bridge; they do not close it.
				if (!(error instanceof BridgeError && error.code === 'INVALID_MESSAGE')) {
					session.dispose();
				}
			},
		});
		session.bridge = createPostMessageBridge({
			bus: session.bus,
			transport: {
				send: async (message) => {
					// Only validated outgoing welcome messages identify a new editor session.
					if (message.kind === 'welcome' && session.wireId !== message.sessionId) {
						if (session.wireId) {
							session.whenReady.reject(new BridgeError('DISPOSED', 'The editor started a new session'));
							session.whenReady = readiness();
							session.epoch++;
						}
						session.wireId = message.sessionId;
						session.initialized = false;
						session.initializing = false;
						state.revision = 0;
					}
					if (!(await panel.webview.postMessage(message))) {
						throw new BridgeError('IO_ERROR', 'The editor rejected message delivery');
					}
				},
				onMessage: (handler) => {
					const subscription = panel.webview.onDidReceiveMessage(handler);
					return () => subscription.dispose();
				},
				dispose: () => {},
			},
		});
		session.dispose = () => {
			if (session.stopped) {
				return;
			}
			session.stopped = true;
			session.initialized = false;
			session.whenReady.reject(new BridgeError('DISPOSED', 'The editor was closed'));
			listeners.splice(0).forEach((listener) => (typeof listener === 'function' ? listener() : listener.dispose()));
			session.bridge.dispose();
			session.bus.dispose();
			if (this.active === state) {
				this.active = undefined;
			}
		};
		// Panel lifetime outlives a failed bridge session. Flush accepted text edits before releasing it.
		state.panelDisposal = panel.onDidDispose(() => {
			session.dispose();
			state.closing = state.queue.then(() => this.disposeDocument(state));
		});
		listeners.push(
			panel.onDidChangeViewState(() => {
				if (panel.active) {
					this.active = state;
				} else if (this.active === state) {
					this.active = undefined;
				}
			}),
		);
		if (panel.active) {
			this.active = state;
		}
		this.bindServices(state, session, listeners);
		listeners.push(
			session.bus.on('editor:ready', () => {
				void this.initialize(state, session).catch(report);
			}),
			session.bus.on('editor:document:changed', (snapshot) => {
				if (session.initialized) {
					this.changed(state, snapshot);
				}
			}),
			session.bus.on('editor:document:saveRequested', () => {
				if (session.initialized) {
					void vscode.commands.executeCommand('workbench.action.files.save', document.uri).then(undefined, report);
				}
			}),
			session.bus.on('editor:step:updated', ({ action, stepType, stepName }) => {
				void state.services.onStepUpdated(action, stepType, stepName).catch(report);
			}),
			session.bus.on('host:notification:show', ({ message, type }) => {
				const show =
					type === 'error'
						? vscode.window.showErrorMessage
						: type === 'warning'
							? vscode.window.showWarningMessage
							: vscode.window.showInformationMessage;
				void show(message);
			}),
			session.bus.on('editor:notifications:set', ({ path, notifications }) => {
				const uri = !path ? document.uri : /^[a-z][a-z\d+.-]*:/i.test(path) ? vscode.Uri.parse(path) : vscode.Uri.joinPath(document.uri, '..', path);
				state.diagnostics.add(uri.toString());
				this.diagnostics.set(
					uri,
					notifications.map(
						({ message, severity, range }) =>
							new vscode.Diagnostic(
								range
									? new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character)
									: new vscode.Range(0, 0, 0, 0),
								message,
								severity === 'error'
									? vscode.DiagnosticSeverity.Error
									: severity === 'warning'
										? vscode.DiagnosticSeverity.Warning
										: vscode.DiagnosticSeverity.Information,
							),
					),
				);
			}),
		);
		panel.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				// Webpack emits lazy chunks and fonts beside the webview directory.
				vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
				vscode.workspace.getWorkspaceFolder(document.uri)?.uri ?? vscode.Uri.joinPath(document.uri, '..'),
			],
		};
		void session.bridge.connect().catch(report);
		panel.webview.html = this.html(document.uri, panel.webview);
	}

	private async prepareSave(state: DocumentState): Promise<void> {
		const cancellation = new vscode.CancellationTokenSource();
		try {
			await this.enqueue(state, async () => {
				const version = state.sourceVersion;
				const { session, epoch } = await this.snapshot(state, cancellation.token);
				// A source edit that arrived during the snapshot must not be overwritten.
				if (version === state.sourceVersion) {
					await this.updateSource(state);
				}
				state.lastSave = { session, epoch, revision: state.revision, content: this.normalizedContent(state) };
			});
		} finally {
			cancellation.dispose();
		}
	}

	private async initialize(state: DocumentState, session: EditorSession): Promise<void> {
		if (session.initializing || session.initialized || session.stopped) {
			return;
		}
		session.initializing = true;
		const epoch = session.epoch;
		try {
			const result = await session.bus.request('editor:document:setContent', {
				reason: 'init',
				fileUri: state.document.uri.toString(),
				content: state.content,
				isDirty: this.isDirty(state),
				readonly: state.readonly,
				saveAcknowledgements: true,
				nativeUndoRedo: true,
			});
			this.requireSession(state, session, epoch);
			state.revision = result.revision;
			session.initialized = true;
			session.whenReady.resolve();
			session.bus.emit('host:theme:changed', { theme: themeName() });
		} catch (error) {
			if (session.epoch === epoch) {
				session.whenReady.reject(error);
			}
			throw error;
		}
	}

	private changed(state: DocumentState, snapshot: ContentSnapshot): void {
		if (state.disposed || snapshot.revision <= state.revision) {
			return;
		}
		state.content = snapshot.content;
		state.revision = snapshot.revision;
		this.notifyDirty(state);
		this.syncSource(state);
	}
	private syncSource(state: DocumentState): void {
		const version = state.sourceVersion;
		void this.enqueue(state, async () => {
			// A newer source edit already queued its own update to the canvas.
			if (version === state.sourceVersion) {
				await this.updateSource(state);
			}
		}).catch(report);
	}
	private async updateSource(state: DocumentState): Promise<void> {
		const source = state.document;
		if (source.isClosed || state.readonly) {
			return;
		}
		const previous = source.getText();
		const content = this.normalizedContent(state);
		if (previous === content) {
			return;
		}
		// Preserve the cursor and selections outside the actual changed text.
		let start = 0;
		while (start < previous.length && start < content.length && previous[start] === content[start]) {
			start++;
		}
		let oldEnd = previous.length;
		let newEnd = content.length;
		while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === content[newEnd - 1]) {
			oldEnd--;
			newEnd--;
		}
		const edit = new vscode.WorkspaceEdit();
		edit.replace(source.uri, new vscode.Range(source.positionAt(start), source.positionAt(oldEnd)), content.slice(start, newEnd));
		state.mirroredContent = content;
		try {
			if (!(await vscode.workspace.applyEdit(edit))) {
				throw new BridgeError('IO_ERROR', 'Could not synchronize the source editor');
			}
		} finally {
			state.mirroredContent = undefined;
		}
	}
	private normalizedContent(state: DocumentState): string {
		return state.content.replace(/\r\n|\r|\n/g, state.document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n');
	}
	private async readSavedContent(document: vscode.TextDocument, encoding = document.encoding): Promise<string> {
		return vscode.workspace.decode(await vscode.workspace.fs.readFile(document.uri), { encoding });
	}
	private isDirty(state: DocumentState): boolean {
		const content = state.document.getText();
		return state.document.isDirty || this.normalizedContent(state) !== content || (state.savedContent !== undefined && state.savedContent !== content);
	}
	private notifyDirty(state: DocumentState): void {
		if (state.session?.initialized) {
			state.session.bus.emit('host:document:dirtyChanged', { revision: state.revision, isDirty: this.isDirty(state) });
		}
	}
	private async snapshot(state: DocumentState, token: vscode.CancellationToken) {
		checkCancellation(token);
		const session = this.session(state);
		const epoch = session.epoch;
		await session.whenReady.promise;
		this.requireSession(state, session, epoch);
		const snapshot = await this.request(session.bus, 'editor:document:getContent', null, token);
		this.requireSession(state, session, epoch);
		if (snapshot.revision >= state.revision) {
			state.content = snapshot.content;
			state.revision = snapshot.revision;
		}
		return { session, epoch, snapshot };
	}
	private async request<R extends keyof KaotoRequests>(
		bus: IEventBus,
		name: R,
		payload: KaotoRequests[R],
		token: vscode.CancellationToken,
	): Promise<KaotoResponses[R]> {
		checkCancellation(token);
		const abort = new AbortController();
		const subscription = token.onCancellationRequested(() => abort.abort());
		try {
			const response = await bus.request(name, payload, { signal: abort.signal });
			checkCancellation(token);
			return response;
		} finally {
			subscription.dispose();
		}
	}
	private enqueue<T>(state: DocumentState, operation: () => Promise<T>): Promise<T> {
		const result = state.queue.then(() => {
			if (state.disposed) {
				throw new BridgeError('DISPOSED', 'The document has been disposed');
			}
			return operation();
		});
		state.queue = result.catch(() => {});
		return result;
	}
	private session(state: DocumentState): EditorSession {
		if (!state.session || state.session.stopped) {
			throw new BridgeError('NOT_READY', 'The editor is not connected');
		}
		return state.session;
	}
	private requireSession(state: DocumentState, session: EditorSession, epoch: number): void {
		if (state.disposed || state.session !== session || session.stopped || session.epoch !== epoch) {
			throw new BridgeError('DISPOSED', 'The editor session changed');
		}
	}

	private bindServices(state: DocumentState, session: EditorSession, listeners: (vscode.Disposable | Unsubscribe)[]): void {
		const host = session.bus;
		const services = state.services;
		const on = <R extends keyof KaotoRequests>(name: R, handler: (payload: KaotoRequests[R]) => Promise<KaotoResponses[R]>) => {
			listeners.push(
				host.onRequest(name, async (payload, { signal }) => {
					if (signal.aborted) {
						throw new BridgeError('CANCELLED', 'The request was cancelled');
					}
					try {
						const response = await handler(payload);
						if (signal.aborted) {
							throw new BridgeError('CANCELLED', 'The request was cancelled');
						}
						return response;
					} catch (error) {
						if (error instanceof BridgeError) {
							throw error;
						}
						throw new BridgeError('IO_ERROR', error instanceof Error ? error.message : 'Host operation failed');
					}
				}),
			);
		};
		on('editor:settings:get', () => this.settings(state, session));
		on('host:undoRedo:apply', ({ command, revision }) => this.applyDocumentHistory(state, command, revision));
		on('editor:metadata:get', async ({ key }) => ({ value: (await services.getMetadata<JsonValue>(key)) ?? null }));
		on('editor:metadata:set', async ({ key, value }) => {
			await services.setMetadata(key, value);
			return null;
		});
		on('editor:resource:getContent', async ({ path }) => ({ content: (await services.getResourceContent(path)) ?? null }));
		on('editor:resource:save', async ({ path, content }) => {
			await services.saveResourceContent(path, content);
			return null;
		});
		on('editor:resource:exists', async ({ path }) => ({ exists: await services.isResourceExist(path) }));
		on('editor:resource:delete', async ({ path }) => ({ success: await services.deleteResource(path) }));
		on('editor:resource:getByType', async ({ fileType }) => ({ resources: await services.getResourcesContentByType(fileType as FileTypes) }));
		on('host:ui:pickFile', async ({ include, exclude, options }) => ({
			selection: (await services.askUserForFileSelection(include, exclude, options ? { ...options } : undefined)) ?? null,
		}));
		on('editor:suggestions:get', async ({ topic, word, context }) => ({
			suggestions: await services.getSuggestions(topic, word, context as SuggestionRequestContext),
		}));
		on('editor:maven:getRuntimeInfo', async () => ({ runtimeInfo: (await services.getRuntimeInfoFromMavenContext()) ?? null }));
	}
	private async settings(state: DocumentState, session: EditorSession): Promise<SettingsSnapshot> {
		const result = session.settingsQueue.then(async () => {
			const settings = await state.services.getVSCodeKaotoSettings();
			return {
				settings: { ...settings, catalogUrl: settings.catalogUrl || `${this.resourcesPrefix(session.panel.webview)}/camel-catalog/index.json` },
				settingsVersion: ++session.settingsVersion,
			};
		});
		session.settingsQueue = result.catch(() => {});
		return result;
	}
	private pushSettings(): void {
		for (const state of this.documents.values()) {
			const session = state.session;
			if (!session || session.stopped || !session.wireId) {
				continue;
			}
			const epoch = session.epoch;
			void this.settings(state, session)
				.then((snapshot) => {
					if (!session.stopped && session.epoch === epoch) {
						session.bus.emit('editor:settings:updated', snapshot);
					}
				})
				.catch(report);
		}
	}
	private resourcesPrefix(webview: vscode.Webview): string {
		return webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist/webview/editors/kaoto')).toString();
	}
	private html(uri: vscode.Uri, webview: vscode.Webview): string {
		const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
		const script = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist/webview/KaotoEditorEnvelopeApp.js')).toString();
		const filename = uri.path.slice(uri.path.lastIndexOf('/') + 1);
		const extension = filename.slice(filename.indexOf('.') + 1);
		// Shared Carbon styles reserve space for the standalone header; embedded editors need the full viewport.
		return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data: blob: https:; font-src ${webview.cspSource} data:; connect-src ${webview.cspSource} https: http: data: blob:; worker-src ${webview.cspSource} blob:;">
<style nonce="${nonce}">html,body,#envelope-app{margin:0;border:0;padding:0;height:100%;}html body{block-size:100%;overflow:hidden;}</style></head><body>
<div id="envelope-app" data-file-extension="${escapeAttribute(extension)}" data-resources-path-prefix="${escapeAttribute(this.resourcesPrefix(webview))}"></div>
<script nonce="${nonce}" src="${escapeAttribute(script)}"></script></body></html>`;
	}
	private disposeDocument(state: DocumentState): void {
		if (state.disposed) {
			return;
		}
		state.disposed = true;
		state.panelDisposal?.dispose();
		state.session?.dispose();
		state.services.dispose();
		state.diagnostics.forEach((uri) => this.diagnostics.delete(vscode.Uri.parse(uri)));
		this.documents.delete(state.document.uri.toString());
	}
	dispose(): void {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		this.listeners.forEach((listener) => listener.dispose());
		this.documents.forEach((state) => this.disposeDocument(state));
		this.diagnostics.dispose();
	}
}

export function registerKaotoEditorProvider(context: vscode.ExtensionContext, factory?: KaotoHostServicesFactory): KaotoEditorProvider {
	const provider = new KaotoEditorProvider(context, factory);
	context.subscriptions.push(
		provider,
		vscode.window.registerCustomEditorProvider(KAOTO_EDITOR_VIEW_TYPE, provider, {
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false,
		}),
	);
	return provider;
}
function checkCancellation(token: vscode.CancellationToken): void {
	if (token.isCancellationRequested) {
		throw new BridgeError('CANCELLED', 'The operation was cancelled');
	}
}
function readiness() {
	let resolve!: () => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	void promise.catch(() => {});
	return { promise, resolve, reject };
}
function report(error: unknown): void {
	KaotoOutputChannel.logError('Kaoto editor operation failed', error);
}
function escapeAttribute(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
function themeName(): KaotoEventsTheme {
	switch (vscode.window.activeColorTheme.kind) {
		case vscode.ColorThemeKind.Dark:
			return 'dark';
		case vscode.ColorThemeKind.HighContrast:
			return 'high-contrast';
		case vscode.ColorThemeKind.HighContrastLight:
			return 'high-contrast-light';
		default:
			return 'light';
	}
}
type KaotoEventsTheme = 'light' | 'dark' | 'high-contrast' | 'high-contrast-light';
