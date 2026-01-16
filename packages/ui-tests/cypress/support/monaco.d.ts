import type * as Monaco from 'monaco-editor';

declare global {
  interface Window {
    monaco: typeof Monaco;
  }
}

export {};
