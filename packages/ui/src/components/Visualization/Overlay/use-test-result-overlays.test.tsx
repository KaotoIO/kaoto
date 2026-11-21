import { act, renderHook, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { IEventBus, Unsubscribe } from '../../../host-bridge/contracts';
import { HostBridgeContext } from '../../../host-bridge/react/context';
import { createVisualizationNode, TestReportEntry } from '../../../models';
import { CitrusTestVisualEntity } from '../../../models/visualization/flows';
import { IMetadataApi, MetadataContext } from '../../../providers/metadata.provider';
import { useTestResultOverlays } from './use-test-result-overlays';

function createMockBus(): IEventBus & { fire(event: string, payload: unknown): void } {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (payload: unknown) => void): Unsubscribe => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return () => {
        listeners.get(event)?.delete(handler);
      };
    }),
    request: vi.fn(),
    onRequest: vi.fn(() => () => {}),
    dispose: vi.fn(),
    fire(event: string, payload: unknown) {
      for (const handler of listeners.get(event) ?? []) handler(payload);
    },
  };
}

const successReport: TestReportEntry = {
  name: 'my-test',
  result: { name: 'my-test', result: 'SUCCESS', success: true },
  actions: [
    { name: 'print', path: 'actions.0.print' },
    { name: 'send', path: 'actions.1.send' },
  ],
};

const failureReport: TestReportEntry = {
  name: 'my-test',
  result: { name: 'my-test', result: 'FAILURE', failed: true, errorMessage: 'Assertion failed' },
  actions: [
    { name: 'print', path: 'actions.0.print' },
    { name: 'send', path: 'actions.1.send', error: 'Expected value mismatch' },
  ],
};

function createTestEntity(id = 'my-test'): CitrusTestVisualEntity {
  return new CitrusTestVisualEntity({
    name: id,
    actions: [{ print: { message: 'hello' } }, { send: { endpoint: 'direct:test', message: {} } }],
  });
}

function buildModel(entity: CitrusTestVisualEntity) {
  const rootVizNode = createVisualizationNode('test', {
    name: 'test',
    isPlaceholder: false,
    isGroup: true,
    iconUrl: '',
    title: 'Test',
    description: '',
    path: 'test',
    definition: { name: entity.getId() },
    entity,
  });
  const printVizNode = createVisualizationNode('print', {
    name: 'print',
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: 'Print',
    description: '',
    path: 'actions.0.print',
    definition: { name: 'print' },
    entity,
  });
  const sendVizNode = createVisualizationNode('send', {
    name: 'send',
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: 'Send',
    description: '',
    path: 'actions.1.send',
    definition: { name: 'send' },
    entity,
  });
  const placeholderVizNode = createVisualizationNode('placeholder', {
    name: 'placeholder',
    isPlaceholder: true,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
    path: 'actions.2.placeholder',
    definition: {},
    entity,
  });

  return {
    nodes: [
      {
        id: 'test|root',
        type: 'group',
        group: true,
        children: ['print', 'send', 'placeholder'],
        data: { vizNode: rootVizNode },
      },
      { id: 'print', type: 'node', parentNode: 'test|root', data: { vizNode: printVizNode } },
      { id: 'send', type: 'node', parentNode: 'test|root', data: { vizNode: sendVizNode } },
      { id: 'placeholder', type: 'node', parentNode: 'test|root', data: { vizNode: placeholderVizNode } },
    ],
    edges: [{ id: 'print->send', type: 'edge', source: 'print', target: 'send' }],
  };
}

function setup(options?: {
  getTestReport?: (name: string) => Promise<TestReportEntry | undefined>;
  bus?: ReturnType<typeof createMockBus>;
  entity?: CitrusTestVisualEntity;
}) {
  const entity = options?.entity ?? createTestEntity();
  const model = buildModel(entity);
  const entities = [entity];
  const bus = options?.bus ?? createMockBus();
  const getTestReport = options?.getTestReport ?? vi.fn().mockResolvedValue(undefined);

  const metadataApi = { getTestReport } as unknown as IMetadataApi;

  const wrapper = ({ children }: PropsWithChildren) => (
    <HostBridgeContext.Provider value={bus}>
      <MetadataContext.Provider value={metadataApi}>{children}</MetadataContext.Provider>
    </HostBridgeContext.Provider>
  );

  return { entity, model, entities, bus, getTestReport, wrapper };
}

describe('useTestResultOverlays', () => {
  it('returns undefined when no CitrusTestVisualEntity is present', () => {
    const { model, wrapper } = setup();
    const { result } = renderHook(() => useTestResultOverlays(model, []), { wrapper });
    expect(result.current).toBeUndefined();
  });

  it('returns an overlay source when a CitrusTestVisualEntity is present', () => {
    const { model, entities, wrapper } = setup();
    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current?.model).toBe(model);
    expect(result.current?.store).toBeDefined();
  });

  it('returns undefined when getTestReport is not available', () => {
    const entity = createTestEntity();
    const model = buildModel(entity);
    const bus = createMockBus();

    const metadataApi = {} as unknown as IMetadataApi;

    const wrapper = ({ children }: PropsWithChildren) => (
      <HostBridgeContext.Provider value={bus}>
        <MetadataContext.Provider value={metadataApi}>{children}</MetadataContext.Provider>
      </HostBridgeContext.Provider>
    );

    const { result } = renderHook(() => useTestResultOverlays(model, [entity]), { wrapper });
    expect(result.current).toBeUndefined();
  });

  it('loads test reports on mount and creates success highlight entries', async () => {
    const getTestReport = vi.fn().mockResolvedValue(successReport);
    const { model, entities, wrapper } = setup({ getTestReport });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalledWith('my-test');
    });

    expect(result.current).toBeDefined();
    const layers = result.current!.store.getState().layers;
    const allEntries = layers.flatMap((l) => l.entries);
    const highlights = allEntries.filter((e) => e.kind === 'highlight');

    expect(highlights.length).toBeGreaterThanOrEqual(3);
    expect(highlights.every((h) => h.tone === 'success')).toBe(true);
  });

  it('creates error highlights and annotations for failed tests', async () => {
    const getTestReport = vi.fn().mockResolvedValue(failureReport);
    const { model, entities, wrapper } = setup({ getTestReport });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalled();
    });

    expect(result.current).toBeDefined();
    const layers = result.current!.store.getState().layers;
    const allEntries = layers.flatMap((l) => l.entries);

    const rootHighlight = allEntries.find((e) => e.id === 'test-hl-test|root');
    expect(rootHighlight).toBeDefined();
    expect(rootHighlight?.tone).toBe('error');

    const rootAnnotation = allEntries.find((e) => e.id === 'test-ann-test|root');
    expect(rootAnnotation).toBeDefined();
    expect(rootAnnotation?.kind).toBe('annotation');

    const sendHighlight = allEntries.find((e) => e.id === 'test-hl-send');
    expect(sendHighlight).toBeDefined();
    expect(sendHighlight?.tone).toBe('error');

    const sendAnnotation = allEntries.find((e) => e.id === 'test-ann-send');
    expect(sendAnnotation).toBeDefined();

    const printHighlight = allEntries.find((e) => e.id === 'test-hl-print');
    expect(printHighlight).toBeDefined();
    expect(printHighlight?.tone).toBe('success');
  });

  it('skips placeholder nodes', async () => {
    const getTestReport = vi.fn().mockResolvedValue(successReport);
    const { model, entities, wrapper } = setup({ getTestReport });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalled();
    });

    const layers = result.current!.store.getState().layers;
    const allEntries = layers.flatMap((l) => l.entries);
    const placeholderEntries = allEntries.filter((e) => e.id.includes('placeholder'));
    expect(placeholderEntries).toHaveLength(0);
  });

  it('clears the layer when getTestReport returns undefined', async () => {
    const getTestReport = vi.fn().mockResolvedValue(undefined);
    const { model, entities, wrapper } = setup({ getTestReport });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalled();
    });

    const layers = result.current!.store.getState().layers;
    const allEntries = layers.flatMap((l) => l.entries);
    expect(allEntries).toHaveLength(0);
  });

  it('clears the layer when getTestReport rejects', async () => {
    const getTestReport = vi.fn().mockRejectedValue(new Error('Network error'));
    const { model, entities, wrapper } = setup({ getTestReport });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalled();
    });

    const layers = result.current!.store.getState().layers;
    const allEntries = layers.flatMap((l) => l.entries);
    expect(allEntries).toHaveLength(0);
  });

  it('clears overlays on host:testRun:started and reloads on host:testReport:ready', async () => {
    const getTestReport = vi.fn().mockResolvedValue(successReport);
    const bus = createMockBus();
    const { model, entities, wrapper } = setup({ getTestReport, bus });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalledTimes(1);
    });

    const layersBefore = result.current!.store.getState().layers;
    const entriesBefore = layersBefore.flatMap((l) => l.entries);
    expect(entriesBefore.length).toBeGreaterThan(0);

    act(() => {
      bus.fire('host:testRun:started', null);
    });

    const layersAfterClear = result.current!.store.getState().layers;
    const entriesAfterClear = layersAfterClear.flatMap((l) => l.entries);
    expect(entriesAfterClear).toHaveLength(0);

    getTestReport.mockResolvedValue(failureReport);
    act(() => {
      bus.fire('host:testReport:ready', null);
    });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalledTimes(2);
    });

    const layersAfterReload = result.current!.store.getState().layers;
    const entriesAfterReload = layersAfterReload.flatMap((l) => l.entries);
    expect(entriesAfterReload.length).toBeGreaterThan(0);
    const rootHighlight = entriesAfterReload.find((e) => e.id === 'test-hl-test|root');
    expect(rootHighlight?.tone).toBe('error');
  });

  it('subscribes and unsubscribes bus events on mount/unmount', () => {
    const bus = createMockBus();
    const { model, entities, wrapper } = setup({ bus });

    const { unmount } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });
    expect(bus.on).toHaveBeenCalledWith('host:testRun:started', expect.any(Function));
    expect(bus.on).toHaveBeenCalledWith('host:testReport:ready', expect.any(Function));

    unmount();
  });

  it('does not create overlays for skipped tests', async () => {
    const skippedReport: TestReportEntry = {
      name: 'my-test',
      result: { name: 'my-test', result: 'SKIP', skipped: true },
      actions: [],
    };
    const getTestReport = vi.fn().mockResolvedValue(skippedReport);
    const { model, entities, wrapper } = setup({ getTestReport });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalled();
    });

    const layers = result.current!.store.getState().layers;
    const allEntries = layers.flatMap((l) => l.entries);
    expect(allEntries).toHaveLength(0);
  });

  it('uses cause as error message when errorMessage is absent', async () => {
    const causeReport: TestReportEntry = {
      name: 'my-test',
      result: { name: 'my-test', result: 'FAILURE', failed: true, cause: 'NullPointerException' },
      actions: [],
    };
    const getTestReport = vi.fn().mockResolvedValue(causeReport);
    const { model, entities, wrapper } = setup({ getTestReport });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalled();
    });

    const layers = result.current!.store.getState().layers;
    const annotations = layers.flatMap((l) => l.entries).filter((e) => e.kind === 'annotation');
    const rootAnnotation = annotations.find((e) => e.id === 'test-ann-test|root');
    expect(rootAnnotation?.interaction?.tooltip).toBe('NullPointerException');
  });

  it('uses fallback error message when no errorMessage or cause', async () => {
    const noMessageReport: TestReportEntry = {
      name: 'my-test',
      result: { name: 'my-test', result: 'FAILURE', failed: true },
      actions: [],
    };
    const getTestReport = vi.fn().mockResolvedValue(noMessageReport);
    const { model, entities, wrapper } = setup({ getTestReport });

    const { result } = renderHook(() => useTestResultOverlays(model, entities), { wrapper });

    await waitFor(() => {
      expect(getTestReport).toHaveBeenCalled();
    });

    const layers = result.current!.store.getState().layers;
    const annotations = layers.flatMap((l) => l.entries).filter((e) => e.kind === 'annotation');
    expect(annotations.length).toBeGreaterThanOrEqual(1);
    const rootAnnotation = annotations.find((e) => e.id === 'test-ann-test|root');
    expect(rootAnnotation?.interaction?.tooltip).toBe('Test failed');
  });
});
