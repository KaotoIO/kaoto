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
import { StepUpdateAction, CatalogKind } from '@kaoto/kaoto/models';
import { KaotoHostServices } from '../../services/KaotoHostServices';
import { COMMAND_OPEN_WITH_KAOTO, KAOTO_EDITOR_VIEW_TYPE } from '../../constants';

/** Runs in the actual browser extension host with the runner's virtual filesystem. */
export async function run(): Promise<void> {
	const files = vscode.workspace.getConfiguration('files');
	const autoSave = files.inspect('autoSave')?.workspaceValue;
	await files.update('autoSave', 'off', vscode.ConfigurationTarget.Workspace);
	try {
		await services();
		await editorLifecycle();
		await slowSave();
	} finally {
		await files.update('autoSave', autoSave, vscode.ConfigurationTarget.Workspace);
	}
}

function assert(value: unknown, message: string): asserts value {
	if (!value) {
		throw new Error(message);
	}
}

async function services(): Promise<void> {
	assert(typeof process === 'undefined', 'Worker tests must run without Node process');
	assert(vscode.env.uiKind === vscode.UIKind.Web, 'Probe must run in browser');
	const workspace = vscode.workspace.workspaceFolders![0].uri;
	assert(workspace.scheme !== 'file', 'Probe must use a virtual workspace');
	const owned = vscode.Uri.joinPath(workspace, `kdp007-services-${Date.now()}`);
	let documentUri = vscode.Uri.joinPath(owned, 'src/main/resources/camel/route.camel.yaml');
	const service = new KaotoHostServices(() => documentUri);
	const unsupported = async (request: () => Promise<unknown>) => {
		try {
			await request();
		} catch (error) {
			assert((error as { code?: string }).code === 'UNSUPPORTED_REQUEST', `Expected unsupported, got ${(error as { code?: string }).code}`);
			return;
		}
		throw new Error('Unsupported operation unexpectedly succeeded');
	};
	try {
		await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(documentUri, '..'));
		await write(documentUri, '- route: {}');
		await write(vscode.Uri.joinPath(owned, '.kaoto'), '{}');
		await service.setMetadata('schema', { filePath: ['schemas\\test.xsd'] });
		assert(
			((await service.getMetadata('schema')) as { filePath: string[] }).filePath[0] === 'schemas/test.xsd',
			'Metadata must preserve URI and normalize paths',
		);
		await service.saveResourceContent('schema.xsd', 'Grüße');
		assert((await service.getResourceContent('schema.xsd')) === 'Grüße', 'Resource read must retain UTF-8');
		assert((await read(vscode.Uri.joinPath(owned, 'src/main/resources/schema.xsd'))) === 'Grüße', 'Resource must use Maven classpath');
		await write(vscode.Uri.joinPath(owned, 'fallback.xsd'), 'fallback');
		assert((await service.getResourceContent('fallback.xsd')) === 'fallback', 'Metadata resource fallback must work');
		await write(vscode.Uri.joinPath(owned, 'src/main/resources/application.properties'), 'camel.name=Grüße');
		const suggestions = await service.getSuggestions('properties', 'camel', { propertyName: 'uri', inputValue: '' });
		assert(suggestions.length === 1 && suggestions[0].description === 'Grüße', 'Properties must work without Buffer');
		const settings = await service.getVSCodeKaotoSettings();
		assert(settings.runtimeCatalogName === '' && settings.testingCatalogName === '', 'Worker settings must retain normalized defaults');
		await unsupported(() => service.getRuntimeInfoFromMavenContext());
		await unsupported(() => service.getSuggestions('env', '', { propertyName: 'uri', inputValue: '' }));
		await service.onStepUpdated(StepUpdateAction.Add, CatalogKind.Component, 'log');
		documentUri = vscode.Uri.joinPath(owned, 'copy/route.camel.yaml');
		await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(documentUri, '..'));
		await service.saveResourceContent('schema.xsd', 'copy');
		assert((await read(vscode.Uri.joinPath(owned, 'copy/schema.xsd'))) === 'copy', 'Save As must use the current URI');
		assert((await service.deleteResource('schema.xsd')) === true, 'Resource deletion must succeed');
		assert((await service.isResourceExist('schema.xsd')) === false, 'Deleted resource must be absent');
		await write(vscode.Uri.joinPath(owned, '.kaoto'), '{ malformed');
		let failed = false;
		try {
			await service.setMetadata('do-not-overwrite', true);
		} catch (error) {
			failed = error instanceof SyntaxError;
		}
		assert(failed && (await read(vscode.Uri.joinPath(owned, '.kaoto'))) === '{ malformed', 'Metadata failure must preserve file');
		console.log(`KDP007_SERVICE_WORKER_PASS scheme=${workspace.scheme} authority=${workspace.authority}`);
	} finally {
		service.dispose();
		await vscode.workspace.fs.delete(owned, { recursive: true });
	}
}

async function editorLifecycle(): Promise<void> {
	const extension = vscode.extensions.getExtension('redhat.vscode-kaoto');
	assert(extension, 'Kaoto extension must be installed');
	await extension.activate();
	assert(extension.isActive, 'Kaoto must activate without Node globals');
	const workspace = vscode.workspace.workspaceFolders![0].uri;
	const root = vscode.Uri.joinPath(workspace, `kdp007-editor-${Date.now()}`);
	const uri = vscode.Uri.joinPath(root, 'route.camel.yaml');
	const secondUri = vscode.Uri.joinPath(root, 'second.camel.yaml');
	const original = route('worker-original');
	const updated = route('worker-updated');
	await vscode.workspace.fs.createDirectory(root);
	await write(uri, original);
	await write(secondUri, route('worker-second'));
	const tabs = () => vscode.window.tabGroups.all.flatMap((group) => group.tabs);
	const customTab = (target: vscode.Uri) =>
		tabs().find((tab) => tab.input instanceof vscode.TabInputCustom && tab.input.uri.toString() === target.toString());
	try {
		await vscode.commands.executeCommand(COMMAND_OPEN_WITH_KAOTO, uri);
		await until(() => !!customTab(uri), 'The existing Kaoto custom editor must open');
		const tab = customTab(uri)!;
		assert((tab.input as vscode.TabInputCustom).viewType === KAOTO_EDITOR_VIEW_TYPE, 'Custom editor ID must be preserved');
		const source = await vscode.workspace.openTextDocument(uri);
		await replace(source, updated);
		await until(() => tab.isDirty, 'The real Kaoto tab must become dirty after a source change');
		await vscode.commands.executeCommand('workbench.action.files.save');
		await until(() => !tab.isDirty, 'Successful native save must clear the real Kaoto dirty indicator');
		assert((await read(uri)) === updated, 'Save must persist the exact editor snapshot');
		await vscode.commands.executeCommand(COMMAND_OPEN_WITH_KAOTO, secondUri);
		assert(!!customTab(uri) && !!customTab(secondUri), 'Different documents must keep independent graphical editors');
		assert((await read(secondUri)) === route('worker-second'), 'Saving one document must not alter another');
		await vscode.commands.executeCommand(COMMAND_OPEN_WITH_KAOTO, uri);
		await replace(source, route('worker-unsaved'));
		await until(() => tab.isDirty, 'The next source edit must become dirty');
		await vscode.commands.executeCommand('workbench.action.files.revert');
		await until(() => !tab.isDirty, 'Revert must clear the native dirty indicator');
		assert((await read(uri)) === updated, 'Revert must retain saved file bytes');
		await vscode.window.showTextDocument(source, vscode.ViewColumn.Beside);
		await vscode.commands.executeCommand('workbench.action.files.revert');
		const textTab = vscode.window.tabGroups.activeTabGroup.activeTab;
		if (textTab) {
			await vscode.window.tabGroups.close(textTab);
		}
		console.log(`KDP007_EDITOR_WORKER_PASS vscode=${vscode.version} scheme=${workspace.scheme} authority=${workspace.authority}`);
	} finally {
		for (const target of [uri, secondUri]) {
			const tab = customTab(target);
			if (tab) {
				const column = vscode.window.tabGroups.all.find((group) => group.tabs.includes(tab))!.viewColumn;
				await vscode.commands.executeCommand('vscode.openWith', target, KAOTO_EDITOR_VIEW_TYPE, column);
				await vscode.commands.executeCommand('workbench.action.files.revert');
				await vscode.window.tabGroups.close(tab);
			}
		}
		await vscode.workspace.fs.delete(root, { recursive: true });
	}
}

/** The real workbench dirty state is independent of the provider's saved event. */
async function slowSave(): Promise<void> {
	const workspace = vscode.workspace.workspaceFolders![0].uri;
	const owned = vscode.Uri.joinPath(workspace, `kdp007-slow-save-${Date.now()}`);
	await vscode.workspace.fs.createDirectory(owned);
	const uri = vscode.Uri.parse('kaoto-save-test://workspace/route.camel.yaml');
	const target = (resource: vscode.Uri) => vscode.Uri.joinPath(owned, resource.path);
	const changes = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	let finishWrite: (() => void) | undefined;
	let writeGate = Promise.resolve();
	let started = false;
	let fail = false;
	const registration = vscode.workspace.registerFileSystemProvider(
		uri.scheme,
		{
			onDidChangeFile: changes.event,
			watch: () => ({ dispose() {} }),
			stat: (resource) => vscode.workspace.fs.stat(target(resource)),
			readDirectory: (resource) => vscode.workspace.fs.readDirectory(target(resource)),
			readFile: (resource) => vscode.workspace.fs.readFile(target(resource)),
			createDirectory: (resource) => vscode.workspace.fs.createDirectory(target(resource)),
			delete: (resource, options) => vscode.workspace.fs.delete(target(resource), options),
			rename: (from, to, options) => vscode.workspace.fs.rename(target(from), target(to), options),
			writeFile: async (resource, bytes) => {
				if (fail) {
					throw vscode.FileSystemError.NoPermissions(resource);
				}
				started = true;
				await writeGate;
				await vscode.workspace.fs.writeFile(target(resource), bytes);
			},
		},
		{ isCaseSensitive: true },
	);
	let tab: vscode.Tab | undefined;
	try {
		await write(target(uri), route('original'));
		await vscode.commands.executeCommand(COMMAND_OPEN_WITH_KAOTO, uri);
		tab = vscode.window.tabGroups.all
			.flatMap((group) => group.tabs)
			.find((candidate) => candidate.input instanceof vscode.TabInputCustom && candidate.input.uri.toString() === uri.toString());
		assert(tab, 'The slow-save fixture must use the real Kaoto custom editor');
		const source = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(source, vscode.ViewColumn.Beside);
		await vscode.commands.executeCommand('vscode.openWith', uri, KAOTO_EDITOR_VIEW_TYPE, vscode.ViewColumn.One);
		await replace(source, route('snapshot-A'));
		await until(() => tab!.isDirty, 'A must make the actual custom editor dirty');
		fail = true;
		await vscode.commands.executeCommand('workbench.action.files.save');
		assert(tab.isDirty, 'Failed writes must leave the real custom editor dirty');
		assert((await read(target(uri))) === route('original'), 'Failed writes must preserve persisted bytes');
		fail = false;
		writeGate = new Promise<void>((resolve) => {
			finishWrite = resolve;
		});
		const saving = vscode.commands.executeCommand('workbench.action.files.save');
		await until(() => started, 'Save must reach the controlled filesystem write');
		await replace(source, route('newer-B'));
		finishWrite!();
		await saving;
		await until(() => tab!.isDirty, 'The real custom editor must remain dirty for B after A was saved');
		assert((await read(target(uri))) === route('snapshot-A'), 'The first write must contain A only');
		started = false;
		writeGate = new Promise<void>((resolve) => {
			finishWrite = resolve;
		});
		const saveLatest = vscode.commands.executeCommand('workbench.action.files.save');
		await until(() => started, 'Saving the newer edit must reach persistence');
		finishWrite!();
		await saveLatest;
		await until(() => !tab!.isDirty, 'Saving B must clear the real custom editor dirty indicator');
		assert((await read(target(uri))) === route('newer-B'), 'The editor must retain and later save B');
		console.log('KDP007_SLOW_SAVE_WORKER_PASS A persisted, B retained dirty, failed write retained dirty');
	} finally {
		fail = false;
		finishWrite?.();
		if (tab) {
			await vscode.commands.executeCommand('vscode.openWith', uri, KAOTO_EDITOR_VIEW_TYPE, vscode.ViewColumn.One);
			await vscode.commands.executeCommand('workbench.action.files.revert');
			const source = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(source, vscode.ViewColumn.Two);
			await vscode.commands.executeCommand('workbench.action.files.revert');
			const ownedTabs = vscode.window.tabGroups.all
				.flatMap((group) => group.tabs)
				.filter(
					(item) =>
						(item.input instanceof vscode.TabInputCustom || item.input instanceof vscode.TabInputText) &&
						item.input.uri.toString() === uri.toString(),
				);
			await vscode.window.tabGroups.close(ownedTabs);
		}
		registration.dispose();
		changes.dispose();
		await vscode.workspace.fs.delete(owned, { recursive: true });
	}
}

function route(id: string): string {
	return `- route:\n    id: ${id}\n    from:\n      uri: direct:start\n      steps:\n        - log:\n            message: Hello\n`;
}
async function write(uri: vscode.Uri, content: string): Promise<void> {
	await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
}
async function read(uri: vscode.Uri): Promise<string> {
	return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
}
async function replace(document: vscode.TextDocument, content: string): Promise<void> {
	const edit = new vscode.WorkspaceEdit();
	edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), content);
	assert(await vscode.workspace.applyEdit(edit), 'Source edit must apply');
}
async function until(predicate: () => boolean, message: string): Promise<void> {
	const deadline = Date.now() + 30_000;
	while (!predicate()) {
		assert(Date.now() < deadline, message);
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
}
