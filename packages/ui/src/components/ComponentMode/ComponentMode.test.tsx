import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Fragment, StrictMode } from 'react';
import { Mock, MockedFunction, vi } from 'vitest';

import { useProcessorTooltips } from '../../hooks/use-processor-tooltips.hook';
import { CatalogKind, IVisualizationNode } from '../../models';
import { createVisualizationNode } from '../../models/visualization/visualization-node';
import { Anchors } from '../registers/anchors';
import { RegisterComponents } from '../registers/RegisterComponents';
import { RenderingProvider } from '../RenderingAnchor/rendering.provider';
import { RenderingAnchor } from '../RenderingAnchor/RenderingAnchor';
import { ComponentMode } from './ComponentMode';

let mockUpdateSourceCodeFromEntities: Mock;
vi.mock('../../hooks/useEntityContext/useEntityContext', () => ({
  useEntityContext: () => ({ updateSourceCodeFromEntities: mockUpdateSourceCodeFromEntities }),
}));

vi.mock('../../hooks/use-processor-tooltips.hook', () => ({
  useProcessorTooltips: vi.fn(),
}));

const mockUseProcessorTooltips = useProcessorTooltips as MockedFunction<typeof useProcessorTooltips>;

describe('ComponentMode', () => {
  beforeEach(() => {
    mockUpdateSourceCodeFromEntities = vi.fn();
    // Set default tooltips before each test
    mockUseProcessorTooltips.mockReturnValue({
      to: 'To: Sends messages to an endpoint',
      toD: 'ToD: Sends messages to a dynamic endpoint',
      poll: 'Poll: Polls messages from an endpoint',
    });
  });

  const getMockVizNode = (processorName = 'to'): IVisualizationNode => {
    const node = createVisualizationNode(`route.from.steps.0.${processorName}`, {
      name: processorName,
      path: `route.from.steps.0.${processorName}`,
      primaryNodeId: { name: processorName, catalogKind: CatalogKind.Pattern },
      isPlaceholder: false,
      isGroup: false,
      title: '',
      description: '',
      iconUrl: '',
    });
    vi.spyOn(node, 'updateModel').mockImplementation(vi.fn());
    (node as IVisualizationNode).data.definition = {};
    return node;
  };

  it('renders the three toggle buttons', async () => {
    const wrapper = render(<ComponentMode vizNode={getMockVizNode('to')} />);

    expect(await wrapper.findByText('Static')).toBeInTheDocument();
    expect(await wrapper.findByText('Dynamic')).toBeInTheDocument();
    expect(await wrapper.findByText('Poll')).toBeInTheDocument();
  });

  it.each([false, true])(
    'renders one Avro mode toolbar across rerenders and remounts (StrictMode: %s)',
    async (strict) => {
      const Wrapper = strict ? StrictMode : Fragment;
      const vizNode = getMockVizNode('to');
      vizNode.data.definition = { uri: 'avro:localhost:1234' };
      const content = (showPanel: boolean, registrationKey = 'initial') => (
        <Wrapper>
          <RenderingProvider>
            <RegisterComponents key={registrationKey}>
              {showPanel && <RenderingAnchor anchorTag={Anchors.CanvasFormHeader} vizNode={vizNode} />}
            </RegisterComponents>
          </RenderingProvider>
        </Wrapper>
      );
      const wrapper = render(content(false));

      for (const registrationKey of ['initial', 'initial', 'remounted']) {
        wrapper.rerender(content(true, registrationKey));

        expect(await wrapper.findAllByRole('group', { name: 'Component Mode Toggle Group' })).toHaveLength(1);
        expect(wrapper.getAllByRole('button', { name: /static/i })).toHaveLength(1);
        expect(wrapper.getAllByRole('button', { name: /dynamic/i })).toHaveLength(1);
        expect(wrapper.getAllByRole('button', { name: /poll/i })).toHaveLength(1);
      }
    },
  );

  it('should not call updateSourceCodeFromEntities if there is no VizNode', () => {
    render(<ComponentMode vizNode={undefined} />);

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('should not call updateSourceCodeFromEntities if we are switching to the same EIP', async () => {
    const user = userEvent.setup();
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await user.click(toButton);

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('should not call updateSourceCodeFromEntities if the vizNode does not contain a path', async () => {
    const user = userEvent.setup();
    const vizNode = getMockVizNode('to');
    vizNode.data.path = undefined;
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await user.click(toButton);

    expect(mockUpdateSourceCodeFromEntities).not.toHaveBeenCalled();
  });

  it('calls updateModel when switching from "to" to "poll"', async () => {
    const user = userEvent.setup();
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const pollButton = wrapper.getByText('Poll');
    expect(pollButton).toBeInTheDocument();

    await user.click(pollButton);

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.poll');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateModel when switching from "to" to "toD"', async () => {
    const user = userEvent.setup();
    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toDButton = wrapper.getByText('Dynamic');
    expect(toDButton).toBeInTheDocument();

    await user.click(toDButton);

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.toD');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateModel when switching from "poll" to "to"', async () => {
    const user = userEvent.setup();
    const vizNode = getMockVizNode('poll');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await user.click(toButton);

    expect(vizNode.updateModel).toHaveBeenCalledWith(undefined);
    expect(vizNode.data.path).toBe('route.from.steps.0.to');
    expect(vizNode.updateModel).toHaveBeenCalledTimes(2);
  });

  it('calls updateSourceCodeFromEntities when switching from "poll" to "to"', async () => {
    const user = userEvent.setup();
    const vizNode = getMockVizNode('poll');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    const toButton = wrapper.getByText('Static');
    expect(toButton).toBeInTheDocument();

    await user.click(toButton);

    expect(mockUpdateSourceCodeFromEntities).toHaveBeenCalled();
  });

  it('should render buttons even when tooltips are empty', async () => {
    // Override tooltips with empty strings for this test
    mockUseProcessorTooltips.mockReturnValue({
      to: '',
      toD: '',
      poll: '',
    });

    const vizNode = getMockVizNode('to');
    const wrapper = render(<ComponentMode vizNode={vizNode} />);

    // Buttons should still render with empty tooltips
    const toButton = await wrapper.findByRole('button', { name: /static/i });
    const toDButton = await wrapper.findByRole('button', { name: /dynamic/i });
    const pollButton = await wrapper.findByRole('button', { name: /poll/i });

    expect(toButton).toBeInTheDocument();
    expect(toDButton).toBeInTheDocument();
    expect(pollButton).toBeInTheDocument();
  });
});
