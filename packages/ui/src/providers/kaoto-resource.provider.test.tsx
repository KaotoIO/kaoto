import { act, renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren, useContext } from 'react';

import { SourceSchemaType } from '../models/camel';
import { CamelResourceFactory } from '../models/camel/camel-resource-factory';
import { CamelRouteResource } from '../models/camel/camel-route-resource';
import { CamelXMLRouteResource } from '../models/camel/camel-xml-route-resource';
import { CamelRouteVisualEntity } from '../models/visualization/flows';
import { camelRouteJson, camelRouteYaml } from '../stubs/camel-route';
import { pipeYaml } from '../stubs/pipe';
import { EventNotifier } from '../utils';
import { EntitiesContext, EntitiesProvider } from './entities.provider';
import { KaotoResourceContext, KaotoResourceProvider, ResourceParseState } from './kaoto-resource.provider';
import { inMemorySourceCodeAdapter, SourceCodeAdapter, SourceCodeProvider } from './source-code.provider';

describe('KaotoResourceProvider', () => {
  it('builds the resource and entities from the source code present at mount', async () => {
    const { result } = renderHook(() => useContext(EntitiesContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter(camelRouteYaml)}>
          <KaotoResourceProvider>
            <EntitiesProvider>{children}</EntitiesProvider>
          </KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current?.visualEntities).toEqual([new CamelRouteVisualEntity(camelRouteJson)]);
    });
  });

  it('subscribes to the code:updated notification', () => {
    const subscribeSpy = vi.spyOn(EventNotifier.getInstance(), 'subscribe');

    renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter()}>
          <KaotoResourceProvider>{children}</KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    expect(subscribeSpy).toHaveBeenCalledWith('code:updated', expect.anything());

    subscribeSpy.mockRestore();
  });

  it('falls back to fileExtension when the mount event carries no path', () => {
    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter(camelRouteYaml)}>
          <KaotoResourceProvider fileExtension=".xml">{children}</KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    // The mount emits code:updated with no path → handler must reconcile path ?? fileExtension
    expect(result.current?.kaotoResource).toBeInstanceOf(CamelXMLRouteResource);
  });

  it('prefers an explicit path from the event over fileExtension', () => {
    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter()}>
          <KaotoResourceProvider fileExtension=".xml">{children}</KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    act(() => {
      EventNotifier.getInstance().next('code:updated', { code: camelRouteYaml, path: 'route.yaml' });
    });

    // An explicit YAML path must win over the .xml fileExtension
    expect(result.current?.kaotoResource).toBeInstanceOf(CamelRouteResource);
    expect(result.current?.kaotoResource).not.toBeInstanceOf(CamelXMLRouteResource);
  });

  it('provides an empty resource when the first document does not parse', () => {
    const real = CamelResourceFactory.createCamelResource.bind(CamelResourceFactory);
    const createSpy = vi.spyOn(CamelResourceFactory, 'createCamelResource').mockImplementation((code, opts) => {
      if (code === '- from: {') throw new Error('parse error');
      return real(code, opts);
    });

    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter('- from: {')}>
          <KaotoResourceProvider>{children}</KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    // The mount emission makes the factory throw; with no previous resource the handler
    // falls back to an empty one instead of staying on the loading screen.
    expect(result.current?.kaotoResource).toBeInstanceOf(CamelRouteResource);
    expect(result.current?.kaotoResource?.toJSON()).toEqual([]);

    createSpy.mockRestore();
  });

  it('keeps the last valid resource when a keystroke makes the source transiently invalid', async () => {
    const { result } = renderHook(() => useContext(EntitiesContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter(pipeYaml)}>
          <KaotoResourceProvider>
            <EntitiesProvider>{children}</EntitiesProvider>
          </KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    // Sanity: the valid Pipe is in place.
    await waitFor(() => {
      expect(result.current?.visualEntities).toHaveLength(1);
    });
    expect(result.current?.currentSchemaType).toBe(SourceSchemaType.Pipe);

    // Capture the reference before the keystroke
    const visualEntitiesBeforeKeystroke = result.current?.visualEntities;

    // Simulate a keystroke that leaves the YAML momentarily unparseable.
    act(() => {
      EventNotifier.getInstance().next('code:updated', {
        code: pipeYaml.replace('name: webhook-binding', 'name: {webhook-binding'),
      });
    });

    // Regression: the schema type must NOT flip to Route, and the entities must be untouched,
    // so the UI does not re-render/refresh on the invalid keystroke.
    expect(result.current?.currentSchemaType).toBe(SourceSchemaType.Pipe);
    expect(result.current?.visualEntities).toBe(visualEntitiesBeforeKeystroke);
  });

  it('a canvas edit on an unparseable first document must NOT overwrite it via adapter.onChange', async () => {
    const BROKEN = `- route:\n    id: keep-me\n    from:\n      uri: timer:x\n      steps: [ unclosed\n`;
    const changes: string[] = [];
    const adapter: SourceCodeAdapter = {
      subscribe(apply) {
        apply({ code: BROKEN, path: 'a.camel.yaml' });
        return () => {};
      },
      onChange(code) {
        changes.push(code);
      },
    };
    const { result } = renderHook(() => useContext(EntitiesContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={adapter}>
          <KaotoResourceProvider>
            <EntitiesProvider>{children}</EntitiesProvider>
          </KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });
    await waitFor(() => {
      expect(result.current).toBeTruthy();
    });
    expect(result.current!.entities).toHaveLength(0);
    expect(changes).toHaveLength(0);

    act(() => {
      result.current!.updateSourceCodeFromEntities();
    });

    // Guard must block the write: no onChange call, broken content is preserved.
    expect(changes).toHaveLength(0);
  });

  it('sets parseState to Valid when the document parses successfully', () => {
    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter(camelRouteYaml)}>
          <KaotoResourceProvider>{children}</KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    expect(result.current?.parseState).toBe(ResourceParseState.Valid);
    expect(result.current?.parsedError).toBeUndefined();
  });

  it('sets parseState to Error and parsedError when the document does not parse', () => {
    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={inMemorySourceCodeAdapter('- from: {')}>
          <KaotoResourceProvider>{children}</KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    expect(result.current?.parseState).toBe(ResourceParseState.Error);
    expect(result.current?.parsedError).toBeTypeOf('string');
    expect(result.current?.parsedError!.length).toBeGreaterThan(0);
  });

  it('transitions from Error back to Valid when the document is fixed', () => {
    let deliver!: (code: string) => void;
    const adapter: SourceCodeAdapter = {
      subscribe(apply) {
        deliver = (code) => {
          apply({ code });
        };
        apply({ code: '- from: {' });
        return () => {};
      },
    };

    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeProvider adapter={adapter}>
          <KaotoResourceProvider>{children}</KaotoResourceProvider>
        </SourceCodeProvider>
      ),
    });

    expect(result.current?.parseState).toBe(ResourceParseState.Error);

    act(() => {
      deliver(camelRouteYaml);
    });

    expect(result.current?.parseState).toBe(ResourceParseState.Valid);
    expect(result.current?.parsedError).toBeUndefined();
  });
});
