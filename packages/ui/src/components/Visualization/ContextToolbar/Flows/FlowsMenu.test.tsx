import { act, fireEvent, render } from '@testing-library/react';
import { EntitiesContextResult } from '../../../../hooks';
import { SourceSchemaType } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { IVisibleFlows } from '../../../../models/visualization/flows/support/flows-visibility';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { VisibleFLowsContextResult, VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { FlowsMenu } from './FlowsMenu';

const FlowsMenuWithContext: React.FunctionComponent<{
  visibleFlows?: IVisibleFlows;
}> = ({ visibleFlows }) => {
  const visFlows = { ['entity1']: true, ['entity2']: false };

  const entContextValue = {
    currentSchemaType: SourceSchemaType.Integration,
    visualEntities: [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity],
  } as unknown as EntitiesContextResult;

  return (
    <EntitiesContext.Provider value={entContextValue as unknown as EntitiesContextResult}>
      <VisibleFlowsContext.Provider
        value={{ visibleFlows: visibleFlows ?? visFlows } as unknown as VisibleFLowsContextResult}
      >
        <FlowsMenu />
      </VisibleFlowsContext.Provider>
    </EntitiesContext.Provider>
  );
};

describe('FlowsMenu.tsx', () => {
  it('should open the flows list when clicking the dropdown', async () => {
    const wrapper = render(<FlowsMenuWithContext />);
    const dropdown = await wrapper.findByTestId('flows-list-dropdown');

    /** Open List */
    act(() => {
      fireEvent.click(dropdown);
    });

    /** Wait for the List to appear */
    await act(async () => {
      const flowsList = wrapper.queryByTestId('flows-list-table');
      expect(flowsList).toBeInTheDocument();
    });
  });

  it('should open the flows list when clicking the action button', async () => {
    const wrapper = render(<FlowsMenuWithContext />);
    const dropdown = await wrapper.findByTestId('flows-list-btn');

    /** Open List */
    act(() => {
      fireEvent.click(dropdown);
    });

    /** Wait for the List to appear */
    await act(async () => {
      const flowsList = wrapper.queryByTestId('flows-list-table');
      expect(flowsList).toBeInTheDocument();
    });
  });

  it('should close the flows list when pressing ESC', async () => {
    const wrapper = render(<FlowsMenuWithContext />);
    const dropdown = await wrapper.findByTestId('flows-list-btn');

    /** Open List */
    act(() => {
      fireEvent.click(dropdown);
    });

    const flowsList = await wrapper.findByTestId('flows-list-table');
    /** Press Escape key to close the menu */
    act(() => {
      fireEvent.focus(flowsList);
      fireEvent.keyDown(flowsList, { key: 'Escape', code: 'Escape', charCode: 27 });
    });

    /** Wait for the List to appear */
    await act(async () => {
      expect(flowsList).not.toBeInTheDocument();
    });
  });

  it('should render the route id when a single route is visible', async () => {
    const wrapper = render(<FlowsMenuWithContext />);
    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('entity1');
  });

  it('should NOT render the route id but "Routes" when there is no flow visible', async () => {
    const wrapper = render(<FlowsMenuWithContext visibleFlows={{ ['entity1']: false, ['entity2']: false }} />);
    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('Routes');
  });

  it('should NOT render the route id but "Routes" when there is more than 1 flow visible', async () => {
    const wrapper = render(<FlowsMenuWithContext visibleFlows={{ ['entity1']: true, ['entity2']: true }} />);
    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('Routes');
  });

  it('should render the visible routes count', async () => {
    const wrapper = render(<FlowsMenuWithContext visibleFlows={{ ['entity1']: true, ['entity2']: true }} />);
    const routeCount = await wrapper.findByTestId('flows-list-route-count');
    expect(routeCount).toHaveTextContent('2/2');
  });
});
