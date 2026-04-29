import { act, render } from '@testing-library/react';

import { useProcessorTooltips } from '../../hooks/use-processor-tooltips.hook';
import { IVisualizationNode } from '../../models';
import { ComponentMode } from './ComponentMode';

let mockUpdateSourceCodeFromEntities: jest.Mock;
jest.mock('../../hooks/useEntityContext/useEntityContext', () => ({
  useEntityContext: () => ({ updateSourceCodeFromEntities: mockUpdateSourceCodeFromEntities }),
}));

jest.mock('../../hooks/use-processor-tooltips.hook', () => ({
  useProcessorTooltips: jest.fn(),
}));

const mockUseProcessorTooltips = useProcessorTooltips as jest.MockedFunction<typeof useProcessorTooltips>;

describe('ComponentMode', () => {
  beforeEach(() => {
    mockUpdateSourceCodeFromEntities = jest.fn();
    // Set default tooltips before each test
    mockUseProcessorTooltips.mockReturnValue({
      to: 'To: Sends messages to an endpoint',
      toD: 'ToD: Sends messages to a dynamic endpoint',
      poll: 'Poll: Polls messages from an endpoint',
    });
  });

  const getMockVizNode = (processorName = 'to'): IVisualizationNode => {
    return {
      data: { processorName, path: `route.from.steps.0.${processorName}` },
      getNodeSchema: () => undefined,
      getNodeDefinition: () => ({}),
      updateModel: jest.fn(),
    } as unknown as IVisualizationNode;
  };

  it('renders the three toggle buttons', () => {
    const wrapper = render(<ComponentMode vizNode={getMockVizNode('to')} />);

    expect(wrapper.getByText('Static')).toBeInTheDocument();
    expect(wrapper.getByText('Dynamic')).toBeInTheDocument();
    expect(wrapper.getByText('Poll')).toBeInTheDocument();
  });

  it('should not call updateSourceCodeFromEntities if there is no VizNode', () => {
    render(<ComponentMode vizNode={undefined} />);

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('should not call updateSourceCodeFromEntities if we are switching to the same EIP', async () => {
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await act(async () => {
      toButton.click();
    });

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('should not call updateSourceCodeFromEntities if the vizNode does not contain a path', async () => {
    const vizNode = getMockVizNode('to');
    vizNode.data.path = undefined;
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await act(async () => {
      toButton.click();
    });

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('calls updateModel when switching from "to" to "poll"', async () => {
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const pollButton = wrapper.getByText('Poll');
    expect(pollButton).toBeInTheDocument();

    await act(async () => {
      pollButton.click();
    });

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.poll');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateModel when switching from "to" to "toD"', async () => {
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toDButton = wrapper.getByText('Dynamic');
    expect(toDButton).toBeInTheDocument();

    await act(async () => {
      toDButton.click();
    });

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.toD');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateModel when switching from "poll" to "to"', async () => {
    const vizNode = getMockVizNode('poll');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await act(async () => {
      toButton.click();
    });

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.to');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateSourceCodeFromEntities when switching from "poll" to "to"', async () => {
    const vizNode = getMockVizNode('poll');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await act(async () => {
      toButton.click();
    });

    expect(mockUpdateSourceCodeFromEntities).toHaveBeenCalled();
  });

  it('should render buttons even when tooltips are empty', () => {
    // Override tooltips with empty strings for this test
    mockUseProcessorTooltips.mockReturnValue({
      to: '',
      toD: '',
      poll: '',
    });

    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    // Buttons should still render with empty tooltips
    const toButton = wrapper.getByRole('button', { name: /static/i });
    const toDButton = wrapper.getByRole('button', { name: /dynamic/i });
    const pollButton = wrapper.getByRole('button', { name: /poll/i });

    expect(toButton).toBeInTheDocument();
    expect(toDButton).toBeInTheDocument();
    expect(pollButton).toBeInTheDocument();
  });
});
