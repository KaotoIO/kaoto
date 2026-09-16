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

import { deepStrictEqual, equal, ok, rejects } from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { createEventBus, createPostMessageBridge, type ContentSnapshot, type KaotoEvents, type SetContentRequest } from '@kaoto/kaoto/host-bridge';
import { KaotoEditorProvider } from '../../extension/KaotoEditorProvider';

suite('Native Kaoto text document provider', () => {
	let caseNumber = 0;
	let root: vscode.Uri;
	let diskRoot: vscode.Uri;
	let fileSystem: vscode.Disposable;
	let fileChanges: vscode.EventEmitter<vscode.FileChangeEvent[]>;
	let provider: KaotoEditorProvider;
	let document: vscode.TextDocument;
	let fixture: ReturnType<typeof editorFixture>;
	let cancellation: vscode.CancellationTokenSource;
	const toDisk = (uri: vscode.Uri) => vscode.Uri.joinPath(diskRoot, uri.path);
	const originalWrite = (uri: vscode.Uri, bytes: Uint8Array) => vscode.workspace.fs.writeFile(toDisk(uri), bytes);
	let writeFile = originalWrite;
	const subscriptions: vscode.Disposable[] = [];

	setup(async () => {
		diskRoot = vscode.Uri.file(await mkdtemp(path.join(os.tmpdir(), 'kaoto-provider-')));
		root = vscode.Uri.parse(`kaoto-provider-test://workspace-${++caseNumber}/`);
		writeFile = originalWrite;
		fileChanges = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
		fileSystem = vscode.workspace.registerFileSystemProvider(
			root.scheme,
			{
				onDidChangeFile: fileChanges.event,
				watch: () => ({ dispose() {} }),
				stat: (uri) => vscode.workspace.fs.stat(toDisk(uri)),
				readDirectory: (uri) => vscode.workspace.fs.readDirectory(toDisk(uri)),
				readFile: (uri) => vscode.workspace.fs.readFile(toDisk(uri)),
				writeFile: (uri, bytes) => writeFile(uri, bytes),
				createDirectory: (uri) => vscode.workspace.fs.createDirectory(toDisk(uri)),
				delete: (uri, options) => vscode.workspace.fs.delete(toDisk(uri), options),
				rename: (from, to, options) => vscode.workspace.fs.rename(toDisk(from), toDisk(to), options),
			},
			{ isCaseSensitive: true },
		);
		await originalWrite(vscode.Uri.joinPath(root, 'route.camel.yaml'), new TextEncoder().encode('original'));
		provider = new KaotoEditorProvider({ extensionUri: vscode.Uri.file(process.cwd()) });
		cancellation = new vscode.CancellationTokenSource();
	});
	teardown(async () => {
		writeFile = originalWrite;
		subscriptions.splice(0).forEach((item) => item.dispose());
		fixture?.dispose();
		provider.dispose();
		cancellation.dispose();
		for (const source of vscode.workspace.textDocuments) {
			if (source.uri.authority === root.authority && source.isDirty) {
				await source.save();
			}
		}
		for (const group of vscode.window.tabGroups.all) {
			for (const tab of group.tabs) {
				if (tab.input instanceof vscode.TabInputText && tab.input.uri.authority === root.authority) {
					await vscode.workspace.save(tab.input.uri);
					await vscode.window.tabGroups.close(tab);
				}
			}
		}
		fileSystem.dispose();
		fileChanges.dispose();
		await vscode.workspace.fs.delete(diskRoot, { recursive: true });
	});

	async function open() {
		document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, 'route.camel.yaml'));
		fixture = editorFixture();
		await provider.resolveCustomTextEditor(document, fixture.panel, cancellation.token);
		await fixture.connect();
	}
	async function editSource(content: string, source = document) {
		const edit = new vscode.WorkspaceEdit();
		edit.replace(source.uri, new vscode.Range(source.positionAt(0), source.positionAt(source.getText().length)), content);
		ok(await vscode.workspace.applyEdit(edit));
	}

	test('initializes the canvas with the current unsaved text document', async () => {
		document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, 'route.camel.yaml'));
		await editSource('already edited');
		await open();
		equal(fixture.content.content, 'already edited');
		equal(fixture.requests[0].reason, 'init');
		ok(fixture.requests[0].reason === 'init' && fixture.requests[0].isDirty);
		equal(await read(document.uri), 'original');
	});

	test('initializes an empty document exactly once after ready', async () => {
		await originalWrite(vscode.Uri.joinPath(root, 'route.camel.yaml'), new Uint8Array());
		await open();
		equal(fixture.requests[0].content, '');
		fixture.bus.emit('editor:ready', null);
		await fixture.flush();
		equal(fixture.requests.length, 1);
		equal(provider.activeDocumentUri?.toString(), document.uri.toString());
	});

	test('retains a source edit made before the webview handshake', async () => {
		document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, 'route.camel.yaml'));
		fixture = editorFixture();
		await provider.resolveCustomTextEditor(document, fixture.panel, cancellation.token);
		await editSource('before ready');
		await fixture.connect();
		await eventually(() => fixture.content.content === 'before ready');
	});

	test('initializes cleanly when the source was saved before the webview handshake', async () => {
		document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(root, 'route.camel.yaml'));
		fixture = editorFixture();
		await provider.resolveCustomTextEditor(document, fixture.panel, cancellation.token);
		await editSource('saved before ready');
		ok(await document.save());
		await fixture.connect();
		await eventually(() => fixture.content.content === 'saved before ready' && fixture.dirty.at(-1)?.isDirty === false);
		deepStrictEqual(fixture.saved, []);
	});

	test('canvas edits dirty the shared source without saving or echoing them', async () => {
		await open();
		fixture.edit('step with an ID', 1);
		await eventually(() => document.getText() === 'step with an ID' && document.isDirty);
		equal(await read(document.uri), 'original');
		equal(fixture.requests.length, 1);
		await editSource('source edit');
		await eventually(() => fixture.content.content === 'source edit');
		fixture.edit('another canvas edit', fixture.content.revision + 1);
		await eventually(() => document.getText() === 'another canvas edit');
		equal(fixture.requests.length, 2, 'only the actual source edit should return to the canvas');
	});

	for (const origin of ['canvas', 'source'] as const) {
		test(`undoing all ${origin} changes clears the shared dirty state without saving`, async () => {
			await open();
			await vscode.window.showTextDocument(document);
			const tab = vscode.window.tabGroups.activeTabGroup.activeTab!;
			let writes = 0;
			writeFile = async (uri, bytes) => {
				writes++;
				await originalWrite(uri, bytes);
			};
			if (origin === 'canvas') {
				fixture.edit('edited', 1);
			} else {
				ok(await vscode.window.activeTextEditor!.edit((builder) => builder.replace(new vscode.Range(0, 0, 0, 8), 'edited')));
			}
			await eventually(() => document.isDirty && fixture.content.content === 'edited');
			if (origin === 'canvas') {
				await fixture.bus.request('host:undoRedo:apply', { command: 'undo', revision: fixture.content.revision });
			} else {
				await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
				await vscode.commands.executeCommand('undo');
			}
			await eventually(
				() => document.getText() === 'original' && !tab.isDirty && fixture.dirty.at(-1)?.isDirty === false,
				() => JSON.stringify({ content: document.getText(), documentDirty: document.isDirty, tabDirty: tab.isDirty, canvas: fixture.dirty.at(-1) }),
			);
			equal(writes, 0, 'Undo must not save the file');
			deepStrictEqual(fixture.saved, []);
			if (origin === 'canvas') {
				await fixture.bus.request('host:undoRedo:apply', { command: 'redo', revision: fixture.content.revision });
			} else {
				await vscode.commands.executeCommand('redo');
			}
			await eventually(() => document.getText() === 'edited' && tab.isDirty && fixture.dirty.at(-1)?.isDirty === true);
		});
	}

	test('rejects a history request after another document becomes active', async () => {
		await open();
		fixture.edit('edited', 1);
		await eventually(() => document.getText() === 'edited');
		const otherUri = vscode.Uri.joinPath(root, 'other.camel.yaml');
		await originalWrite(otherUri, new TextEncoder().encode('other original'));
		const other = await vscode.workspace.openTextDocument(otherUri);
		await vscode.window.showTextDocument(other);
		await editSource('other edited', other);
		await rejects(fixture.bus.request('host:undoRedo:apply', { command: 'undo', revision: 1 }), { code: 'NOT_READY' });
		equal(other.getText(), 'other edited');
		equal(document.getText(), 'edited');
	});

	test('keeps native history across save and returns to the saved position on Redo', async () => {
		await open();
		await vscode.window.showTextDocument(document);
		const tab = vscode.window.tabGroups.activeTabGroup.activeTab!;
		fixture.edit('saved edit', 1);
		await eventually(() => document.getText() === 'saved edit');
		ok(await document.save());
		await eventually(() => fixture.saved.length === 1 && !tab.isDirty);
		await fixture.bus.request('host:undoRedo:apply', { command: 'undo', revision: fixture.content.revision });
		await eventually(() => document.getText() === 'original' && tab.isDirty && fixture.dirty.at(-1)?.isDirty === true);
		equal(await read(document.uri), 'saved edit');
		await fixture.bus.request('host:undoRedo:apply', { command: 'redo', revision: fixture.content.revision });
		await eventually(() => document.getText() === 'saved edit' && !tab.isDirty && fixture.dirty.at(-1)?.isDirty === false);
		equal(fixture.saved.length, 1, 'History navigation must not save again');
	});

	test('undoes interleaved canvas and source edits in native order', async () => {
		await open();
		await vscode.window.showTextDocument(document);
		fixture.edit('canvas edit', 1);
		await eventually(() => document.getText() === 'canvas edit');
		await editSource('source edit');
		await eventually(() => fixture.content.content === 'source edit');
		await fixture.bus.request('host:undoRedo:apply', { command: 'undo', revision: fixture.content.revision });
		await eventually(() => document.getText() === 'canvas edit' && fixture.content.content === 'canvas edit');
		await fixture.bus.request('host:undoRedo:apply', { command: 'undo', revision: fixture.content.revision });
		await eventually(() => document.getText() === 'original' && !document.isDirty && fixture.dirty.at(-1)?.isDirty === false);
	});

	test('rejects a history request from an outdated canvas revision', async () => {
		await open();
		await vscode.window.showTextDocument(document);
		fixture.edit('edited', 1);
		await eventually(() => document.getText() === 'edited');
		await rejects(fixture.bus.request('host:undoRedo:apply', { command: 'undo', revision: 0 }), { code: 'NOT_READY' });
		equal(document.getText(), 'edited');
	});

	test('preserves source line endings and changes only the edited text', async () => {
		await originalWrite(vscode.Uri.joinPath(root, 'route.camel.yaml'), new TextEncoder().encode('id: old\r\nnext: unchanged\r\n'));
		await open();
		const edits: vscode.TextDocumentContentChangeEvent[] = [];
		subscriptions.push(
			vscode.workspace.onDidChangeTextDocument((event) => {
				if (event.document === document) {
					edits.push(...event.contentChanges);
				}
			}),
		);
		fixture.edit('id: changed\nnext: unchanged\n', 1);
		await eventually(() => document.getText() === 'id: changed\r\nnext: unchanged\r\n');
		equal(fixture.requests.length, 1);
		equal(edits.length, 1);
		ok(new vscode.Range(0, 4, 0, 7).contains(edits[0].range));
		ok(await document.save());
		await eventually(() => fixture.saved.length === 1);
		deepStrictEqual(fixture.saved[0], { revision: 1, isDirty: false });
	});

	test('acknowledges a save using the native document encoding', async () => {
		const uri = vscode.Uri.joinPath(root, 'route.camel.yaml');
		await originalWrite(uri, await vscode.workspace.encode('id: ursprünglicher-wert', { encoding: 'utf16le' }));
		await open();
		equal(document.encoding, 'utf16le');
		fixture.edit('id: geändert', 1);
		await eventually(() => document.isDirty);
		ok(await document.save());
		await eventually(() => fixture.saved.length === 1);
		equal(await vscode.workspace.decode(await vscode.workspace.fs.readFile(uri), { encoding: document.encoding }), 'id: geändert');
		deepStrictEqual(fixture.saved[0], { revision: 1, isDirty: false });
	});

	for (const origin of ['canvas', 'source'] as const) {
		test(`saving a ${origin} edit clears the shared dirty state after persistence`, async () => {
			await open();
			if (origin === 'canvas') {
				fixture.edit('edited', 1);
			} else {
				await editSource('edited');
			}
			await eventually(() => document.isDirty && document.getText() === 'edited' && fixture.content.content === 'edited');
			ok(await document.save());
			await eventually(() => fixture.saved.length === 1);
			equal(await read(document.uri), 'edited');
			ok(!document.isDirty);
			deepStrictEqual(fixture.saved[0], { revision: 1, isDirty: false });
			deepStrictEqual(fixture.dirty.at(-1), { revision: 1, isDirty: false });
		});
	}

	test('flushes a pending canvas snapshot before a native save', async () => {
		await open();
		await editSource('first edit');
		await eventually(() => fixture.content.content === 'first edit');
		fixture.getSnapshot = () => ({ content: 'latest canvas edit', revision: 2 });
		ok(await document.save());
		equal(await read(document.uri), 'latest canvas edit');
		equal(document.getText(), 'latest canvas edit');
		await eventually(() => fixture.saved.length === 1);
		deepStrictEqual(fixture.saved[0], { revision: 2, isDirty: false });
	});

	for (const origin of ['canvas', 'source'] as const) {
		test(`a newer ${origin} edit remains dirty during a slow native save`, async () => {
			await open();
			await vscode.window.showTextDocument(document);
			const tab = vscode.window.tabGroups.activeTabGroup.activeTab!;
			fixture.edit('A', 4);
			await eventually(() => document.getText() === 'A' && document.isDirty);
			const started = deferred<void>();
			const finish = deferred<void>();
			writeFile = async (uri, bytes) => {
				started.resolve();
				await finish.promise;
				await originalWrite(uri, bytes);
			};
			const saving = document.save();
			try {
				await started.promise;
				equal(fixture.saved.length, 0);
				if (origin === 'canvas') {
					fixture.edit('B', 5);
				} else {
					await editSource('B');
				}
				await eventually(() => document.getText() === 'B' && fixture.content.content === 'B');
				finish.resolve();
				await saving;
				await eventually(() => fixture.saved.length === 1);
				equal(await read(document.uri), 'A');
				ok(tab.isDirty);
				deepStrictEqual(fixture.saved[0], { revision: 4, isDirty: true });
			} finally {
				finish.resolve();
				await saving;
			}
		});
	}

	test('failed writes leave both representations dirty and a later save can succeed', async () => {
		await open();
		fixture.edit('edited', 1);
		await eventually(() => document.isDirty);
		writeFile = async () => {
			throw vscode.FileSystemError.NoPermissions();
		};
		equal(await document.save(), false);
		deepStrictEqual(fixture.saved, []);
		ok(document.isDirty);
		ok(fixture.dirty.at(-1)?.isDirty);
		equal(await read(document.uri), 'original');
		writeFile = originalWrite;
		ok(await document.save());
		await eventually(() => fixture.saved.length === 1);
		ok(!document.isDirty);
	});

	test('native save participants update the canvas with the content actually saved', async () => {
		await open();
		fixture.edit('before formatting', 1);
		await eventually(() => document.isDirty);
		subscriptions.push(
			vscode.workspace.onWillSaveTextDocument((event) => {
				if (event.document === document) {
					event.waitUntil(Promise.resolve([vscode.TextEdit.replace(new vscode.Range(0, 0, 0, document.getText().length), 'formatted')]));
				}
			}),
		);
		ok(await document.save());
		await eventually(() => fixture.content.content === 'formatted' && fixture.saved.length === 1);
		equal(await read(document.uri), 'formatted');
		ok(!document.isDirty);
		equal(fixture.saved[0].revision, fixture.content.revision);
		equal(fixture.saved[0].isDirty, false);
	});

	test('external disk updates refresh a clean canvas without making it dirty', async () => {
		await open();
		await originalWrite(document.uri, new TextEncoder().encode('external edit'));
		fileChanges.fire([{ type: vscode.FileChangeType.Changed, uri: document.uri }]);
		await eventually(() => document.getText() === 'external edit' && fixture.content.content === 'external edit');
		ok(!document.isDirty);
		equal(fixture.dirty.at(-1)?.isDirty, false);
	});

	test('a newer source edit wins over a pending canvas snapshot', async () => {
		await open();
		fixture.edit('A', 1);
		await eventually(() => document.isDirty);
		const started = deferred<void>();
		const finish = deferred<void>();
		fixture.getSnapshot = async () => {
			const snapshot = { ...fixture.content };
			started.resolve();
			await finish.promise;
			return snapshot;
		};
		const saving = document.save();
		try {
			await started.promise;
			await editSource('newer source edit');
			finish.resolve();
			await saving;
			await eventually(() => fixture.content.content === 'newer source edit');
			equal(document.getText(), 'newer source edit');
		} finally {
			finish.resolve();
			await saving;
		}
	});

	test('correlates the persisted revision when a canvas edit supersedes the save snapshot', async () => {
		await open();
		fixture.edit('A', 1);
		await eventually(() => document.isDirty);
		fixture.getSnapshot = async () => {
			const snapshot = { ...fixture.content };
			fixture.edit('B', 2);
			await fixture.flush();
			return snapshot;
		};
		const started = deferred<void>();
		const finish = deferred<void>();
		writeFile = async (uri, bytes) => {
			started.resolve();
			await finish.promise;
			await originalWrite(uri, bytes);
		};
		const saving = document.save();
		try {
			await started.promise;
			fixture.edit('C', 3);
			await eventually(() => document.getText() === 'C');
			finish.resolve();
			await saving;
			await eventually(() => fixture.saved.length === 1);
			equal(await read(document.uri), 'B');
			deepStrictEqual(fixture.saved[0], { revision: 2, isDirty: true });
		} finally {
			finish.resolve();
			await saving;
		}
	});

	test('closing the canvas keeps the unsaved source available for reopening', async () => {
		await open();
		fixture.edit('unsaved content', 1);
		await eventually(() => document.getText() === 'unsaved content' && document.isDirty);
		fixture.dispose();
		await editSource('edited with canvas closed');
		await open();
		equal(fixture.content.content, 'edited with canvas closed');
		ok(document.isDirty);
		ok(fixture.requests[0].reason === 'init' && fixture.requests[0].isDirty);
	});

	test('closing the canvas flushes edits queued behind a pending save snapshot', async () => {
		await open();
		fixture.edit('A', 1);
		await eventually(() => document.isDirty);
		const started = deferred<void>();
		const finish = deferred<void>();
		fixture.getSnapshot = async () => {
			started.resolve();
			await finish.promise;
			return { content: 'A', revision: 1 };
		};
		const saving = document.save();
		try {
			await started.promise;
			fixture.edit('B', 2);
			await fixture.flush();
			fixture.dispose();
			await open();
			equal(document.getText(), 'B');
			equal(fixture.content.content, 'B');
		} finally {
			finish.resolve();
			await saving;
		}
	});

	test('a fresh webview session does not receive an older save acknowledgement', async () => {
		await open();
		fixture.edit('A', 1);
		await eventually(() => document.isDirty);
		const started = deferred<void>();
		const finish = deferred<void>();
		writeFile = async (uri, bytes) => {
			started.resolve();
			await finish.promise;
			await originalWrite(uri, bytes);
		};
		const saving = document.save();
		try {
			await started.promise;
			await fixture.reload();
			finish.resolve();
			await saving;
			await eventually(() => fixture.dirty.at(-1)?.isDirty === false);
			deepStrictEqual(fixture.saved, []);
		} finally {
			finish.resolve();
			await saving;
		}
	});

	test('drops unrelated and stale messages without closing the live document session', async () => {
		await open();
		fixture.receive({ unrelated: 'browser message' });
		fixture.receive({ protocol: 'kaoto-host-bridge', version: 1, kind: 'event', sessionId: 'retired', name: 'editor:ready', payload: null });
		fixture.edit('still connected', 1);
		await eventually(() => document.getText() === 'still connected');
	});

	test('closing a disconnected canvas releases its document for reopening', async () => {
		await open();
		fixture.panel.webview.postMessage = async () => false;
		await editSource('kept after disconnect');
		await eventually(() => provider.activeDocumentUri === undefined);
		fixture.dispose();
		await open();
		equal(fixture.content.content, 'kept after disconnect');
		ok(document.isDirty);
	});

	test('installs host services before loading HTML and uses the existing mount and assets', async () => {
		await open();
		const settings = await fixture.bus.request('editor:settings:get', null);
		ok(settings.settings.catalogUrl?.includes('/dist/webview/editors/kaoto/camel-catalog/index.json'));
		ok(fixture.panel.webview.html.includes('id="envelope-app"'));
		ok(fixture.panel.webview.html.includes('KaotoEditorEnvelopeApp.js'));
		await fixture.bus.request('editor:resource:save', { path: 'schema.xsd', content: 'context' });
		equal(await read(vscode.Uri.joinPath(root, 'schema.xsd')), 'context');
	});

	test('different documents have independent dirty states and saves', async () => {
		await open();
		const otherUri = vscode.Uri.joinPath(root, 'other.camel.yaml');
		await originalWrite(otherUri, new TextEncoder().encode('other original'));
		const other = await vscode.workspace.openTextDocument(otherUri);
		const otherFixture = editorFixture();
		try {
			await provider.resolveCustomTextEditor(other, otherFixture.panel, cancellation.token);
			await otherFixture.connect();
			fixture.edit('first edit', 1);
			otherFixture.edit('second edit', 1);
			await eventually(() => document.isDirty && other.isDirty);
			ok(await document.save());
			ok(!document.isDirty);
			ok(other.isDirty);
			equal(await read(otherUri), 'other original');
			deepStrictEqual(otherFixture.saved, []);
		} finally {
			otherFixture.dispose();
		}
	});

	test('rejects a second graphical panel for the same document', async () => {
		await open();
		const other = editorFixture();
		try {
			await rejects(provider.resolveCustomTextEditor(document, other.panel, cancellation.token), { code: 'NOT_READY' });
		} finally {
			other.dispose();
		}
	});
});

function editorFixture() {
	const incoming = new vscode.EventEmitter<unknown>();
	const closed = new vscode.EventEmitter<void>();
	const viewState = new vscode.EventEmitter<vscode.WebviewPanelOnDidChangeViewStateEvent>();
	let receive: ((message: unknown) => void) | undefined;
	let init = deferred<void>();
	const value = {
		bus: createEventBus({ role: 'editor', onError: () => {} }),
		bridge: undefined as ReturnType<typeof createPostMessageBridge> | undefined,
		requests: [] as SetContentRequest[],
		saved: [] as KaotoEvents['host:document:saved'][],
		dirty: [] as KaotoEvents['host:document:dirtyChanged'][],
		content: { content: '', revision: 0 } as ContentSnapshot,
		getSnapshot: (): ContentSnapshot | Promise<ContentSnapshot> => ({ ...value.content }),
		receive: (message: unknown) => incoming.fire(message),
		panel: {
			active: true,
			onDidDispose: closed.event,
			onDidChangeViewState: viewState.event,
			webview: {
				html: '',
				options: {},
				cspSource: 'https://kaoto.test',
				asWebviewUri: (uri: vscode.Uri) => uri.with({ scheme: 'https', authority: 'kaoto.test' }),
				onDidReceiveMessage: incoming.event,
				postMessage: async (message: unknown) => {
					queueMicrotask(() => receive?.(message));
					return true;
				},
			},
		} as unknown as vscode.WebviewPanel,
		connect: async () => {
			value.bus.onRequest('editor:document:setContent', (request) => {
				value.requests.push(request);
				value.content = { content: request.content, revision: request.reason === 'init' ? 0 : value.content.revision + 1 };
				if (request.reason === 'init') {
					init.resolve();
				}
				return { applied: true, revision: value.content.revision };
			});
			value.bus.onRequest('editor:document:getContent', () => value.getSnapshot());
			value.bus.on('host:document:saved', (event) => value.saved.push(event));
			value.bus.on('host:document:dirtyChanged', (event) => value.dirty.push(event));
			value.bridge = createPostMessageBridge({
				bus: value.bus,
				transport: {
					send: (message) => {
						queueMicrotask(() => incoming.fire(message));
					},
					onMessage: (listener) => {
						receive = listener;
						return () => {
							receive = undefined;
						};
					},
					dispose: () => {},
				},
			});
			await value.bridge.connect();
			await value.bus.request('editor:settings:get', null);
			value.bus.emit('editor:ready', null);
			await init.promise;
			await value.flush();
		},
		edit: (content: string, revision: number) => {
			value.content = { content, revision };
			value.bus.emit('editor:document:changed', value.content);
		},
		reload: async () => {
			value.bus.dispose();
			init = deferred<void>();
			value.bus = createEventBus({ role: 'editor', onError: () => {} });
			await value.connect();
		},
		flush: () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
		dispose: () => {
			closed.fire();
			value.bus.dispose();
			incoming.dispose();
			closed.dispose();
			viewState.dispose();
		},
	};
	return value;
}
function deferred<T>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}
async function read(uri: vscode.Uri) {
	return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
}
async function eventually(condition: () => boolean, describe = () => 'Document content did not synchronize'): Promise<void> {
	const deadline = Date.now() + 5_000;
	while (!condition() && Date.now() < deadline) {
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	ok(condition(), describe());
}
