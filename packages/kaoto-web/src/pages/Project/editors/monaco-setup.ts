import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

type WorkerConstructor = new () => Worker;

/** Languages with a language service of their own; Monaco asks for the TypeScript one for JavaScript too */
const LANGUAGE_WORKERS: Record<string, WorkerConstructor> = {
  json: JsonWorker,
  javascript: TsWorker,
  typescript: TsWorker,
};

/** The web worker Monaco runs the language service of `label` in; the generic editor worker for everything else */
export const workerFor = (label: string): WorkerConstructor => LANGUAGE_WORKERS[label] ?? EditorWorker;

/**
 * Sets up Monaco for the editors of kaoto-web; calling it again changes nothing.
 *
 * `@monaco-editor/react` loads Monaco from a CDN by default, which can be another version than the bundled
 * `monaco-editor`; use the bundled one. Monaco runs its language services in web workers that the bundler provides.
 * There is no YAML worker: monaco-yaml does not work with this Monaco version yet (#4727).
 *
 * A function rather than a side-effect import: the package declares only its styles as side effects, so the bundler
 * would drop a bare `import './monaco-setup'` from the production build.
 */
export const setUpMonaco = (): void => {
  loader.config({ monaco });

  globalThis.MonacoEnvironment = {
    getWorker(_workerId, label) {
      const LanguageWorker = workerFor(label);
      return new LanguageWorker();
    },
  };
};
