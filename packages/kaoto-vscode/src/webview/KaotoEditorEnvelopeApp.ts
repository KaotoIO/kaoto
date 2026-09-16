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

import { createRoot, type Root } from 'react-dom/client';
import { BridgeError, createEventBus, createPostMessageBridge } from '@kaoto/kaoto/host-bridge';
import { createKaotoEditor, type KaotoEditorApp } from '@kaoto/kaoto';

declare const acquireVsCodeApi: () => { postMessage(message: unknown): void };

const api = acquireVsCodeApi();
const container = document.getElementById('envelope-app')!;
void startNativeEditor();

async function startNativeEditor(): Promise<void> {
	let app: KaotoEditorApp | undefined;
	let root: Root | undefined;
	let disposed = false;
	const report = (error: Error) => {
		console.error('Kaoto host bridge:', error);
		// Dropped foreign or stale frames leave the established connection usable.
		if (!(error instanceof BridgeError && error.code === 'INVALID_MESSAGE')) {
			app?.suspend(error);
		}
	};
	const bus = createEventBus({ role: 'editor', onError: report });
	const bridge = createPostMessageBridge({
		bus,
		transport: {
			send: (message) => api.postMessage(message),
			onMessage: (handler) => {
				const listener = (event: MessageEvent) => handler(event.data);
				window.addEventListener('message', listener);
				return () => window.removeEventListener('message', listener);
			},
			dispose: () => {},
		},
	});
	const dispose = () => {
		if (disposed) {
			return;
		}
		disposed = true;
		window.removeEventListener('pagehide', dispose);
		root?.unmount();
		app?.dispose();
		bridge.dispose();
		bus.dispose();
	};
	window.addEventListener('pagehide', dispose, { once: true });
	container.textContent = 'Loading Kaoto…';
	try {
		await bridge.connect();
		app = await createKaotoEditor(bus, {
			fileExtension: container.dataset.fileExtension ?? 'camel.yaml',
			resourcesPathPrefix: container.dataset.resourcesPathPrefix ?? '',
			isReadOnly: false,
			onRetry: () => {
				dispose();
				void startNativeEditor();
			},
		});
		if (disposed) {
			app.dispose();
			return;
		}
		root = createRoot(container);
		root.render(app.af_componentRoot());
		app.af_onOpen();
	} catch (error) {
		report(error instanceof Error ? error : new Error(String(error)));
		if (disposed) {
			return;
		}
		dispose();
		const alert = document.createElement('div');
		alert.setAttribute('role', 'alert');
		alert.textContent = error instanceof Error ? error.message : 'Could not open Kaoto.';
		const retry = document.createElement('button');
		retry.type = 'button';
		retry.textContent = 'Retry';
		retry.addEventListener('click', () => void startNativeEditor(), { once: true });
		container.replaceChildren(alert, retry);
	}
}
