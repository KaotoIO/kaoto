import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render } from '@testing-library/react';

import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomEdge } from './CustomEdge';

describe('CustomEdge', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should throw an error if not used on Edge elements', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const NodeElement = new BaseNode();

    expect(() => {
      act(() => {
        render(<CustomEdge element={NodeElement} />);
      });
    }).toThrow('EdgeEndWithButton must be used only on Edge elements');
  });

  it('should render without error', () => {
    const parentElement = new BaseGraph();
    const element = new BaseEdge();
    const edgeSource = new BaseNode();
    const edgeTarget = new BaseNode();
    edgeSource.setParent(parentElement);
    edgeTarget.setParent(parentElement);
    element.setSource(edgeSource);
    element.setTarget(edgeTarget);
    const controller = ControllerService.createController();
    parentElement.setController(controller);
    element.setController(controller);
    element.setParent(parentElement);
    element.setStartPoint(0, 0);
    element.setEndPoint(100, 100);

    const { Provider } = TestProvidersWrapper();

    const wrapper = render(
      <Provider>
        <VisualizationProvider controller={controller}>
          <ElementContext.Provider value={element}>
            <CustomEdge element={element} />
          </ElementContext.Provider>
        </VisualizationProvider>
      </Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
