import { vi } from 'vitest';

// The vi.mock() calls of kaoto-web. They live here rather than in the test files: with `isolate: false` a module mock
// of one test file would leak into the others.

// Setup files run again for every test file, and so do these vi.mock() factories, but modules cached from an earlier
// file of the worker keep the mock instance they imported. Create every mock module once per worker, so that tests and
// the code under test share the same mock functions (same approach as packages/ui/vitest-mocks-setup.ts).
const { oncePerWorker } = vi.hoisted(() => {
  const store = globalThis as typeof globalThis & { __kaotoWebMockModules?: Map<string, unknown> };
  const instances = (store.__kaotoWebMockModules ??= new Map<string, unknown>());
  return {
    oncePerWorker: async <T>(id: string, create: () => Promise<T>): Promise<T> => {
      if (!instances.has(id)) instances.set(id, await create());
      return instances.get(id) as T;
    },
  };
});

// Monaco needs a real browser. The stand-in shows the content in a text box that reports what is typed, and exposes
// the language and theme it was given.
vi.mock('@monaco-editor/react', () =>
  oncePerWorker('@monaco-editor/react', async () => {
    const { MonacoEditorMock } = await import('./src/test/monaco-editor-mock');
    return { Editor: MonacoEditorMock, loader: { config: vi.fn() } };
  }),
);
