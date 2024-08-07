import { ElementModel, GraphElement } from '@patternfly/react-topology';
import { render } from '@testing-library/react';
import { CanvasNode } from '../../Canvas';
import { NodeContextMenu } from './NodeContextMenu';
import { createVisualizationNode, IVisualizationNode, NodeInteraction } from '../../../../models';

describe('NodeContextMenu', () => {
  let element: GraphElement<ElementModel, CanvasNode['data']>;
  let vizNode: IVisualizationNode | undefined;
  let nodeInteractions: NodeInteraction;

  beforeEach(() => {
    nodeInteractions = {
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canReplaceStep: false,
      canRemoveStep: false,
      canRemoveFlow: false,
      canBeDisabled: false,
    };
    vizNode = createVisualizationNode('test', {});
    jest.spyOn(vizNode, 'getNodeInteraction').mockReturnValue(nodeInteractions);
    element = {
      getData: () => {
        return { vizNode } as CanvasNode['data'];
      },
    } as unknown as GraphElement<ElementModel, CanvasNode['data']>;
  });

  it('should render an empty component when there is no vizNode', () => {
    vizNode = undefined;
    const { container } = render(<NodeContextMenu element={element} />);

    expect(container).toMatchSnapshot();
  });

  it('should render a PrependStep item if canHavePreviousStep is true', () => {
    nodeInteractions.canHavePreviousStep = true;
    const wrapper = render(<NodeContextMenu element={element} />);

    const item = wrapper.getByTestId('context-menu-item-prepend');

    expect(item).toBeInTheDocument();
  });

  it('should render an AppendStep item if canHaveNextStep is true', () => {
    nodeInteractions.canHaveNextStep = true;
    const wrapper = render(<NodeContextMenu element={element} />);

    const item = wrapper.getByTestId('context-menu-item-append');

    expect(item).toBeInTheDocument();
  });

  it('should render an InsertStep item if canHaveChildren is true', () => {
    nodeInteractions.canHaveChildren = true;
    const wrapper = render(<NodeContextMenu element={element} />);

    const item = wrapper.getByTestId('context-menu-item-insert');

    expect(item).toBeInTheDocument();
  });

  it('should render an InsertSpecialStep item if canHaveSpecialChildren is true', () => {
    nodeInteractions.canHaveSpecialChildren = true;
    const wrapper = render(<NodeContextMenu element={element} />);

    const item = wrapper.getByTestId('context-menu-item-insert-special');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemDisableStep item if canBeDisabled is true', () => {
    nodeInteractions.canBeDisabled = true;
    const wrapper = render(<NodeContextMenu element={element} />);

    const item = wrapper.getByTestId('context-menu-item-disable');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemReplaceStep item if canReplaceStep is true', () => {
    nodeInteractions.canReplaceStep = true;
    const wrapper = render(<NodeContextMenu element={element} />);

    const item = wrapper.getByTestId('context-menu-item-replace');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemDeleteStep item if canRemoveStep is true', () => {
    nodeInteractions.canRemoveStep = true;
    const wrapper = render(<NodeContextMenu element={element} />);

    const item = wrapper.getByTestId('context-menu-item-delete');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemDeleteGroup item if canRemoveFlow is true', () => {
    nodeInteractions.canRemoveFlow = true;
    const wrapper = render(<NodeContextMenu element={element} />);

    const item = wrapper.getByTestId('context-menu-item-container-remove');

    expect(item).toBeInTheDocument();
  });
});
