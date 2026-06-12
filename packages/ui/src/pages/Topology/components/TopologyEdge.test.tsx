import { getClosestVisibleParent, Point } from '@patternfly/react-topology';
import { render } from '@testing-library/react';

import { TopologyEdge } from './TopologyEdge';

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return {
    ...actual,
    isEdge: () => true,
    getClosestVisibleParent: jest.fn(),
  };
});

const mockGetClosestVisibleParent = getClosestVisibleParent as jest.Mock;

const mockEdgeElement = (overrides?: {
  startPoint?: Point;
  endPoint?: Point;
  bendpoints?: Point[];
  source?: unknown;
  target?: unknown;
}) =>
  ({
    getStartPoint: () => overrides?.startPoint ?? new Point(0, 0),
    getEndPoint: () => overrides?.endPoint ?? new Point(100, 100),
    getBendpoints: () => overrides?.bendpoints ?? [new Point(50, 0), new Point(50, 100)],
    getSource: () => overrides?.source ?? {},
    getTarget: () => overrides?.target ?? {},
  }) as never;

const renderInSvg = (ui: React.ReactNode) => render(<svg>{ui}</svg>);

describe('TopologyEdge', () => {
  beforeEach(() => {
    mockGetClosestVisibleParent.mockReset();
  });

  it('renders background path, body path and a connector arrow when source and target are visible', () => {
    mockGetClosestVisibleParent.mockReturnValue({ isCollapsed: () => false });

    const { container } = renderInSvg(<TopologyEdge element={mockEdgeElement()} />);

    expect(container.querySelector('.custom-edge')).toBeInTheDocument();
    expect(container.querySelector('.custom-edge__background')).toBeInTheDocument();
    expect(container.querySelector('.custom-edge__body')).toBeInTheDocument();
    expect(container.querySelector('.custom-edge__connector')).toBeInTheDocument();
  });

  it('returns null when source and target share a collapsed parent (edge inside a collapsed group)', () => {
    const parent = { isCollapsed: () => true };
    mockGetClosestVisibleParent.mockReturnValue(parent);

    const { container } = renderInSvg(<TopologyEdge element={mockEdgeElement()} />);

    expect(container.querySelector('.custom-edge')).not.toBeInTheDocument();
  });

  it('still draws the edge when source and target have different parents (cross-route edge)', () => {
    const parentA = { isCollapsed: () => true };
    const parentB = { isCollapsed: () => true };
    mockGetClosestVisibleParent.mockReturnValueOnce(parentA).mockReturnValueOnce(parentB);

    const { container } = renderInSvg(<TopologyEdge element={mockEdgeElement()} />);

    expect(container.querySelector('.custom-edge')).toBeInTheDocument();
  });

  it('generates a straight-line path when the edge has no bendpoints', () => {
    mockGetClosestVisibleParent.mockReturnValue({ isCollapsed: () => false });

    const { container } = renderInSvg(
      <TopologyEdge
        element={mockEdgeElement({
          startPoint: new Point(10, 20),
          endPoint: new Point(110, 20),
          bendpoints: [],
        })}
      />,
    );

    const body = container.querySelector('.custom-edge__body');
    expect(body).not.toBeNull();
    // Direct line: M10 20 L110 20 (no bezier curves needed).
    expect(body!.getAttribute('d')).toBe('M10 20 L110 20');
    expect(container.querySelector('.custom-edge__connector')).not.toBeNull();
  });
});
