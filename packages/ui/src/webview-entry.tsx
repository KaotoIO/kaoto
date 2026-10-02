import { createEventBus, createPostMessageBridge, type MessageTransport } from '@kaoto/editor-api';
import { createRoot, type Root } from 'react-dom/client';

import { KaotoEditor, type KaotoEditorInit } from './multiplying-architecture/KaotoEditor';

export function startKaotoWebview(transport: MessageTransport): void {
  const container = document.getElementById('envelope-app')!;
  void start(container, transport);
}

async function start(container: HTMLElement, transport: MessageTransport): Promise<void> {
  let root: Root | undefined;
  let disposed = false;

  const report = (error: Error) => {
    console.error('Kaoto editor-api:', error);
  };

  const bus = createEventBus({ role: 'editor', onError: report });
  const bridge = createPostMessageBridge({ bus, transport });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('pagehide', dispose);
    root?.unmount();
    bridge.dispose();
    // bus is disposed by KaotoEditor on unmount
  };
  window.addEventListener('pagehide', dispose, { once: true });

  container.textContent = 'Loading Kaoto…';
  try {
    await bridge.connect();
    const initialSettings = await bus.request('editor:settings:get', null);
    if (disposed) return;

    const fileExtension = container.dataset.fileExtension ?? 'camel.yaml';
    const resourcesPathPrefix = container.dataset.resourcesPathPrefix ?? '';
    const init: KaotoEditorInit = {
      fileExtension,
      resourcesPathPrefix,
      isReadOnly: false,
      onRetry: () => {
        dispose();
        void start(container, transport);
      },
    };

    root = createRoot(container);
    root.render(<KaotoEditor bus={bus} initialSettings={initialSettings} init={init} />);
  } catch (error) {
    report(error instanceof Error ? error : new Error(String(error)));
    if (disposed) return;
    dispose();
    const alert = document.createElement('div');
    alert.setAttribute('role', 'alert');
    alert.textContent = error instanceof Error ? error.message : 'Could not open Kaoto.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Retry';
    retry.addEventListener('click', () => void start(container, transport), { once: true });
    container.replaceChildren(alert, retry);
  }
}
