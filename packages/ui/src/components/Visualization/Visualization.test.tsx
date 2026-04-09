import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

import { useVisibleVizNodes } from '../../hooks/use-visible-viz-nodes';
import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { CamelRouteVisualEntity } from '../../models/visualization/flows';
import { VisualFlowsApi } from '../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext } from '../../providers/visible-flows.provider';
import { camelRouteJson } from '../../stubs/camel-route';
import { Visualization } from './Visualization';

jest.mock('./Canvas', () => ({
  Canvas: ({
    vizNodes,
    entitiesCount,
    isVizNodesResolving,
  }: {
    vizNodes: unknown[];
    entitiesCount: number;
    isVizNodesResolving?: boolean;
  }) => (
    <div
      data-testid="mock-canvas"
      data-entities-count={String(entitiesCount)}
      data-viz-nodes-length={String(vizNodes.length)}
      data-is-viz-nodes-resolving={String(!!isVizNodesResolving)}
    />
  ),
}));

jest.mock('../../hooks/use-visible-viz-nodes');
const mockUseVisibleVizNodes = jest.mocked(useVisibleVizNodes);

const mockVizNode = { id: 'node-1' } as unknown as IVisualizationNode;

function renderWithVisibleFlows(ui: ReactElement, visibleFlows: Record<string, boolean>) {
  return render(
    <VisibleFlowsContext.Provider
      value={{
        visibleFlows,
        allFlowsVisible: true,
        visualFlowsApi: {
          toggleFlowVisible: jest.fn(),
          showFlows: jest.fn(),
          hideFlows: jest.fn(),
          clearFlows: jest.fn(),
          initVisibleFlows: jest.fn(),
          renameFlow: jest.fn(),
        } as unknown as VisualFlowsApi,
      }}
    >
      {ui}
    </VisibleFlowsContext.Provider>,
  );
}

describe('Visualization', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);
  const map = { 'route-8888': true };

  beforeEach(() => {
    mockUseVisibleVizNodes.mockReturnValue({ vizNodes: [mockVizNode], isResolving: false });
  });

  it('renders the root surface with default and custom class names', () => {
    const { container } = renderWithVisibleFlows(<Visualization className="my-viz" entities={[entity]} />, map);

    const surface = container.querySelector('.canvas-surface');
    expect(surface).toBeInTheDocument();
    expect(surface).toHaveClass('canvas-surface', 'my-viz');
  });

  it('passes vizNodes from useVisibleVizNodes and entitiesCount to Canvas', () => {
    mockUseVisibleVizNodes.mockReturnValue({ vizNodes: [mockVizNode, mockVizNode], isResolving: false });

    renderWithVisibleFlows(<Visualization entities={[entity, entity]} />, map);

    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas).toHaveAttribute('data-entities-count', '2');
    expect(canvas).toHaveAttribute('data-viz-nodes-length', '2');
    expect(canvas).toHaveAttribute('data-is-viz-nodes-resolving', 'false');
  });

  it('calls useVisibleVizNodes with the given entities and visible flow map from context', () => {
    renderWithVisibleFlows(<Visualization entities={[entity]} />, map);

    expect(mockUseVisibleVizNodes).toHaveBeenCalledWith([entity], map);
  });
});
