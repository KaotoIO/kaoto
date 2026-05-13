import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { render } from '@testing-library/react';

import { TopologySyntheticEndpoint } from './TopologySyntheticEndpoint';

jest.mock('@patternfly/react-topology', () => {
  const actual = jest.requireActual('@patternfly/react-topology');
  return { ...actual, isNode: () => true };
});

const mockNodeElement = (
  overrides: { label?: string; iconUrl?: string; bounds?: { width: number; height: number } } = {},
) =>
  ({
    getLabel: () => overrides.label ?? 'direct:foo',
    getData: () => ({ iconUrl: overrides.iconUrl ?? 'http://example.com/icon.svg' }),
    getBounds: () => overrides.bounds ?? { width: 90, height: 75 },
  }) as never;

const renderInSvg = (ui: React.ReactNode) => render(<svg>{ui}</svg>);

describe('TopologySyntheticEndpoint', () => {
  it('renders the label, icon image and badge in the route container layout', () => {
    const { container, getByTitle, getByAltText } = renderInSvg(
      <TopologySyntheticEndpoint
        element={mockNodeElement()}
        className="topology-external-endpoint"
        testIdPrefix="topology-external"
        titlePrefix="External endpoint"
        BadgeIcon={ExternalLinkAltIcon}
      />,
    );

    // Outer <g> with the kind-specific class and data-testid.
    const outer = container.querySelector<SVGGElement>('.topology-external-endpoint');
    expect(outer).toBeInTheDocument();
    expect(outer?.dataset.testid).toBe('topology-external__direct:foo');

    // Container tooltip uses the configured title prefix + label.
    expect(getByTitle('External endpoint: direct:foo')).toBeInTheDocument();

    // Routes-icon image rendered with the iconUrl from the node data.
    const img = getByAltText('direct:foo') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('http://example.com/icon.svg');

    // FloatingCircle badge with the kind-specific class.
    expect(container.querySelector('.topology-external-endpoint__badge')).toBeInTheDocument();
  });

  it('falls back to default node dimensions when getBounds() yields nothing', () => {
    const elementWithoutBounds = {
      getLabel: () => 'direct:foo',
      getData: () => ({ iconUrl: '' }),
      getBounds: () => undefined,
    } as never;

    const { container } = renderInSvg(
      <TopologySyntheticEndpoint
        element={elementWithoutBounds}
        className="topology-external-endpoint"
        testIdPrefix="topology-external"
        titlePrefix="External endpoint"
        BadgeIcon={ExternalLinkAltIcon}
      />,
    );

    const foreignObject = container.querySelector('foreignObject');
    expect(foreignObject?.getAttribute('width')).toBe('90'); // CanvasDefaults.DEFAULT_NODE_WIDTH
    expect(foreignObject?.getAttribute('height')).toBe('75'); // CanvasDefaults.DEFAULT_NODE_HEIGHT
  });

  it('omits the <img> when no iconUrl is available', () => {
    const noIconElement = {
      getLabel: () => 'direct:foo',
      getData: () => ({ iconUrl: '' }),
      getBounds: () => ({ width: 90, height: 75 }),
    } as never;

    const { container } = renderInSvg(
      <TopologySyntheticEndpoint
        element={noIconElement}
        className="topology-external-endpoint"
        testIdPrefix="topology-external"
        titlePrefix="External endpoint"
        BadgeIcon={ExternalLinkAltIcon}
      />,
    );

    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('falls back to an empty label when getLabel is missing', () => {
    const noLabelElement = {
      getData: () => ({}),
      getBounds: () => ({ width: 90, height: 75 }),
    } as never;

    const { container } = renderInSvg(
      <TopologySyntheticEndpoint
        element={noLabelElement}
        className="topology-external-endpoint"
        testIdPrefix="topology-external"
        titlePrefix="External endpoint"
        BadgeIcon={ExternalLinkAltIcon}
      />,
    );

    // No label foreignObject (TopologyNodeLabel returns null on empty)
    expect(container.querySelectorAll('foreignObject').length).toBe(1);
  });
});
