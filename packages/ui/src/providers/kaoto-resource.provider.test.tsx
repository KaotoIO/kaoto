import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren, useContext } from 'react';

import { CamelResourceFactory } from '../models/camel/camel-resource-factory';
import { SerializerType } from '../models/kaoto-resource';
import { CamelRouteVisualEntity } from '../models/visualization/flows';
import { camelRouteJson, camelRouteYaml } from '../stubs/camel-route';
import { EventNotifier } from '../utils';
import { EntitiesContext, EntitiesProvider } from './entities.provider';
import { KaotoResourceContext, KaotoResourceProvider } from './kaoto-resource.provider';
import { SourceCodeSync } from './source-code-sync';

describe('KaotoResourceProvider', () => {
  it('builds the resource and entities from the source code present at mount', () => {
    const { result } = renderHook(() => useContext(EntitiesContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeSync initialSourceCode={camelRouteYaml}>
          <KaotoResourceProvider>
            <EntitiesProvider>{children}</EntitiesProvider>
          </KaotoResourceProvider>
        </SourceCodeSync>
      ),
    });

    expect(result.current?.visualEntities).toEqual([new CamelRouteVisualEntity(camelRouteJson)]);
  });

  it('subscribes to the code:updated notification', () => {
    const subscribeSpy = jest.spyOn(EventNotifier.getInstance(), 'subscribe');

    renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeSync>
          <KaotoResourceProvider>{children}</KaotoResourceProvider>
        </SourceCodeSync>
      ),
    });

    expect(subscribeSpy).toHaveBeenCalledWith('code:updated', expect.anything());

    subscribeSpy.mockRestore();
  });

  it('falls back to fileExtension when the mount event carries no path', () => {
    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeSync initialSourceCode={camelRouteYaml}>
          <KaotoResourceProvider fileExtension=".xml">{children}</KaotoResourceProvider>
        </SourceCodeSync>
      ),
    });

    // The mount emits code:updated with no path → handler must reconcile path ?? fileExtension
    expect(result.current?.kaotoResource.getSerializerType()).toEqual(SerializerType.XML);
  });

  it('prefers an explicit path from the event over fileExtension', () => {
    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeSync>
          <KaotoResourceProvider fileExtension=".xml">{children}</KaotoResourceProvider>
        </SourceCodeSync>
      ),
    });

    act(() => {
      EventNotifier.getInstance().next('code:updated', { code: camelRouteYaml, path: 'route.yaml' });
    });

    // An explicit YAML path must win over the .xml fileExtension
    expect(result.current?.kaotoResource.getSerializerType()).toEqual(SerializerType.YAML);
  });

  it('falls back to an empty resource when the factory throws on malformed code', () => {
    const real = CamelResourceFactory.createCamelResource.bind(CamelResourceFactory);
    const createSpy = jest.spyOn(CamelResourceFactory, 'createCamelResource').mockImplementation((code, opts) => {
      if (code === '- from: {') throw new Error('parse error');
      return real(code, opts);
    });

    const { result } = renderHook(() => useContext(KaotoResourceContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeSync initialSourceCode="- from: {">
          <KaotoResourceProvider>{children}</KaotoResourceProvider>
        </SourceCodeSync>
      ),
    });

    // The mount emission makes the factory throw; the handler must catch and build an empty resource.
    expect(result.current?.kaotoResource).toBeDefined();

    createSpy.mockRestore();
  });
});
