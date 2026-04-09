import { render, screen } from '@testing-library/react';

import { CatalogKind, IVisualizationNode } from '../../../../models';
import { CustomNodeContainer } from './CustomNodeContainer';

describe('CustomNodeContainer', () => {
  const createMockVizNode = (): IVisualizationNode =>
    ({
      id: 'test-node',
      data: {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'route.from.steps.0.log',
      },
    }) as unknown as IVisualizationNode;

  const MockProcessorIcon = () => <div data-testid="processor-icon">Processor</div>;

  const defaultContainerProps = {
    width: 90,
    height: 75,
    dataTestId: 'test-node',
  };

  it('should render the CustomNodeContainer correctly', () => {
    const vizNode = createMockVizNode();
    const tooltipContent = 'Test tooltip';

    const { container } = render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        tooltipContent={tooltipContent}
        childCount={1}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={true}
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render child count when childCount > 0', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        tooltipContent={undefined}
        childCount={5}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={false}
      />,
    );

    const childCountElement = screen.getByTitle('5');
    expect(childCountElement).toBeInTheDocument();
    expect(childCountElement).toHaveTextContent('5');
  });

  it('should not render child count when childCount is 0', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        tooltipContent={undefined}
        childCount={0}
        ProcessorIcon={null}
        processorDescription={undefined}
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
        tooltipContent={undefined}
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
        tooltipContent={undefined}
        childCount={0}
        ProcessorIcon={null}
        processorDescription={undefined}
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
        tooltipContent={undefined}
        childCount={0}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={true}
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
        tooltipContent={undefined}
        childCount={0}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={false}
      />,
    );

    expect(container.querySelector('.step-icon__disabled')).not.toBeInTheDocument();
  });

  it('should apply tooltipContent as title attribute on content', () => {
    const vizNode = createMockVizNode();
    const tooltipContent = 'Custom tooltip text';

    const { container } = render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        tooltipContent={tooltipContent}
        childCount={0}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={false}
      />,
    );

    const contentElement = container.querySelector('.custom-node__container__image');
    expect(contentElement).toHaveAttribute('title', tooltipContent);
  });

  it('should render container with dataTestId and content together', () => {
    const vizNode = createMockVizNode();

    const { container } = render(
      <CustomNodeContainer
        {...defaultContainerProps}
        vizNode={vizNode}
        tooltipContent="Full tooltip"
        childCount={3}
        ProcessorIcon={MockProcessorIcon}
        processorDescription="Processor desc"
        isDisabled={true}
      />,
    );

    expect(screen.getByTestId('test-node')).toBeInTheDocument();
    expect(screen.getByTitle('3')).toBeInTheDocument();
    expect(screen.getByTestId('processor-icon')).toBeInTheDocument();
    expect(container.querySelector('.step-icon__disabled')).toBeInTheDocument();
  });
});
