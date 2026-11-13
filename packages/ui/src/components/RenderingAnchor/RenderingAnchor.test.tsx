import { act, render } from '@testing-library/react';
import { FunctionComponent, lazy } from 'react';

import { createVisualizationNode, IVisualizationNode } from '../../models';
import { RenderingAnchorContext } from './rendering.provider';
import { IRegisteredValidatedComponent, IRenderingAnchorContext } from './rendering.provider.model';
import { RenderingAnchor } from './RenderingAnchor';

describe('RenderingAnchor', () => {
  const anchorTag = 'example-anchor';
  const vizNode: IVisualizationNode = createVisualizationNode('example-node', {
    name: 'to',
    isPlaceholder: false,
    isGroup: false,
    iconUrl: '',
    title: '',
    description: '',
  });
  let renderingAnchorContext: IRenderingAnchorContext;

  beforeEach(() => {
    renderingAnchorContext = {
      getRegisteredComponents: vi.fn().mockReturnValue([]),
      registerComponent: vi.fn(),
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
    renderingAnchorContext.getRegisteredComponents = vi.fn().mockReturnValue(registeredComponents);

    const wrapper = render(
      <RenderingAnchorContext.Provider value={renderingAnchorContext}>
        <RenderingAnchor anchorTag={anchorTag} vizNode={vizNode} />
      </RenderingAnchorContext.Provider>,
    );

    expect(wrapper.getByText('Component 1')).toBeInTheDocument();
    expect(wrapper.getByText('Component 2')).toBeInTheDocument();
  });

  it('should show a small spinner in place of a lazy component while it loads, keeping the rest of the tree', async () => {
    let resolveComponent!: (module: { default: FunctionComponent }) => void;
    const LazyComponent = lazy(
      () =>
        new Promise<{ default: FunctionComponent }>((resolve) => {
          resolveComponent = resolve;
        }),
    );
    renderingAnchorContext.getRegisteredComponents = vi.fn().mockReturnValue([{ key: '1', Component: LazyComponent }]);

    const wrapper = render(
      <RenderingAnchorContext.Provider value={renderingAnchorContext}>
        <p>Canvas</p>
        <RenderingAnchor anchorTag={anchorTag} vizNode={vizNode} />
      </RenderingAnchorContext.Provider>,
    );

    expect(wrapper.getByText('Canvas')).toBeInTheDocument();
    expect(wrapper.getByRole('img', { name: 'Loading' })).toBeInTheDocument();

    await act(async () => {
      resolveComponent({ default: () => <p>Lazy component</p> });
    });

    expect(wrapper.getByText('Lazy component')).toBeInTheDocument();
    expect(wrapper.getByText('Canvas')).toBeInTheDocument();
    expect(wrapper.queryByRole('img', { name: 'Loading' })).not.toBeInTheDocument();
  });
});
