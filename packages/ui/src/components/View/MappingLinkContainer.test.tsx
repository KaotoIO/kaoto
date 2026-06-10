import { render } from '@testing-library/react';
import { vi } from 'vitest';

import { IMappingLink, MappingLineStyle } from '../../models/datamapper';
import { MappingLinksContainer } from './MappingLinkContainer';

const mockGetNearestVisiblePort = vi.fn();
vi.mock('../../utils', () => ({
  getNearestVisiblePort: (...args: unknown[]) => mockGetNearestVisiblePort(...args),
}));

const mockGetMappingLinks = vi.fn<() => IMappingLink[]>();
vi.mock('../../hooks/useMappingLinks', () => ({
  useMappingLinks: () => ({
    getMappingLinks: mockGetMappingLinks,
  }),
}));

vi.mock('../../store', () => ({
  useDocumentTreeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      nodesConnectionPorts: {},
      nodesConnectionPortsArray: {},
      expansionState: {},
      expansionStateArray: {},
    }),
}));

const buildLink = (
  sourceNodePath: string,
  targetNodePath: string,
  isSelected: boolean,
  lineStyle: MappingLineStyle = MappingLineStyle.REGULAR,
): IMappingLink => ({
  sourceNodePath,
  targetNodePath,
  sourceDocumentId: 'doc-SOURCE_BODY-body',
  targetDocumentId: 'doc-TARGET_BODY-body',
  isSelected,
  lineStyle,
});

describe('MappingLinksContainer', () => {
  beforeEach(() => {
    mockGetNearestVisiblePort.mockReturnValue({ connectionTarget: 'node', position: [100, 200] });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the svg container', () => {
    mockGetMappingLinks.mockReturnValue([]);
    const { getByTestId } = render(<MappingLinksContainer />);
    expect(getByTestId('mapping-links')).toBeInTheDocument();
  });

  it('should render a selected link after an unselected link', () => {
    mockGetMappingLinks.mockReturnValue([
      buildLink('source/1', 'target/1', true),
      buildLink('source/2', 'target/2', false),
    ]);

    mockGetNearestVisiblePort
      .mockReturnValueOnce({ connectionTarget: 'node', position: [10, 20] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [300, 400] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [50, 60] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [350, 450] });

    const { container } = render(<MappingLinksContainer />);
    expect(container.querySelectorAll('[data-testid^="mapping-link-"]')).toHaveLength(2);
  });

  it('should render an unselected link after a selected link is sorted last', () => {
    mockGetMappingLinks.mockReturnValue([
      buildLink('source/a', 'target/a', false),
      buildLink('source/b', 'target/b', true),
    ]);

    mockGetNearestVisiblePort
      .mockReturnValueOnce({ connectionTarget: 'node', position: [10, 20] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [300, 400] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [50, 60] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [350, 450] });

    const { container } = render(<MappingLinksContainer />);
    expect(container.querySelectorAll('[data-testid^="mapping-link-"]')).toHaveLength(2);
  });

  it('should deduplicate links with identical coordinates', () => {
    mockGetMappingLinks.mockReturnValue([
      buildLink('source/1', 'target/1', false),
      buildLink('source/2', 'target/2', false),
    ]);

    mockGetNearestVisiblePort.mockReturnValue({ connectionTarget: 'node', position: [100, 200] });

    const { container } = render(<MappingLinksContainer />);
    expect(container.querySelectorAll('[data-testid^="mapping-link-"]')).toHaveLength(1);
  });

  it('should override lineStyle to OUT_OF_VIEW when source port is at edge', () => {
    mockGetMappingLinks.mockReturnValue([buildLink('source/1', 'target/1', false, MappingLineStyle.COMPLETE)]);

    mockGetNearestVisiblePort
      .mockReturnValueOnce({ connectionTarget: 'edge', position: [10, 20] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [300, 400] });

    const { container } = render(<MappingLinksContainer />);
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--out-of-view');
    expect(link).not.toHaveClass('mapping-link--complete');
  });

  it('should override lineStyle to OUT_OF_VIEW when target port is at edge', () => {
    mockGetMappingLinks.mockReturnValue([buildLink('source/1', 'target/1', false, MappingLineStyle.PARTIAL)]);

    mockGetNearestVisiblePort
      .mockReturnValueOnce({ connectionTarget: 'node', position: [10, 20] })
      .mockReturnValueOnce({ connectionTarget: 'edge', position: [300, 400] });

    const { container } = render(<MappingLinksContainer />);
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--out-of-view');
    expect(link).not.toHaveClass('mapping-link--partial');
  });

  it('should override COMPLETE to REGULAR when both ports are visible nodes', () => {
    mockGetMappingLinks.mockReturnValue([buildLink('source/1', 'target/1', false, MappingLineStyle.COMPLETE)]);

    mockGetNearestVisiblePort.mockReturnValue({ connectionTarget: 'node', position: [100, 200] });

    const { container } = render(<MappingLinksContainer />);
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--regular');
    expect(link).not.toHaveClass('mapping-link--complete');
  });

  it('should override PARTIAL to REGULAR when both ports are visible nodes', () => {
    mockGetMappingLinks.mockReturnValue([buildLink('source/1', 'target/1', false, MappingLineStyle.PARTIAL)]);

    mockGetNearestVisiblePort.mockReturnValue({ connectionTarget: 'node', position: [100, 200] });

    const { container } = render(<MappingLinksContainer />);
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--regular');
    expect(link).not.toHaveClass('mapping-link--partial');
  });

  it('should preserve COPY_OF lineStyle when both ports are visible nodes', () => {
    mockGetMappingLinks.mockReturnValue([buildLink('source/1', 'target/1', false, MappingLineStyle.COPY_OF)]);

    mockGetNearestVisiblePort
      .mockReturnValueOnce({ connectionTarget: 'node', position: [10, 20] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [300, 400] });

    const { container } = render(<MappingLinksContainer />);
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--copy-of');
  });

  it('should override COPY_OF to PARTIAL when target port is on a collapsed parent', () => {
    mockGetMappingLinks.mockReturnValue([buildLink('source/1', 'target/1', false, MappingLineStyle.COPY_OF)]);

    mockGetNearestVisiblePort
      .mockReturnValueOnce({ connectionTarget: 'node', position: [10, 20] })
      .mockReturnValueOnce({ connectionTarget: 'parent', position: [300, 400] });

    const { container } = render(<MappingLinksContainer />);
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--partial');
    expect(link).not.toHaveClass('mapping-link--copy-of');
  });

  it('should override REGULAR to PARTIAL when source port is on a collapsed parent', () => {
    mockGetMappingLinks.mockReturnValue([buildLink('source/1', 'target/1', false, MappingLineStyle.REGULAR)]);

    mockGetNearestVisiblePort
      .mockReturnValueOnce({ connectionTarget: 'parent', position: [10, 20] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [300, 400] });

    const { container } = render(<MappingLinksContainer />);
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--partial');
    expect(link).not.toHaveClass('mapping-link--regular');
  });

  it('should override COMPLETE to PARTIAL when source port is on a collapsed parent', () => {
    mockGetMappingLinks.mockReturnValue([buildLink('source/1', 'target/1', false, MappingLineStyle.COMPLETE)]);

    mockGetNearestVisiblePort
      .mockReturnValueOnce({ connectionTarget: 'parent', position: [10, 20] })
      .mockReturnValueOnce({ connectionTarget: 'node', position: [300, 400] });

    const { container } = render(<MappingLinksContainer />);
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--partial');
    expect(link).not.toHaveClass('mapping-link--complete');
  });
});
