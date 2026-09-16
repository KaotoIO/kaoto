/*
 * Kaoto host shim for VS Code.
 *
 * Defines window.__kaotoHost for the Kaoto editor webview. The editor bundle only knows the KaotoHost contract
 * (createTransport(): MessageTransport); everything VS Code specific lives here. Load this file with a classic
 * <script> before the editor module script.
 */
(function () {
  'use strict';

  // acquireVsCodeApi() may be called only once per webview.
  const vscodeApi = acquireVsCodeApi();

  window.__kaotoHost = {
    createTransport() {
      return {
        send(message) {
          vscodeApi.postMessage(message);
        },
        onMessage(handler) {
          const listener = (event) => {
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
        dispose() {},
      };
    },
  };
})();
