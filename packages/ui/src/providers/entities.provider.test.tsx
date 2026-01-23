import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren, useContext } from 'react';
import { parse } from 'yaml';

import { DynamicCatalogRegistry } from '../dynamic-catalog';
import { DynamicCatalog } from '../dynamic-catalog/dynamic-catalog';
import { ICatalogProvider } from '../dynamic-catalog/models';
import { CamelResource, SerializerType } from '../models/camel';
import { CatalogKind } from '../models/catalog-kind';
import { CamelCatalogService, CamelRouteVisualEntity } from '../models/visualization/flows';
import { mockRandomValues } from '../stubs';
import { camelRouteJson, camelRouteYaml } from '../stubs/camel-route';
import { camelRouteYaml_1_1_original, camelRouteYaml_1_1_updated } from '../stubs/camel-route-yaml-1.1';
import { getFirstCatalogMap } from '../stubs/test-load-catalog';
import { EventNotifier } from '../utils';
import { EntitiesContext, EntitiesProvider } from './entities.provider';
import { SourceCodeContext } from './source-code.provider';

describe('EntitiesProvider', () => {
  let eventNotifier: EventNotifier;

  beforeAll(async () => {
    // Load all catalogs properly for sorting functionality
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    // Set up CamelCatalogService (for getComponent calls)
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, catalogsMap.kameletsCatalogMap);

    // Set up DynamicCatalogRegistry (for CamelComponentSorter)
    const registry = DynamicCatalogRegistry.get();

    // Create providers for each catalog type
    const createProvider = <T,>(catalogMap: Record<string, T>): ICatalogProvider<T> => ({
      id: 'test-provider',
      fetch: async (key: string) => catalogMap[key],
      fetchAll: async () => catalogMap,
    });

    registry.setCatalog(CatalogKind.Component, new DynamicCatalog(createProvider(catalogsMap.componentCatalogMap)));
    registry.setCatalog(CatalogKind.Processor, new DynamicCatalog(createProvider(catalogsMap.modelCatalogMap)));
    registry.setCatalog(CatalogKind.Pattern, new DynamicCatalog(createProvider(catalogsMap.patternCatalogMap)));
    registry.setCatalog(CatalogKind.Entity, new DynamicCatalog(createProvider(catalogsMap.entitiesCatalog)));
    registry.setCatalog(CatalogKind.Language, new DynamicCatalog(createProvider(catalogsMap.languageCatalog)));
    registry.setCatalog(CatalogKind.Kamelet, new DynamicCatalog(createProvider(catalogsMap.kameletsCatalogMap)));

    // Pre-populate the cache by fetching each catalog entry
    await Promise.all([
      ...Object.keys(catalogsMap.componentCatalogMap).map((key) => registry.getEntity(CatalogKind.Component, key)),
      ...Object.keys(catalogsMap.modelCatalogMap).map((key) => registry.getEntity(CatalogKind.Processor, key)),
      ...Object.keys(catalogsMap.patternCatalogMap).map((key) => registry.getEntity(CatalogKind.Pattern, key)),
      ...Object.keys(catalogsMap.entitiesCatalog).map((key) => registry.getEntity(CatalogKind.Entity, key)),
      ...Object.keys(catalogsMap.languageCatalog).map((key) => registry.getEntity(CatalogKind.Language, key)),
      ...Object.keys(catalogsMap.kameletsCatalogMap).map((key) => registry.getEntity(CatalogKind.Kamelet, key)),
    ]);
  });

  afterAll(() => {
    CamelCatalogService.clearCatalogs();
    DynamicCatalogRegistry.get().clearRegistry();
  });

  beforeEach(() => {
    eventNotifier = EventNotifier.getInstance();
  });

  it.each([
    [SerializerType.YAML, undefined],
    [SerializerType.XML, 'camel.xml'],
    [SerializerType.YAML, 'camel.yaml'],
  ])(
    'should initialize the camelResource using the `%s` serializer provided a `%s` file extension',
    (serializerType, fileExtension) => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <EntitiesProvider fileExtension={fileExtension}>{children}</EntitiesProvider>
        ),
      });

      expect(result.current?.camelResource.getSerializerType()).toEqual(serializerType);
    },
  );

  describe('Initialization', () => {
    it('should use the sourceCode context to initialize the Camel Resource', () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <SourceCodeContext.Provider value={camelRouteYaml}>
            <EntitiesProvider>{children}</EntitiesProvider>
          </SourceCodeContext.Provider>
        ),
      });

      expect(result.current?.camelResource.toJSON()).toEqual(parse(camelRouteYaml));
    });

    it('should create an empty Camel Resource if there is no Source Code available', () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: EntitiesProvider,
      });

      expect(result.current?.camelResource.toJSON()).toEqual([]);
    });

    it('should ignore non-camel entities', () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <SourceCodeContext.Provider value="A non camel source code">
            <EntitiesProvider>{children}</EntitiesProvider>
          </SourceCodeContext.Provider>
        ),
      });

      expect(result.current?.camelResource.toJSON()).toEqual(['A non camel source code']);
    });

    it('should fallback to an empty Camel Resource when there is a wrong Source Code', () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <SourceCodeContext.Provider value={'- from: {'}>
            <EntitiesProvider>{children}</EntitiesProvider>
          </SourceCodeContext.Provider>
        ),
      });

      expect(result.current?.camelResource.toJSON()).toEqual([]);
    });
  });

  it('it should subscribe to the `code:updated` notification', () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'subscribe');

    renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    expect(notifierSpy).toHaveBeenCalledWith('code:updated', expect.anything());
  });

  it('updating the source code should NOT recreate the Camel Resource', () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    act(() => {
      const firstCamelResource = result.current?.camelResource;
      result.current?.updateSourceCodeFromEntities();
      const secondCamelResource = result.current?.camelResource;

      expect(firstCamelResource).toBe(secondCamelResource);
    });
  });

  it('should recreate the entities when the source code is updated', () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    act(() => {
      eventNotifier.next('code:updated', { code: camelRouteYaml });
    });

    expect(result.current?.entities).toEqual([]);
    expect(result.current?.visualEntities).toEqual([new CamelRouteVisualEntity(camelRouteJson)]);
  });

  it('should serialize using YAML 1.1', () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    act(() => {
      eventNotifier.next('code:updated', { code: camelRouteYaml_1_1_original });
    });

    act(() => {
      result.current?.visualEntities[0].updateModel('route.from.parameters.bindingMode', 'off');
      result.current?.updateSourceCodeFromEntities();
    });

    expect(notifierSpy).toHaveBeenCalledWith('entities:updated', camelRouteYaml_1_1_updated);
  });

  it('should notify subscribers when the entities are updated', () => {
    mockRandomValues();

    const notifierSpy = jest.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    act(() => {
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
    let firstCamelResource: CamelResource | undefined;
    let secondCamelResource: CamelResource | undefined;

    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

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
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    act(() => {
      result.current?.camelResource.addNewEntity();
      result.current?.camelResource.addNewEntity();
      result.current?.updateEntitiesFromCamelResource();
    });

    expect(result.current?.entities).toEqual([]);
    expect(result.current?.visualEntities).toHaveLength(2);
  });

  it('should refresh entities and notify subscribers', () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    act(() => {
      result.current?.updateEntitiesFromCamelResource();
    });

    expect(notifierSpy).toHaveBeenCalledWith(
      'entities:updated',
      `[]
`,
    );
  });

  it(`should store code's comments`, () => {
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

    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    act(() => {
      eventNotifier.next('code:updated', { code });
    });

    expect(result.current?.camelResource.toString()).toContain(
      `# This is a comment
#     An indented comment`,
    );
  });
});
