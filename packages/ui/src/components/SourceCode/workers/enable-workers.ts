/**
 * This import is required to be able to properly load the yaml worker
 * Unfortunately, it adds about 1 Mb to the bundle size
 *
 * TODO: Check how to split this from the bundle
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

import yamlWorker from './yaml-worker.ts?worker';

// Use the local monaco-editor instead of loading from CDN.
// @monaco-editor/react's loader defaults to CDN, which can load a different
// version than what monaco-yaml workers were compiled against.
loader.config({ monaco });

// ES imports are hoisted, so Monaco initializes before MonacoEnvironment.globalAPI
// can be set. Expose it explicitly for consumers that access window.monaco.
(globalThis as typeof globalThis & { monaco: typeof monaco }).monaco = monaco;

globalThis.MonacoEnvironment = {
  getWorker(_workerId, label) {
    if (label === 'yaml') {
      return new yamlWorker();
    }

    return new editorWorker();
  },
};
