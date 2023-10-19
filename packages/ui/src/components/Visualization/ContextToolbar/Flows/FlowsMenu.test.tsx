import { FlowsMenu } from './FlowsMenu';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { SourceSchemaType } from '../../../../models/camel';
import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { EntitiesContextResult } from '../../../../hooks';
import { EntitiesContext } from '../../../../providers/entities.provider';

const getContextValue = () => {
  return {
    currentSchemaType: SourceSchemaType.Integration,
    visualEntities: [{ id: 'entity1' } as CamelRouteVisualEntity, { id: 'entity2' } as CamelRouteVisualEntity],
    visibleFlows: { ['entity1']: true, ['entity2']: false },
  };
};
let contextValue = getContextValue();
const renderWithContext = () => {
  return render(
    <EntitiesContext.Provider value={contextValue as unknown as EntitiesContextResult}>
      <FlowsMenu />
    </EntitiesContext.Provider>,
  );
};

describe('FlowsMenu.tsx', () => {
  test('should open the flows list when clicking the dropdown', async () => {
    const wrapper = renderWithContext();
    const dropdown = await wrapper.findByTestId('flows-list-dropdown');

    /** Open List */
    act(() => {
      fireEvent.click(dropdown);
    });

    /** Wait for the List to appear */
    waitFor(() => {
      const flowsList = wrapper.queryByTestId('flows-list-table');
      expect(flowsList).toBeInTheDocument();
    });
  });
  //
  test('should open the flows list when clicking the action button', async () => {
    const wrapper = renderWithContext();
    const dropdown = await wrapper.findByTestId('flows-list-btn');

    /** Open List */
    act(() => {
      fireEvent.click(dropdown);
    });

    /** Wait for the List to appear */
    waitFor(() => {
      const flowsList = wrapper.queryByTestId('flows-list-table');
      expect(flowsList).toBeInTheDocument();
    });
  });

  test('should close the flows list when pressing ESC', async () => {
    const wrapper = renderWithContext();
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
    waitFor(() => {
      expect(flowsList).not.toBeInTheDocument();
    });
  });

  test('should render the route id when a single route is visible', async () => {
    const wrapper = renderWithContext();
    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('entity1');
  });

  test('should NOT render the route id but "Routes" when there is no flow visible', async () => {
    contextValue = { ...contextValue, visibleFlows: { ['entity1']: false, ['entity2']: false } };
    const wrapper = renderWithContext();
    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('Routes');
  });

  test('should NOT render the route id but "Routes" when there is more than 1 flow visible', async () => {
    contextValue = { ...contextValue, visibleFlows: { ['entity1']: true, ['entity2']: true } };
    const wrapper = renderWithContext();
    const routeId = await wrapper.findByTestId('flows-list-route-id');

    expect(routeId).toHaveTextContent('Routes');
  });

  test('should render the visible routes count', async () => {
    const wrapper = renderWithContext();
    const routeCount = await wrapper.findByTestId('flows-list-route-count');
    expect(routeCount).toHaveTextContent('2/2');
  });
});
