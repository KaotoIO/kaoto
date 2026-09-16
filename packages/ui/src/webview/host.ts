import type { MessageTransport } from '../host-bridge/contracts';

/**
 * What a host application provides to the Kaoto editor webview.
 *
 * The host's page defines `window.__kaotoHost` in a classic script that runs before the editor bundle
 * (module scripts are deferred, so any earlier classic `<script>` is enough).
 */
export interface KaotoHost {
  createTransport(): MessageTransport;
}

declare global {
  interface Window {
    __kaotoHost?: KaotoHost;
  }
}

export function createHostTransport(): MessageTransport {
  const host = window.__kaotoHost;
  if (!host) {
    throw new Error('Could not open Kaoto: the host did not provide window.__kaotoHost.');
  }
  return host.createTransport();
}
