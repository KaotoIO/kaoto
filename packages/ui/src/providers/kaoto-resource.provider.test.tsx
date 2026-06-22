import { act, renderHook } from '@testing-library/react';
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
    expect(result.current?.kaotoResource).toBeInstanceOf(CamelXMLRouteResource);
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
    expect(result.current?.kaotoResource).toBeInstanceOf(CamelRouteResource);
    expect(result.current?.kaotoResource).not.toBeInstanceOf(CamelXMLRouteResource);
  });

  it('keeps resource undefined when the factory throws on malformed code at mount', () => {
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

    // The mount emission makes the factory throw; the handler must swallow it and keep
    // the resource as undefined (showing loading screen) rather than crashing.
    expect(result.current?.kaotoResource).toBeUndefined();

    createSpy.mockRestore();
  });

  it('keeps the last valid resource when a keystroke makes the source transiently invalid', () => {
    const { result } = renderHook(() => useContext(EntitiesContext), {
      wrapper: ({ children }: PropsWithChildren) => (
        <SourceCodeSync initialSourceCode={pipeYaml}>
          <KaotoResourceProvider>
            <EntitiesProvider>{children}</EntitiesProvider>
          </KaotoResourceProvider>
        </SourceCodeSync>
      ),
    });

    // Sanity: the valid Pipe is in place.
    expect(result.current?.currentSchemaType).toBe(SourceSchemaType.Pipe);
    const visualEntitiesBefore = result.current?.visualEntities;
    expect(visualEntitiesBefore).toHaveLength(1);

    // Simulate a keystroke that leaves the YAML momentarily unparseable.
    act(() => {
      EventNotifier.getInstance().next('code:updated', {
        code: pipeYaml.replace('name: webhook-binding', 'name: {webhook-binding'),
      });
    });

    // Regression: the schema type must NOT flip to Route, and the entities must be untouched,
    // so the UI does not re-render/refresh on the invalid keystroke.
    expect(result.current?.currentSchemaType).toBe(SourceSchemaType.Pipe);
    expect(result.current?.visualEntities).toBe(visualEntitiesBefore);
  });
});
