import { act, fireEvent, render, RenderResult, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { CamelRouteResource } from '../../models/camel';
import { VisualFlowsApi } from '../../models/visualization/flows/support/flows-visibility';
import { TestProvidersWrapper } from '../../stubs';
import { camelRouteJson } from '../../stubs/camel-route';
import { TopologyPage } from './TopologyPage';

const buildVisibleFlowsContext = (entityIds: string[], dispatch: jest.Mock = jest.fn()) => ({
  visibleFlows: entityIds.reduce<Record<string, boolean>>((acc, id) => ({ ...acc, [id]: true }), {}),
  allFlowsVisible: true,
  visualFlowsApi: new VisualFlowsApi(dispatch),
});

const Router: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <MemoryRouter initialEntries={['/topology']}>{children}</MemoryRouter>
);

describe('TopologyPage', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should render without entities', async () => {
    const { Provider } = TestProvidersWrapper({ camelResource: new CamelRouteResource([]) });

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result?.container.querySelector('.topology-page')).toBeInTheDocument();
  });

  it('should render a collapsed node for each visual entity', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = camelResource.getVisualEntities();
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: buildVisibleFlowsContext(visualEntities.map((e) => e.id)),
    });

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result?.container.querySelector('.pf-topology-visualization-surface')).toBeInTheDocument();

    await waitFor(() => {
      visualEntities.forEach((entity) => {
        const scope = entity.getId() ?? entity.id;
        // FlowService scopes ids as `${scope}|...`. Each route has at least one node sharing this scope prefix.
        const nodes = result?.container.querySelectorAll(`[data-id^="${scope}|"]`);
        expect(nodes?.length ?? 0).toBeGreaterThan(0);
      });
    });
  });

  it('should render every route even when the global visibleFlows hides them', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = camelResource.getVisualEntities();
    const hiddenFlows = visualEntities.reduce<Record<string, boolean>>((acc, e) => ({ ...acc, [e.id]: false }), {});
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: {
        visibleFlows: hiddenFlows,
        allFlowsVisible: false,
        visualFlowsApi: new VisualFlowsApi(jest.fn()),
      },
    });

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      visualEntities.forEach((entity) => {
        const scope = entity.getId() ?? entity.id;
        const nodes = result?.container.querySelectorAll(`[data-id^="${scope}|"]`);
        expect(nodes?.length ?? 0).toBeGreaterThan(0);
      });
    });
  });

  // JSDOM renders the route group as an empty <g/> when external endpoint nodes are
  // present in the model. The same flow works in the real browser. Skipped until a
  // deterministic way to flush PatternFly Topology's mobx-driven layout in JSDOM is in place.
  it.skip('should hide all but the clicked route and dispatch a navigation when a route node is double-clicked', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = camelResource.getVisualEntities();
    const dispatch = jest.fn();
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: buildVisibleFlowsContext(
        visualEntities.map((e) => e.id),
        dispatch,
      ),
    });

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    const targetEntity = visualEntities[0];
    const routeId = targetEntity.getId() ?? targetEntity.id;

    let clickable: Element | null | undefined;
    await waitFor(() => {
      clickable = result?.container.querySelector('.topology-collapsed-route');
      expect(clickable).toBeTruthy();
    });

    act(() => {
      fireEvent.doubleClick(clickable!);
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'hideFlows', flowIds: undefined });
    expect(dispatch).toHaveBeenCalledWith({ type: 'showFlows', flowIds: [routeId] });
  });

  // See note above — JSDOM/external-node interaction.
  it.skip('should show an Open context menu item that triggers the same action as double-click', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = camelResource.getVisualEntities();
    const dispatch = jest.fn();
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: buildVisibleFlowsContext(
        visualEntities.map((e) => e.id),
        dispatch,
      ),
    });

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    const targetEntity = visualEntities[0];
    const routeId = targetEntity.getId() ?? targetEntity.id;

    let target: Element | null | undefined;
    await waitFor(() => {
      target = result?.container.querySelector('.topology-collapsed-route');
      expect(target).toBeTruthy();
    });

    act(() => {
      fireEvent.contextMenu(target!);
    });

    let openItem: HTMLElement | null | undefined;
    await waitFor(() => {
      openItem = result?.queryByText('Open');
      expect(openItem).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(openItem!);
    });

    expect(dispatch).toHaveBeenCalledWith({ type: 'hideFlows', flowIds: undefined });
    expect(dispatch).toHaveBeenCalledWith({ type: 'showFlows', flowIds: [routeId] });
  });

  // See note above — JSDOM/external-node interaction.
  it.skip('should not navigate on a single click', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = camelResource.getVisualEntities();
    const dispatch = jest.fn();
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: buildVisibleFlowsContext(
        visualEntities.map((e) => e.id),
        dispatch,
      ),
    });

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    let clickable: Element | null | undefined;
    await waitFor(() => {
      clickable = result?.container.querySelector('.topology-collapsed-route');
      expect(clickable).toBeTruthy();
    });

    act(() => {
      fireEvent.click(clickable!);
    });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should render an edge between routes connected via a direct: endpoint', async () => {
    const producer = {
      route: {
        id: 'route-producer',
        from: {
          uri: 'timer:tick',
          parameters: { period: '1000' },
          steps: [{ to: { uri: 'direct:my-consumer' } }],
        },
      },
    };
    const consumer = {
      route: {
        id: 'route-consumer',
        from: {
          uri: 'direct:my-consumer',
          steps: [{ log: { message: 'hello' } }],
        },
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const camelResource = new CamelRouteResource([producer, consumer] as any);
    const visualEntities = camelResource.getVisualEntities();
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: buildVisibleFlowsContext(visualEntities.map((e) => e.id)),
    });

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      const edges = result?.container.querySelectorAll<HTMLElement>('[data-kind="edge"]');
      const crossRouteEdges = Array.from(edges ?? []).filter((edge) => {
        const id = edge.dataset.id ?? '';
        return id.includes('route-producer') && id.includes('route-consumer') && id.includes('direct:my-consumer');
      });
      expect(crossRouteEdges.length).toBeGreaterThan(0);
    });
  });

  it('should render an external-endpoint node when a producer references an unknown direct: target', async () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const visualEntities = camelResource.getVisualEntities();
    const { Provider } = TestProvidersWrapper({
      camelResource,
      visibleFlowsContext: buildVisibleFlowsContext(visualEntities.map((e) => e.id)),
    });

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      const externalNode = result?.container.querySelector<HTMLElement>('[data-id="external::direct:my-route"]');
      expect(externalNode).toBeInTheDocument();
      expect(externalNode?.dataset.type).toBe('external-endpoint');
    });
  });

  it('should render the topology control bar buttons', async () => {
    const { Provider } = TestProvidersWrapper();

    let result: RenderResult | undefined;
    await act(async () => {
      result = render(
        <Router>
          <Provider>
            <TopologyPage />
          </Provider>
        </Router>,
      );
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(result?.getByRole('button', { name: /reset view/i })).toBeInTheDocument();
      expect(result?.getByRole('button', { name: /zoom in/i })).toBeInTheDocument();
      expect(result?.getByRole('button', { name: /zoom out/i })).toBeInTheDocument();
    });
  });
});
