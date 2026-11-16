export const DEFAULT_CAMEL_VERSION_FALLBACK: string = '4.22.1';

/** Minimum camel-jbang version required for the 'camel test' plugin (4.22.0 ships the plugin natively; 4.20 uses a broken JBang shim) */
export const MIN_CAMEL_VERSION_FOR_TEST: string = '4.22.1';

export const KAOTO_EDITOR_VIEW_TYPE = 'webviewEditorsKaoto';

/**
 * Where the built extension keeps the `@kaoto/camel-catalog` that webpack copies into it, relative to the extension root.
 * It must match the copy target in `webpack.config.js`.
 */
export const BUNDLED_CATALOG_PATH = 'dist/webview/editors/kaoto/camel-catalog';
