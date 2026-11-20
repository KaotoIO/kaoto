import { createKaotoEditorRouter } from './KaotoEditorRouter';

describe('createKaotoEditorRouter', () => {
  it('creates no router when the module is imported', async () => {
    // A hash router listens to the history of the window as soon as it is created
    const addEventListener = vi.spyOn(window, 'addEventListener');

    // @ts-expect-error -- the query makes Vite evaluate a fresh copy of the module, also when the worker loaded it before
    await import('./KaotoEditorRouter?import-only');

    expect(addEventListener).not.toHaveBeenCalledWith('popstate', expect.any(Function));
  });

  it('creates a new router on every call', () => {
    const first = createKaotoEditorRouter();
    const second = createKaotoEditorRouter();

    expect(second).not.toBe(first);

    first.dispose();
    second.dispose();
  });

  it('loads the Design page of the start route once the router is created', async () => {
    const router = createKaotoEditorRouter();
    expect(router.state.initialized).toBe(false);

    await vi.dynamicImportSettled();

    expect(router.state.initialized).toBe(true);
    // The lazy route has resolved into the element of the Design page
    expect(router.state.matches.at(-1)?.route.element).toBeDefined();
    router.dispose();
  });
});
