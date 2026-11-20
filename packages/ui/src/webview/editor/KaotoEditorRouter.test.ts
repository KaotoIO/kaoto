import { createKaotoEditorRouter } from './KaotoEditorRouter';

describe('createKaotoEditorRouter', () => {
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
