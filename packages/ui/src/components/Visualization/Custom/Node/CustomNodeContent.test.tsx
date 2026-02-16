import { render, screen } from '@testing-library/react';

import { CatalogKind, IVisualizationNode } from '../../../../models';
import { CustomNodeContent } from './CustomNodeContent';

jest.mock('../../../IconResolver', () => ({
  IconResolver: ({ alt, catalogKind, name }: { alt?: string; catalogKind: CatalogKind; name: string }) => (
    <div data-testid="icon-resolver" data-alt={alt} data-catalog-kind={catalogKind} data-name={name} />
  ),
}));

jest.mock('../../../RenderingAnchor/RenderingAnchor', () => ({
  RenderingAnchor: ({ anchorTag }: { anchorTag: string }) => (
    <div data-testid="rendering-anchor" data-anchor={anchorTag} />
  ),
}));

describe('NodeContent', () => {
  const createMockVizNode = (): IVisualizationNode => {
    return {
      id: 'test-node',
      data: {
        catalogKind: CatalogKind.Component,
        name: 'log',
        path: 'route.from.steps.0.log',
      },
    } as unknown as IVisualizationNode;
  };

  const MockProcessorIcon = () => <div data-testid="processor-icon">Processor</div>;

  it('should render IconResolver with correct props', () => {
    const vizNode = createMockVizNode();
    const tooltipContent = 'Test tooltip';

    render(
      <CustomNodeContent
        vizNode={vizNode}
        tooltipContent={tooltipContent}
        childCount={0}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={false}
      />,
    );

    const iconResolver = screen.getByTestId('icon-resolver');
    expect(iconResolver).toBeInTheDocument();
    expect(iconResolver).toHaveAttribute('data-catalog-kind', CatalogKind.Component);
    expect(iconResolver).toHaveAttribute('data-name', 'log');
    expect(iconResolver).toHaveAttribute('data-alt', tooltipContent);
  });

  it('should render child count when childCount > 0', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContent
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
      <CustomNodeContent
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
      <CustomNodeContent
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
    // The title is passed as a prop to ProcessorIcon component
    expect(processorIcon.closest('.step-icon__processor')).toBeInTheDocument();
  });

  it('should not render ProcessorIcon when null', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContent
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

    render(
      <CustomNodeContent
        vizNode={vizNode}
        tooltipContent={undefined}
        childCount={0}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={true}
      />,
    );

    const disabledIcon = screen.getByRole('img', { hidden: true });
    expect(disabledIcon).toBeInTheDocument();
    expect(disabledIcon.closest('.step-icon__disabled')).toBeInTheDocument();
  });

  it('should not render disabled icon when isDisabled is false', () => {
    const vizNode = createMockVizNode();

    const { container } = render(
      <CustomNodeContent
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

  it('should apply tooltipContent as title attribute', () => {
    const vizNode = createMockVizNode();
    const tooltipContent = 'Custom tooltip text';

    const { container } = render(
      <CustomNodeContent
        vizNode={vizNode}
        tooltipContent={tooltipContent}
        childCount={0}
        ProcessorIcon={null}
        processorDescription={undefined}
        isDisabled={false}
      />,
    );

    const containerElement = container.querySelector('.custom-node__container__image');
    expect(containerElement).toHaveAttribute('title', tooltipContent);
  });

  it('should render all elements together when all props are provided', () => {
    const vizNode = createMockVizNode();

    render(
      <CustomNodeContent
        vizNode={vizNode}
        tooltipContent="Full tooltip"
        childCount={3}
        ProcessorIcon={MockProcessorIcon}
        processorDescription="Processor desc"
        isDisabled={true}
      />,
    );

    expect(screen.getByTestId('icon-resolver')).toBeInTheDocument();
    expect(screen.getByTitle('3')).toBeInTheDocument();
    expect(screen.getByTestId('processor-icon')).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    expect(screen.getByTestId('rendering-anchor')).toBeInTheDocument();
  });
});
