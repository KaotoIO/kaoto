import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen } from '@testing-library/react';

import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomGroup } from './CustomGroup';

vi.mock('../Node/CustomNode', () => ({
  CustomNodeWithSelection: ({ element }: { element: { getId: () => string } }) => (
    <div data-testid="custom-node-collapsed">{element.getId?.() ?? 'collapsed'}</div>
  ),
}));

vi.mock('./CustomGroupExpanded', () => ({
  CustomGroupExpanded: ({ element }: { element: { getId: () => string } }) => (
    <div data-testid="custom-group-expanded">{element.getId?.() ?? 'expanded'}</div>
  ),
}));

describe('CustomGroup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw when element is not a Node', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<CustomGroup element={edgeElement} />);
      });
    }).toThrow('CustomGroup must be used only on Node elements');
  });

  it('should render CustomNodeWithSelection when group is collapsed', async () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    element.setCollapsed(true);

    const { Provider } = await TestProvidersWrapper();

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

  it('should render CustomGroupExpanded when group is expanded', async () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setParent(parentElement);
    element.setCollapsed(false);

    const { Provider } = await TestProvidersWrapper();

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
