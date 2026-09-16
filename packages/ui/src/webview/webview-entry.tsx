import { createRoot, type Root } from 'react-dom/client';

import { createPostMessageBridge } from '../host-bridge/bridge';
import { MessageTransport } from '../host-bridge/contracts';
import { createEventBus } from '../host-bridge/event-bus';
import { KaotoEditor, type KaotoEditorInit } from './editor/KaotoEditor';

/**
 * Starts the Kaoto editor inside the host page.
 *
 * `createTransport` is called on every start, including each Retry, so a failed attempt never reuses a disposed
 * transport. If it throws, the error is shown with a Retry button instead of the editor.
 */
export function startKaotoWebview(createTransport: () => MessageTransport): void {
  const container = document.getElementById('kaoto-editor')!;
  void start(container, createTransport);
}

function report(error: unknown): void {
  console.error('Kaoto editor-api:', error instanceof Error ? error : new Error(String(error)));
}

function showFailure(container: HTMLElement, error: unknown, retry: () => void): void {
  const alert = document.createElement('div');
  alert.setAttribute('role', 'alert');
  alert.textContent = error instanceof Error ? error.message : 'Could not open Kaoto.';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Retry';
  button.addEventListener('click', retry, { once: true });
  container.replaceChildren(alert, button);
}

async function start(container: HTMLElement, createTransport: () => MessageTransport): Promise<void> {
  let transport: MessageTransport;
  try {
    transport = createTransport();
  } catch (error) {
    report(error);
    showFailure(container, error, () => void start(container, createTransport));
    return;
  }

  let root: Root | undefined;
  let disposed = false;

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
        void start(container, createTransport);
      },
    };

    root = createRoot(container);
    root.render(<KaotoEditor bus={bus} initialSettings={initialSettings} init={init} />);
  } catch (error) {
    report(error);
    if (disposed) return;
    dispose();
    showFailure(container, error, () => void start(container, createTransport));
  }
}
