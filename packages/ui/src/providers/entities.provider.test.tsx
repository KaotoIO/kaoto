import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren, useContext } from 'react';
import { parse } from 'yaml';

import { SourceSchemaType } from '../models/camel';
import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { CamelXMLRouteResource } from '../models/camel/camel-xml-route-resource';
import { KaotoResource } from '../models/kaoto-resource';
import { CamelRouteVisualEntity } from '../models/visualization/flows';
import { useSourceCodeStore } from '../store';
import { mockRandomValues } from '../stubs';
import { camelRouteJson, camelRouteYaml } from '../stubs/camel-route';
import { camelRouteYaml_1_1_original, camelRouteYaml_1_1_updated } from '../stubs/camel-route-yaml-1.1';
import { EventNotifier } from '../utils';
import { EntitiesContext, EntitiesProvider } from './entities.provider';
import { KaotoResourceContext, KaotoResourceProvider } from './kaoto-resource.provider';
import { SourceCodeSync } from './source-code-sync';

/**
 * A controllable deferred promise: lets a test decide *when* (and whether) an
 * async call settles, so we can interleave it with React lifecycle events such
 * as unmount. Returned alongside its `resolve`/`reject` handles.
 */
const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/**
 * Build a minimal mock KaotoResource covering only the surface EntitiesProvider
 * touches. Pass `overrides` to control `initialize` (resolve/reject/defer) and the
 * entities returned. Injected directly via KaotoResourceContext to bypass the
 * factory, giving the test full control over the async init lifecycle.
 */
const createMockResource = (overrides: Partial<KaotoResource> = {}): KaotoResource =>
  ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getEntities: vi.fn().mockReturnValue([]),
    getVisualEntities: vi.fn().mockReturnValue([]),
    getType: vi.fn().mockReturnValue(SourceSchemaType.Route),
    toString: vi.fn().mockReturnValue(''),
    ...overrides,
  }) as unknown as KaotoResource;

const buildMockResourceWrapper =
  (resource: KaotoResource) =>
  ({ children }: PropsWithChildren) => (
    <KaotoResourceContext.Provider value={{ kaotoResource: resource }}>
      <EntitiesProvider>{children}</EntitiesProvider>
    </KaotoResourceContext.Provider>
  );

/**
 * Compose the real provider chain. Source code enters through the single ingress
 * (SourceCodeSync emits `code:updated` on mount), KaotoResourceProvider builds the
 * resource, and EntitiesProvider derives the entities from it.
 */
const buildWrapper =
  (initialSourceCode?: string, fileExtension?: string) =>
  ({ children }: PropsWithChildren) => (
    <SourceCodeSync initialSourceCode={initialSourceCode}>
      <KaotoResourceProvider fileExtension={fileExtension}>
        <EntitiesProvider>{children}</EntitiesProvider>
      </KaotoResourceProvider>
    </SourceCodeSync>
  );

describe('EntitiesProvider', () => {
  let eventNotifier: EventNotifier;
  beforeEach(() => {
    eventNotifier = EventNotifier.getInstance();
    // Reset store state before each test
    useSourceCodeStore.getState().setSourceCode('');
    useSourceCodeStore.temporal.getState().clear();
  });

  it.each([
    [CamelRouteResource, undefined],
    [CamelXMLRouteResource, 'camel.xml'],
    [CamelRouteResource, 'camel.yaml'],
  ])('should initialize the camelResource as `%s` provided a `%s` file extension', (ResourceClass, fileExtension) => {
    const { result } = renderHook(() => useContext(EntitiesContext), {
      wrapper: buildWrapper(undefined, fileExtension),
    });

    expect(result.current?.camelResource).toBeInstanceOf(ResourceClass);
  });

  describe('Initialization', () => {
    it('should use the source code to initialize the Camel Resource', () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: buildWrapper(camelRouteYaml),
      });

      expect(result.current?.camelResource.toJSON()).toEqual(parse(camelRouteYaml));
    });

    it('should create an empty Camel Resource if there is no Source Code available', () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: buildWrapper(),
      });

      expect(result.current?.camelResource.toJSON()).toEqual([]);
    });

    it('should ignore non-camel entities', () => {
      useSourceCodeStore.getState().setSourceCode('A non camel source code');

      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: buildWrapper('A non camel source code'),
      });

      expect(result.current?.camelResource.toJSON()).toEqual(['A non camel source code']);
    });

    it('should keep resource undefined when there is a wrong Source Code at mount', () => {
      useSourceCodeStore.getState().setSourceCode('- from: {');

      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: buildWrapper('- from: {'),
      });

      // With invalid source code at mount, the resource stays undefined (loading screen)
      expect(result.current).toBeNull();
    });
  });

  it('updating the source code should NOT recreate the Camel Resource', () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: buildWrapper() });

    act(() => {
      const firstCamelResource = result.current?.camelResource;
      result.current?.updateSourceCodeFromEntities();
      const secondCamelResource = result.current?.camelResource;

      expect(firstCamelResource).toBe(secondCamelResource);
    });
  });

  it('should recreate the entities when the source code is updated', async () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: buildWrapper() });

    act(() => {
      eventNotifier.next('code:updated', { code: camelRouteYaml });
    });

    await act(async () => {});

    expect(result.current?.entities).toEqual([]);
    expect(result.current?.visualEntities).toEqual([new CamelRouteVisualEntity(camelRouteJson)]);
  });

  it('should serialize using YAML 1.1', async () => {
    const notifierSpy = vi.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: buildWrapper() });

    act(() => {
      eventNotifier.next('code:updated', { code: camelRouteYaml_1_1_original });
    });

    await act(async () => {});

    await act(async () => {
      result.current?.visualEntities[0].updateModel('route.from.parameters.bindingMode', 'off');
      result.current?.updateSourceCodeFromEntities();
    });

    expect(notifierSpy).toHaveBeenCalledWith('entities:updated', camelRouteYaml_1_1_updated);
  });

  it('should notify subscribers when the entities are updated', async () => {
    mockRandomValues();

    const notifierSpy = vi.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: buildWrapper() });

    await act(async () => {
      result.current?.camelResource.addNewEntity();
      result.current?.updateSourceCodeFromEntities();
    });

    expect(notifierSpy).toHaveBeenCalledWith(
      'entities:updated',
      `- route:
    id: route-1234
    from:
      id: from-1234
      uri: timer
      parameters:
        period: "1000"
        timerName: template
      steps:
        - log:
            id: log-1234
            message: \${body}
`,
    );
  });

  it('updating entities should NOT recreate the Camel Resource', () => {
    let firstCamelResource: KaotoResource | undefined;
    let secondCamelResource: KaotoResource | undefined;

    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: buildWrapper() });

    act(() => {
      firstCamelResource = result.current?.camelResource;
      result.current?.updateEntitiesFromCamelResource();
    });

    act(() => {
      secondCamelResource = result.current?.camelResource;
      expect(firstCamelResource).toBe(secondCamelResource);
    });

    expect(firstCamelResource).not.toBeUndefined();
    expect(secondCamelResource).not.toBeUndefined();
  });

  it('should refresh entities', () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: buildWrapper() });

    act(() => {
      result.current?.camelResource.addNewEntity();
      result.current?.camelResource.addNewEntity();
      result.current?.updateEntitiesFromCamelResource();
    });

    expect(result.current?.entities).toEqual([]);
    expect(result.current?.visualEntities).toHaveLength(2);
  });

  it('should refresh entities and notify subscribers', async () => {
    const notifierSpy = vi.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: buildWrapper() });

    await act(async () => {
      result.current?.updateEntitiesFromCamelResource();
    });

    expect(notifierSpy).toHaveBeenCalledWith(
      'entities:updated',
      `[]
`,
    );
  });

  it(`should store code's comments`, async () => {
    const code = `# This is a comment
#     An indented comment

- route:
    id: route-1234
    from:
      id: from-1234
      uri: timer
      parameters:
        period: "1000"
        timerName: template
      # This comment won't be stored
      steps:
        - log:
            id: log-1234
            message: \${body}
`;

    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: buildWrapper() });

    act(() => {
      eventNotifier.next('code:updated', { code });
    });

    const output = await result.current?.camelResource.toSourceCode();

    expect(output).toContain(
      `# This is a comment
#     An indented comment`,
    );
  });

  describe('async initialization lifecycle', () => {
    // WORKED EXAMPLE — the failure path (entities.provider.tsx catch block).
    it('should reset entities and log when initialization rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('boom');
      const resource = createMockResource({
        initialize: vi.fn().mockRejectedValue(error),
        // Returned only if the success path runs — it must NOT, since init rejects.
        getEntities: vi.fn().mockReturnValue([{ id: 'should-not-appear' }]),
        getVisualEntities: vi.fn().mockReturnValue([{ id: 'should-not-appear' }]),
      });

      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: buildMockResourceWrapper(resource),
      });

      // Flush the rejected init microtask so the catch block runs.
      await act(async () => {});

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize KaotoResource', error);
      expect(result.current?.entities).toEqual([]);
      expect(result.current?.visualEntities).toEqual([]);
      // Proof we took the catch path, not the success path.
      expect(resource.getEntities).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    // Success-path cancellation guard — entities.provider.tsx line 49
    // (`if (cancelled) return;` after `await kaotoResource.initialize()`).
    it('should not read entities when unmounted before initialize resolves', async () => {
      const deferred = createDeferred<void>();
      const resource = createMockResource({
        initialize: vi.fn().mockReturnValue(deferred.promise),
      });

      const { unmount } = renderHook(() => useContext(EntitiesContext), {
        wrapper: buildMockResourceWrapper(resource),
      });

      // Unmount first so the effect cleanup sets `cancelled = true`...
      unmount();

      // ...then let initialize() resolve. The continuation should bail at the guard.
      await act(async () => {
        deferred.resolve();
        await deferred.promise;
      });

      expect(resource.getEntities).not.toHaveBeenCalled();
      expect(resource.getVisualEntities).not.toHaveBeenCalled();
    });

    // Failure-path cancellation guard — entities.provider.tsx line 53
    // (`if (cancelled) return;` at the top of the catch block).
    it('should not log when unmounted before initialize rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const deferred = createDeferred<void>();
      const resource = createMockResource({
        initialize: vi.fn().mockReturnValue(deferred.promise),
      });

      const { unmount } = renderHook(() => useContext(EntitiesContext), {
        wrapper: buildMockResourceWrapper(resource),
      });

      // Unmount first so the effect cleanup sets `cancelled = true`...
      unmount();

      // ...then let initialize() reject. The catch should bail before logging.
      await act(async () => {
        deferred.reject(new Error('boom'));
        // Swallow the rejection here so it doesn't surface as an unhandled rejection.
        await deferred.promise.catch(() => {});
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
