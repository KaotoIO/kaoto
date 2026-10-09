// Ambient declarations (asset modules, build-time globals, vite/client) this entry point needs when
// another package consumes it as TypeScript source through the `@kaoto/source` export condition.
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./global.d.ts" />
/// <reference path="./vite-env.d.ts" />
/* eslint-enable @typescript-eslint/triple-slash-reference */

/**
 * Models components
 *
 * This file shouldn't export anything other than models, for instance, no components, no hooks, etc.
 */
export * from './models/settings';
/**
 * Only re-export the type-safe surface of `./multiplying-architecture` here.
 * A bare `export * from './multiplying-architecture'` pulls in `KaotoEditorFactory`,
 * which transitively imports `KaotoEditorApp` (and its `.scss`). Because this barrel is
 * consumed by non-webview bundles (e.g. the vscode-kaoto extension host / webworker targets
 * that have no sass-loader), that breaks their build. Keep component/runtime exports out.
 */
export type { KaotoEditorChannelApi } from './multiplying-architecture/KaotoEditorChannelApi';
