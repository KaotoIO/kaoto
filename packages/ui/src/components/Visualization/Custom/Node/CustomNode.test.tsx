import { BaseEdge, BaseGraph, BaseNode, ElementContext, VisualizationProvider } from '@patternfly/react-topology';
import { act, render } from '@testing-library/react';
import { TestProvidersWrapper } from '../../../../stubs';
import { ControllerService } from '../../Canvas/controller.service';
import { CustomNodeObserver, getDragAndDropDirection } from './CustomNode';
import { IVisualizationNode } from '../../../../models/visualization';

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

describe('getDragAndDropDirection', () => {
  const getMockVizNode = (path: string): IVisualizationNode => {
    return {
      data: { path: path },
      getId: jest.fn(),
    } as unknown as IVisualizationNode;
  };
  const vizNode1 = getMockVizNode('route.from.steps.0.log');
  const vizNode2 = getMockVizNode('route.from.steps.2.setHeader');

  it('should return the forward based on the path', () => {
    (vizNode1.getId as jest.Mock).mockReturnValue('route1');
    (vizNode2.getId as jest.Mock).mockReturnValue('route1');

    const result = getDragAndDropDirection(vizNode1, vizNode2);
    expect(result).toBe('forward');
  });

  it('should return the backward based on the path', () => {
    (vizNode1.getId as jest.Mock).mockReturnValue('route1');
    (vizNode2.getId as jest.Mock).mockReturnValue('route1');
    const result = getDragAndDropDirection(vizNode2, vizNode1);
    expect(result).toBe('backward');
  });

  it('should return the forward based on the entity id', () => {
    (vizNode1.getId as jest.Mock).mockReturnValue('route1');
    (vizNode2.getId as jest.Mock).mockReturnValue('route2');
    const result = getDragAndDropDirection(vizNode2, vizNode1);
    expect(result).toBe('forward');
  });
});
