import { fireEvent, render } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { VisualFlowsApi } from '../../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext, VisibleFlowsContextResult } from '../../../providers';
import { TopologyCollapsedGroup } from './TopologyCollapsedGroup';

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return { ...actual, isNode: () => true };
});

interface MockNodeOverrides {
  routeId?: string;
  fallbackLabel?: string;
  description?: string;
  disabled?: boolean;
  childCount?: number;
  bounds?: { width: number; height: number };
}

const mockVizNode = (overrides: MockNodeOverrides) =>
  ({
    id: overrides.routeId ?? 'route-1234',
    getId: () => overrides.routeId ?? 'route-1234',
    getNodeLabel: () => overrides.fallbackLabel ?? 'route-1234',
    getNodeDefinition: () => ({ disabled: overrides.disabled, description: overrides.description }),
    data: {
      iconUrl: 'http://example.com/route.svg',
      description: 'Catalog description',
      processorIconTooltip: '',
      processorName: 'route',
    },
  }) as unknown as IVisualizationNode;

const mockNodeElement = (overrides: MockNodeOverrides = {}) =>
  ({
    getData: () => ({ vizNode: mockVizNode(overrides) }),
    getAllNodeChildren: () => Array.from({ length: overrides.childCount ?? 0 }, (_, i) => i),
    getBounds: () => overrides.bounds ?? { width: 90, height: 75 },
  }) as never;

const buildVisibleFlowsContext = (dispatch: jest.Mock = jest.fn()): VisibleFlowsContextResult => ({
  visibleFlows: { 'route-1234': true, 'route-5678': true },
  allFlowsVisible: true,
  visualFlowsApi: new VisualFlowsApi(dispatch),
});

const Wrapper: FunctionComponent<PropsWithChildren<{ dispatch?: jest.Mock }>> = ({ children, dispatch }) => (
  <MemoryRouter initialEntries={['/topology']}>
    <VisibleFlowsContext.Provider value={buildVisibleFlowsContext(dispatch)}>
      <Routes>
        <Route path="/topology" element={<svg>{children}</svg>} />
        <Route path="/" element={<div data-testid="design-page">design</div>} />
      </Routes>
    </VisibleFlowsContext.Provider>
  </MemoryRouter>
);

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

describe('TopologyCollapsedGroup', () => {
  it('uses the route description as the visible label when set', () => {
    const { container } = render(
      <Wrapper>
        <TopologyCollapsedGroup element={mockNodeElement({ description: 'Sammelt Timer-Events' })} />
      </Wrapper>,
    );

    expect(container.querySelector('.custom-node__label__text')?.textContent).toBe('Sammelt Timer-Events');
    expect(container.querySelector('[data-nodelabel="Sammelt Timer-Events"]')).toBeInTheDocument();
  });

  it('falls back to vizNode.getNodeLabel() when no description is set', () => {
    const { container } = render(
      <Wrapper>
        <TopologyCollapsedGroup element={mockNodeElement({ fallbackLabel: 'route-9999' })} />
      </Wrapper>,
    );

    expect(container.querySelector('.custom-node__label__text')?.textContent).toBe('route-9999');
  });

  it('treats a whitespace-only description as missing and uses the fallback label', () => {
    const { container } = render(
      <Wrapper>
        <TopologyCollapsedGroup element={mockNodeElement({ description: '   ', fallbackLabel: 'route-blank' })} />
      </Wrapper>,
    );

    expect(container.querySelector('.custom-node__label__text')?.textContent).toBe('route-blank');
  });

  it('renders nothing for an element without a vizNode', () => {
    const elementWithoutViz = {
      getData: () => ({}),
      getBounds: () => ({ width: 90, height: 75 }),
    } as never;

    const { container } = render(
      <Wrapper>
        <TopologyCollapsedGroup element={elementWithoutViz} />
      </Wrapper>,
    );

    expect(container.querySelector('.topology-collapsed-route')).not.toBeInTheDocument();
  });

  it('exposes the disabled state on the outer <g> when the route definition has disabled: true', () => {
    const { container } = render(
      <Wrapper>
        <TopologyCollapsedGroup element={mockNodeElement({ disabled: true })} />
      </Wrapper>,
    );

    expect(container.querySelector<SVGGElement>('.topology-collapsed-route')?.dataset.disabled).toBe('true');
  });

  it('navigates Home and focuses the route on double-click', () => {
    const dispatch = jest.fn();
    const { getByTestId } = render(
      <MemoryRouter initialEntries={['/topology']}>
        <VisibleFlowsContext.Provider value={buildVisibleFlowsContext(dispatch)}>
          <Routes>
            <Route
              path="/topology"
              element={
                <svg>
                  <TopologyCollapsedGroup element={mockNodeElement({ routeId: 'route-clicked' })} />
                </svg>
              }
            />
            <Route path="/" element={<LocationProbe />} />
          </Routes>
        </VisibleFlowsContext.Provider>
      </MemoryRouter>,
    );

    fireEvent.doubleClick(getByTestId('topology-route__route-clicked'));

    expect(dispatch).toHaveBeenCalledWith({ type: 'hideFlows', flowIds: undefined });
    expect(dispatch).toHaveBeenCalledWith({ type: 'showFlows', flowIds: ['route-clicked'] });
    expect(getByTestId('location').textContent).toBe('/');
  });

  it('forwards onContextMenu to the outer <g>', () => {
    const onContextMenu = jest.fn();
    const { getByTestId } = render(
      <Wrapper>
        <TopologyCollapsedGroup element={mockNodeElement()} onContextMenu={onContextMenu} />
      </Wrapper>,
    );

    fireEvent.contextMenu(getByTestId('topology-route__route-1234'));
    expect(onContextMenu).toHaveBeenCalled();
  });
});
