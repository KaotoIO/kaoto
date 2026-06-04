import { act, render, renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren, useContext } from 'react';
import { parse } from 'yaml';

import { KaotoResource, SerializerType } from '../models/kaoto-resource';
import { CamelRouteVisualEntity } from '../models/visualization/flows';
import { mockRandomValues } from '../stubs';
import { camelRouteJson, camelRouteYaml } from '../stubs/camel-route';
import { camelRouteYaml_1_1_original, camelRouteYaml_1_1_updated } from '../stubs/camel-route-yaml-1.1';
import { EventNotifier } from '../utils';
import { EntitiesContext, EntitiesContextResult, EntitiesProvider } from './entities.provider';
import { SourceCodeContext } from './source-code.provider';

const waitForEntitiesLoaded = async (result: { current: EntitiesContextResult | null }) => {
  await waitFor(() => {
    expect(result.current?.isLoading).toBe(false);
    expect(result.current?.camelResource).toBeDefined();
  });
};

describe('EntitiesProvider', () => {
  let eventNotifier: EventNotifier;
  beforeEach(() => {
    eventNotifier = EventNotifier.getInstance();
  });

  it.each([
    [SerializerType.YAML, undefined],
    [SerializerType.XML, 'camel.xml'],
    [SerializerType.YAML, 'camel.yaml'],
  ])(
    'should initialize the camelResource using the `%s` serializer provided a `%s` file extension',
    async (serializerType, fileExtension) => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <EntitiesProvider fileExtension={fileExtension}>{children}</EntitiesProvider>
        ),
      });
      await waitFor(() => {
        expect(result.current?.camelResource?.getSerializerType()).toEqual(serializerType);
      });
    },
  );

  describe('Initialization', () => {
    it('should use the sourceCode context to initialize the Camel Resource', async () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <SourceCodeContext.Provider value={camelRouteYaml}>
            <EntitiesProvider>{children}</EntitiesProvider>
          </SourceCodeContext.Provider>
        ),
      });

      await waitFor(() => {
        expect(result.current?.camelResource?.toJSON()).toEqual(parse(camelRouteYaml));
      });
    });

    it('should create an empty Camel Resource if there is no Source Code available', async () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: EntitiesProvider,
      });

      await waitFor(() => {
        expect(result.current?.camelResource?.toJSON()).toEqual([]);
      });
    });

    it('should ignore non-camel entities', async () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <SourceCodeContext.Provider value="A non camel source code">
            <EntitiesProvider>{children}</EntitiesProvider>
          </SourceCodeContext.Provider>
        ),
      });

      await waitFor(() => {
        expect(result.current?.camelResource?.toJSON()).toEqual(['A non camel source code']);
      });
    });

    it('should fallback to an empty Camel Resource when there is a wrong Source Code', async () => {
      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <SourceCodeContext.Provider value={'- from: {'}>
            <EntitiesProvider>{children}</EntitiesProvider>
          </SourceCodeContext.Provider>
        ),
      });

      await waitFor(() => {
        expect(result.current?.camelResource?.toJSON()).toEqual([]);
      });
    });
  });

  it('it should subscribe to the `code:updated` notification', () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'subscribe');

    renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });

    expect(notifierSpy).toHaveBeenCalledWith('code:updated', expect.anything());
  });

  it('updating the source code should NOT recreate the Camel Resource', async () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });
    await waitForEntitiesLoaded(result);

    const firstCamelResource = result.current?.camelResource;
    await act(async () => {
      await result.current?.updateSourceCodeFromEntities();
    });
    const secondCamelResource = result.current?.camelResource;

    expect(firstCamelResource).toBe(secondCamelResource);
  });

  it('should recreate the entities when the source code is updated', async () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });
    await waitForEntitiesLoaded(result);

    await act(async () => {
      eventNotifier.next('code:updated', { code: camelRouteYaml });
    });

    await waitFor(() => {
      expect(result.current?.entities).toEqual([]);
      expect(result.current?.visualEntities).toEqual([new CamelRouteVisualEntity(camelRouteJson)]);
    });
  });

  it('should serialize using YAML 1.1', async () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });
    await waitForEntitiesLoaded(result);

    await act(async () => {
      eventNotifier.next('code:updated', { code: camelRouteYaml_1_1_original });
    });

    await waitFor(() => {
      expect(result.current?.visualEntities).toHaveLength(1);
    });

    await act(async () => {
      result.current?.visualEntities[0].updateModel('route.from.parameters.bindingMode', 'off');
      await result.current?.updateSourceCodeFromEntities();
    });

    await waitFor(() => {
      expect(notifierSpy).toHaveBeenCalledWith('entities:updated', camelRouteYaml_1_1_updated);
    });
  });

  it('should notify subscribers when the entities are updated', async () => {
    mockRandomValues();

    const notifierSpy = jest.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });
    await waitForEntitiesLoaded(result);

    await act(async () => {
      result.current?.camelResource?.addNewEntity();
      await result.current?.updateSourceCodeFromEntities();
    });

    await waitFor(() => {
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
  });

  it('updating entities should NOT recreate the Camel Resource', async () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });
    await waitForEntitiesLoaded(result);

    let firstCamelResource: KaotoResource | undefined;
    let secondCamelResource: KaotoResource | undefined;

    await act(async () => {
      firstCamelResource = result.current?.camelResource;
      await result.current?.updateEntitiesFromCamelResource();
      secondCamelResource = result.current?.camelResource;
    });

    expect(firstCamelResource).toBeDefined();
    expect(secondCamelResource).toBeDefined();
    expect(firstCamelResource).toBe(secondCamelResource);
  });

  it('should refresh entities', async () => {
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });
    await waitForEntitiesLoaded(result);

    await act(async () => {
      result.current?.camelResource?.addNewEntity();
      result.current?.camelResource?.addNewEntity();
      await result.current?.updateEntitiesFromCamelResource();
    });

    await waitFor(() => {
      expect(result.current?.entities).toEqual([]);
      expect(result.current?.visualEntities).toHaveLength(2);
    });
  });

  it('should refresh entities and notify subscribers', async () => {
    const notifierSpy = jest.spyOn(eventNotifier, 'next');
    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });
    await waitForEntitiesLoaded(result);

    await act(async () => {
      await result.current?.updateEntitiesFromCamelResource();
    });

    await waitFor(() => {
      expect(notifierSpy).toHaveBeenCalledWith(
        'entities:updated',
        `[]
`,
      );
    });
  });

  describe('progressive loading', () => {
    it('should render children immediately with isLoading=true', () => {
      const xml = '<?xml version="1.0"?>\n<camel><route id="test"></route></camel>';
      let childRendered = false;

      const TestChild = () => {
        childRendered = true;
        return null;
      };

      render(
        <SourceCodeContext.Provider value={xml}>
          <EntitiesProvider>
            <TestChild />
          </EntitiesProvider>
        </SourceCodeContext.Provider>,
      );

      expect(childRendered).toBe(true);
    });

    it('should set isLoading=false after resource loads', async () => {
      const xml = '<?xml version="1.0"?>\n<camel><route id="test"></route></camel>';

      const { result } = renderHook(() => useContext(EntitiesContext), {
        wrapper: ({ children }: PropsWithChildren) => (
          <SourceCodeContext.Provider value={xml}>
            <EntitiesProvider>{children}</EntitiesProvider>
          </SourceCodeContext.Provider>
        ),
      });

      expect(result.current?.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current?.isLoading).toBe(false);
        expect(result.current?.camelResource).toBeDefined();
      });
    });
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

    const { result } = renderHook(() => useContext(EntitiesContext), { wrapper: EntitiesProvider });
    await waitForEntitiesLoaded(result);

    await act(async () => {
      eventNotifier.next('code:updated', { code });
    });

    await waitFor(() => {
      expect(result.current?.isLoading).toBe(false);
    });

    const serialized = await result.current?.camelResource?.toStringAsync();
    expect(serialized).toContain(
      `# This is a comment
#     An indented comment`,
    );
  });
});
