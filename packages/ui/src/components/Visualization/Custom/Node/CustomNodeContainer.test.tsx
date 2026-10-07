import { CatalogKind } from '@kaoto/editor-api';
import { render, screen } from '@testing-library/react';

import { createVisualizationNode, IVisualizationNode } from '../../../../models';
import { CustomNodeContainer } from './CustomNodeContainer';

const makeVizNode = (name: string, description: string) => {
  return createVisualizationNode(name, {
    name,
    path: name,
    isPlaceholder: false,
    isGroup: false,
    title: '',
    description,
    iconUrl: '',
  });
};

describe('CustomNodeContainer', () => {
  const createMockVizNode = (): IVisualizationNode =>
    ({
      id: 'test-node',
      data: {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'route.from.steps.0.log',
        description: 'Log component description',
        iconUrl: 'data:image/svg+xml;base64,test',
        iconAlt: 'log icon',
      },
    }) as unknown as IVisualizationNode;

  const MockProcessorIcon = () => <div data-testid="processor-icon">Processor</div>;

  const defaultContainerProps = {
    width: 90,
    height: 75,
    dataTestId: 'test-node',
    isCollapsed: true,
  };

  // --- Accessibility tests ---

  it('exposes the node icon as a labelled image landmark', () => {
    const vizNode = makeVizNode('log', 'Log step');

    render(
      <CustomNodeContainer
        width={75}
        height={75}
        dataTestId="test-node"
        vizNode={vizNode}
        isCollapsed={false}
        childCount={0}
        ProcessorIcon={null}
        isDisabled={false}
      />,
    );

    const imgEl = screen.getByRole('img', { name: 'Log step' });
    expect(imgEl).toBeInTheDocument();
  });

  it('falls back to node name when description is empty', () => {
    const vizNode = makeVizNode('timer', '');

    render(
      <CustomNodeContainer
        width={75}
        height={75}
        dataTestId="test-node"
        vizNode={vizNode}
        isCollapsed={false}
        childCount={0}
        ProcessorIcon={null}
        isDisabled={false}
      />,
    );

    const imgEl = screen.getByRole('img', { name: 'timer' });
    expect(imgEl).toBeInTheDocument();
  });

  it('should apply vizNode.data.description as aria-label on image container', () => {
    const vizNode = createMockVizNode();

    const { container } = render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        childCount={0}
        ProcessorIcon={null}
        processorDescription=""
        isDisabled={false}
      />,
    );

    const contentElement = container.querySelector('.custom-node__container__image');
    expect(contentElement).toHaveAttribute('aria-label', 'Log component description');
  });

  // --- Behavioral tests (restored from original) ---

  it('should render child count when childCount > 0', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        isCollapsed
        childCount={5}
        ProcessorIcon={null}
        processorDescription=""
        isDisabled={false}
      />,
    );

    const childCountElement = screen.getByTitle('5');
    expect(childCountElement).toBeInTheDocument();
    expect(childCountElement).toHaveTextContent('5');
  });

  it('should not render child count when isCollapsed is false', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        isCollapsed={false}
        childCount={5}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={false}
      />,
    );

    expect(screen.queryByTitle('5')).not.toBeInTheDocument();
  });

  it('should not render child count when childCount is 0', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        childCount={0}
        ProcessorIcon={null}
        processorDescription=""
        isDisabled={false}
      />,
    );

    expect(screen.queryByTitle('0')).not.toBeInTheDocument();
  });

  it('should render ProcessorIcon when provided', () => {
    const vizNode = createMockVizNode();
    const processorDescription = 'Test processor description';

    render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        childCount={0}
        ProcessorIcon={MockProcessorIcon}
        processorDescription={processorDescription}
        isDisabled={false}
      />,
    );

    const processorIcon = screen.getByTestId('processor-icon');
    expect(processorIcon).toBeInTheDocument();
    expect(processorIcon.closest('.step-icon__processor')).toBeInTheDocument();
  });

  it('should not render ProcessorIcon when null', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        childCount={0}
        ProcessorIcon={null}
        processorDescription=""
        isDisabled={false}
      />,
    );

    expect(screen.queryByTestId('processor-icon')).not.toBeInTheDocument();
  });

  it('should render disabled icon when isDisabled is true', () => {
    const vizNode = createMockVizNode();

    const { container } = render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        childCount={0}
        ProcessorIcon={null}
        processorDescription=""
        isDisabled
      />,
    );

    expect(container.querySelector('.step-icon__disabled')).toBeInTheDocument();
  });

  it('should not render disabled icon when isDisabled is false', () => {
    const vizNode = createMockVizNode();

    const { container } = render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        childCount={0}
        ProcessorIcon={null}
        processorDescription=""
        isDisabled={false}
      />,
    );

    expect(container.querySelector('.step-icon__disabled')).not.toBeInTheDocument();
  });

  it('should render container with dataTestId and content together', () => {
    const vizNode = createMockVizNode();

    const { container } = render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        childCount={3}
        ProcessorIcon={MockProcessorIcon}
        processorDescription="Processor desc"
        isDisabled
      />,
    );

    expect(screen.getByTestId('test-node')).toBeInTheDocument();
    expect(screen.getByTitle('3')).toBeInTheDocument();
    expect(screen.getByTestId('processor-icon')).toBeInTheDocument();
    expect(container.querySelector('.step-icon__disabled')).toBeInTheDocument();
  });

  it('should render Layers icon when hasGroupChildren is true', () => {
    const vizNode = createMockVizNode();

    const { container } = render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        isCollapsed
        childCount={1}
        hasGroupChildren
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={false}
      />,
    );

    expect(container.querySelector('.step-icon-collection')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
