import { BaseEdge, BaseNode, EdgeTerminalType } from '@patternfly/react-topology';
import { render, screen } from '@testing-library/react';

import TopologyEdge from './TopologyEdge';

vi.mock('@patternfly/react-topology', async () => {
  const actual = await vi.importActual<typeof import('@patternfly/react-topology')>('@patternfly/react-topology');
  return {
    ...actual,
    TaskEdge: ({
      element,
      endTerminalType,
      nodeSeparation,
    }: {
      element: { getId?: () => string };
      endTerminalType: EdgeTerminalType;
      nodeSeparation: number;
    }) => (
      <div
        data-testid="mock-task-edge"
        data-element-id={element.getId?.() ?? ''}
        data-end-terminal-type={endTerminalType}
        data-node-separation={String(nodeSeparation)}
      />
    ),
  };
});

describe('TopologyEdge', () => {
  it('should throw when element is not an Edge', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const nodeElement = new BaseNode();

    expect(() => {
      render(<TopologyEdge element={nodeElement} />);
    }).toThrow('TopologyEdge must be used only on Edge elements');
  });

  it('should render TaskEdge with directional terminal and topology node separation', () => {
    const element = new BaseEdge();
    element.setId('edge-1');

    render(<TopologyEdge element={element} />);

    const edge = screen.getByTestId('mock-task-edge');
    expect(edge).toHaveAttribute('data-element-id', 'edge-1');
    expect(edge).toHaveAttribute('data-end-terminal-type', EdgeTerminalType.directional);
    expect(edge).toHaveAttribute('data-node-separation', '20');
  });
});
