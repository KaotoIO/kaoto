import { render } from '@testing-library/react';

import { TopologyNodeLabel } from './TopologyNodeLabel';

const renderInSvg = (ui: React.ReactNode) => render(<svg>{ui}</svg>);

describe('TopologyNodeLabel', () => {
  it('renders the label inside a foreignObject', () => {
    const { container } = renderInSvg(<TopologyNodeLabel label="my-route" nodeWidth={90} nodeHeight={75} />);

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject).toBeInTheDocument();
    expect(foreignObject?.textContent).toBe('my-route');
  });

  it('returns null and renders nothing when the label is empty', () => {
    const { container } = renderInSvg(<TopologyNodeLabel label="" nodeWidth={90} nodeHeight={75} />);

    expect(container.querySelector('foreignObject')).not.toBeInTheDocument();
  });

  it('positions the label centered horizontally and just below the node', () => {
    const { container } = renderInSvg(<TopologyNodeLabel label="abc" nodeWidth={120} nodeHeight={60} />);
    const foreignObject = container.querySelector('foreignObject');

    // labelX = (nodeWidth - DEFAULT_LABEL_WIDTH) / 2 with DEFAULT_LABEL_WIDTH=150 → -15
    expect(foreignObject?.getAttribute('x')).toBe('-15');
    // y = nodeHeight - 1
    expect(foreignObject?.getAttribute('y')).toBe('59');
  });

  it('exposes the label as a hover title for tooltips', () => {
    const { getByTitle } = renderInSvg(<TopologyNodeLabel label="hover-me" nodeWidth={90} nodeHeight={75} />);
    expect(getByTitle('hover-me')).toBeInTheDocument();
  });
});
