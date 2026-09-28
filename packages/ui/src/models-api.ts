/**
 * Models components
 *
 * This file shouldn't export anything other than models, for instance, no components, no hooks, etc.
 */
export * from './models/catalog-kind';
export * from './models/file-types';
export * from './models/runtime-maven-information';
export * from './models/settings';
export * from './models/step-update-action';
/**
 * Only re-export the type-safe surface of `./multiplying-architecture` here.
 * A bare `export * from './multiplying-architecture'` pulls in `KaotoEditorFactory`,
 * which transitively imports `KaotoEditorApp` (and its `.scss`). Because this barrel is
 * consumed by non-webview bundles (e.g. the vscode-kaoto extension host / webworker targets
 * that have no sass-loader), that breaks their build. Keep component/runtime exports out.
 */
export type { KaotoEditorChannelApi } from './multiplying-architecture/KaotoEditorChannelApi';
export type { Suggestion, SuggestionRequestContext } from '@kaoto/forms';
