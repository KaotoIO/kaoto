/**
 * Entry point of the host-agnostic Kaoto editor webview, served by Vite in development and bundled for production.
 *
 * NOT included in the production library build.
 */

import { createHostTransport } from './host';
import { startKaotoWebview } from './webview-entry';

startKaotoWebview(createHostTransport);
