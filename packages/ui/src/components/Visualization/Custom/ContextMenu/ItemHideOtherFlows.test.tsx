import { fireEvent, render } from '@testing-library/react';

import { CatalogKind, createVisualizationNode, IVisualizationNode } from '../../../../models';
import { EntityType } from '../../../../models/camel/entities';
import { VisualFlowsApi } from '../../../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext, VisibleFlowsContextResult } from '../../../../providers';
import { ItemHideOtherFlows } from './ItemHideOtherFlows';

describe('ItemHideOtherFlows', () => {
  let vizNode: IVisualizationNode;
  let dispatchSpy: jest.Mock;
  let visibleFlowsContext: VisibleFlowsContextResult;

  beforeEach(() => {
    vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
    jest.spyOn(vizNode, 'getId').mockReturnValue('route-1234');

    dispatchSpy = jest.fn();
    visibleFlowsContext = {
      allFlowsVisible: true,
      visibleFlows: {
        'route-1234': true,
        'route-5678': true,
        'route-9012': true,
      },
      visualFlowsApi: new VisualFlowsApi(dispatchSpy),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the "Hide rest" context menu item', () => {
    const wrapper = render(
      <VisibleFlowsContext.Provider value={visibleFlowsContext}>
        <ItemHideOtherFlows data-testid="context-menu-item-hide-rest" vizNode={vizNode} />
      </VisibleFlowsContext.Provider>,
    );

    const item = wrapper.getByText('Hide rest');
    expect(item).toBeInTheDocument();
  });

  it('should hide other flows and keep the current flow visible on click', () => {
    const wrapper = render(
      <VisibleFlowsContext.Provider value={visibleFlowsContext}>
        <ItemHideOtherFlows data-testid="context-menu-item-hide-rest" vizNode={vizNode} />
      </VisibleFlowsContext.Provider>,
    );

    fireEvent.click(wrapper.getByText('Hide rest'));

    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'hideFlows',
      flowIds: ['route-5678', 'route-9012'],
    });
    expect(dispatchSpy).toHaveBeenCalledWith({
      type: 'showFlows',
      flowIds: ['route-1234'],
    });
  });

  it('should not dispatch if flowId is undefined', () => {
    jest.spyOn(vizNode, 'getId').mockReturnValue(undefined);

    const wrapper = render(
      <VisibleFlowsContext.Provider value={visibleFlowsContext}>
        <ItemHideOtherFlows data-testid="context-menu-item-hide-rest" vizNode={vizNode} />
      </VisibleFlowsContext.Provider>,
    );

    fireEvent.click(wrapper.getByText('Hide rest'));

    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});
