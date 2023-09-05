/**
 * This import is required to be able to properly load the yaml worker
 * Unfortunately, it adds about 1 Mb to the bundle size
 *
 * TODO: Check how to split this from the bundle
 */
import 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import yamlWorker from './yaml-worker.ts?worker';

self.MonacoEnvironment = {
  globalAPI: true,
  getWorker(_workerId, label) {
    if (label === 'yaml') {
      return new yamlWorker();
    }

    return new editorWorker();
  },
};
