import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';

import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomGroup } from './CustomGroup';

jest.mock('../Node/CustomNode', () => ({
  CustomNodeWithSelection: ({ element }: { element: { getId: () => string } }) => (
    <div data-testid="custom-node-collapsed">{element.getId?.() ?? 'collapsed'}</div>
  ),
}));

jest.mock('./CustomGroupExpanded', () => ({
  CustomGroupExpanded: ({ element }: { element: { getId: () => string } }) => (
    <div data-testid="custom-group-expanded">{element.getId?.() ?? 'expanded'}</div>
  ),
}));

describe('CustomGroup', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw when element is not a Node', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<CustomGroup element={edgeElement} />);
      });
    }).toThrow('CustomGroup must be used only on Node elements');
  });

  it('should render CustomNodeWithSelection when group is collapsed', () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    element.setCollapsed(true);

    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomGroup element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(screen.getByTestId('custom-node-collapsed')).toBeInTheDocument();
  });

  it('should render CustomGroupExpanded when group is expanded', () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setParent(parentElement);
    element.setCollapsed(false);

    const { Provider } = TestProvidersWrapper();

    render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomGroup element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(screen.getByTestId('custom-group-expanded')).toBeInTheDocument();
  });
});
