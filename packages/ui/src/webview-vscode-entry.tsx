/**
 * VS Code webview entry point, served by Vite in development and bundled for production.
 *
 * NOT included in the production library build.
 */

import { startKaotoWebview } from './webview-entry';

declare const acquireVsCodeApi: () => { postMessage(message: unknown): void };

const api = acquireVsCodeApi();

startKaotoWebview({
  send: (message) => {
    api.postMessage(message);
  },
  onMessage: (handler) => {
    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (data && typeof data === 'object' && data.protocol === 'kaoto-host-bridge') {
        handler(data);
      }
    };
    window.addEventListener('message', listener);
    return () => {
      window.removeEventListener('message', listener);
    };
  },
  dispose: () => {},
});
