import { render } from '@testing-library/react';
import { createVisualizationNode, IVisualizationNode } from '../../models';
import { RenderingAnchor } from './RenderingAnchor';
import { RenderingAnchorContext } from './rendering.provider';
import { IRegisteredValidatedComponent, IRenderingAnchorContext } from './rendering.provider.model';

describe('RenderingAnchor', () => {
  const anchorTag = 'example-anchor';
  const vizNode: IVisualizationNode = createVisualizationNode('example-node', {});
  let renderingAnchorContext: IRenderingAnchorContext;

  beforeEach(() => {
    renderingAnchorContext = {
      getRegisteredComponents: jest.fn().mockReturnValue([]),
      registerComponent: jest.fn(),
    };
  });

  it('should not render the `RenderingAnchor` when the `vizNode` prop is undefined', () => {
    const wrapper = render(<RenderingAnchor anchorTag={anchorTag} vizNode={undefined} />);

    expect(wrapper.container).toBeEmptyDOMElement();
  });

  it('should not render anything if there is no registered components for a given anchor', () => {
    const wrapper = render(
      <RenderingAnchorContext.Provider value={renderingAnchorContext}>
        <RenderingAnchor anchorTag={anchorTag} vizNode={vizNode} />
      </RenderingAnchorContext.Provider>,
    );

    expect(wrapper.container).toBeEmptyDOMElement();
  });

  it('should query the registered components by `anchorTag` and `vizNode`', () => {
    render(
      <RenderingAnchorContext.Provider value={renderingAnchorContext}>
        <RenderingAnchor anchorTag={anchorTag} vizNode={vizNode} />
      </RenderingAnchorContext.Provider>,
    );

    expect(renderingAnchorContext.getRegisteredComponents).toHaveBeenCalledWith(anchorTag, vizNode);
  });

  it('should render the registered components', () => {
    const registeredComponents: IRegisteredValidatedComponent[] = [
      { key: '1', Component: () => <p>Component 1</p> },
      { key: '2', Component: () => <p>Component 2</p> },
    ];
    renderingAnchorContext.getRegisteredComponents = jest.fn().mockReturnValue(registeredComponents);

    const wrapper = render(
      <RenderingAnchorContext.Provider value={renderingAnchorContext}>
        <RenderingAnchor anchorTag={anchorTag} vizNode={vizNode} />
      </RenderingAnchorContext.Provider>,
    );

    expect(wrapper.getByText('Component 1')).toBeInTheDocument();
    expect(wrapper.getByText('Component 2')).toBeInTheDocument();
  });
});
