import { ElementModel, GraphElement } from '@patternfly/react-topology';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { CanvasNode } from '../../components/Visualization/Canvas/canvas.models';
import { IVisualizationNode } from '../../models/visualization/base-visual-entity';
import { VisualFlowsApi } from '../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext, VisibleFlowsContextResult } from '../../providers';
import { topologyContextMenuFn } from './topology-context-menu';

type MenuElement = GraphElement<ElementModel, CanvasNode['data']>;

const buildVisibleFlowsContext = (dispatch: jest.Mock): VisibleFlowsContextResult => ({
  visibleFlows: { 'route-1234': true, 'route-5678': true },
  allFlowsVisible: true,
  visualFlowsApi: new VisualFlowsApi(dispatch),
});

const mockElement = (vizNode: Partial<IVisualizationNode> | undefined): MenuElement =>
  ({
    getData: () => (vizNode ? { vizNode: vizNode as IVisualizationNode } : ({} as CanvasNode['data'])),
  }) as MenuElement;

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const renderItems = (items: ReturnType<typeof topologyContextMenuFn>, dispatch: jest.Mock) =>
  render(
    <MemoryRouter initialEntries={['/topology']}>
      <VisibleFlowsContext.Provider value={buildVisibleFlowsContext(dispatch)}>
        <Routes>
          <Route path="/topology" element={<>{items}</>} />
          <Route path="/" element={<LocationProbe />} />
        </Routes>
      </VisibleFlowsContext.Provider>
    </MemoryRouter>,
  );

describe('topologyContextMenuFn', () => {
  it('returns an empty array when the element has no vizNode', () => {
    expect(topologyContextMenuFn(mockElement(undefined))).toEqual([]);
  });

  it('returns a single Open menu item for a vizNode', () => {
    const items = topologyContextMenuFn(mockElement({ getId: () => 'route-1234' } as Partial<IVisualizationNode>));
    expect(items).toHaveLength(1);
  });

  it('clicking Open hides every other flow, shows only this one and navigates Home', () => {
    const dispatch = jest.fn();
    const items = topologyContextMenuFn(mockElement({ getId: () => 'route-1234' } as Partial<IVisualizationNode>));
    const { getByText, getByTestId } = renderItems(items, dispatch);

    fireEvent.click(getByText('Open'));

    // Order matters: hide all flows first, then re-show the producer.
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'hideFlows', flowIds: undefined });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'showFlows', flowIds: ['route-1234'] });
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(getByTestId('location').textContent).toBe('/');
  });

  it('does nothing when the vizNode has no id', () => {
    const dispatch = jest.fn();
    const items = topologyContextMenuFn(mockElement({ getId: () => undefined } as Partial<IVisualizationNode>));
    const { getByText } = renderItems(items, dispatch);

    fireEvent.click(getByText('Open'));

    expect(dispatch).not.toHaveBeenCalled();
  });
});
