import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import { describe, expect, it } from 'vitest';

import { setUpMonaco, workerFor } from './monaco-setup';

describe('setUpMonaco', () => {
  it('makes the editor load the bundled Monaco instead of the CDN copy', () => {
    setUpMonaco();

    expect(loader.config).toHaveBeenCalledWith({ monaco });
  });

  it('provides the web workers of Monaco', () => {
    setUpMonaco();

    expect(globalThis.MonacoEnvironment?.getWorker).toBeTypeOf('function');
  });
});

describe('workerFor', () => {
  it.each([
    ['json', 'the JSON worker', JsonWorker],
    ['javascript', 'the TypeScript worker', TsWorker],
    ['typescript', 'the TypeScript worker', TsWorker],
    ['yaml', 'the generic editor worker', EditorWorker],
    ['xml', 'the generic editor worker', EditorWorker],
    ['editorWorkerService', 'the generic editor worker', EditorWorker],
  ])('runs the language service of %s in %s', (label, _name, worker) => {
    expect(workerFor(label)).toBe(worker);
  });
});
