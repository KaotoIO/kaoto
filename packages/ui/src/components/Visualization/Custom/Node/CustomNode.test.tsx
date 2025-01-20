import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render } from '@testing-library/react';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomNodeObserver } from './CustomNode';

describe('CustomNode', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw an error if not used on Node elements', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const edgeElement = new BaseEdge();

    expect(() => {
      act(() => {
        render(<CustomNodeObserver element={edgeElement} />);
      });
    }).toThrow('CustomNode must be used only on Node elements');
  });

  it('should render without error', () => {
    const parentElement = new BaseGraph();
    const element = new BaseNode();
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);

    const { Provider } = TestProvidersWrapper();

    const wrapper = render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomNodeObserver element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
