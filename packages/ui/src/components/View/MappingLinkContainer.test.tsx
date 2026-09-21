import { render } from '@testing-library/react';

import {
  BODY_DOCUMENT_ID,
  DocumentNodeData,
  DocumentType,
  IMappingLink,
  MappingLineStyle,
  PARAMETERS_SECTION_ANCHOR,
  VARIABLES_SECTION_ANCHOR,
} from '../../models/datamapper';
import { TreeConnectionPorts } from '../../store/document-tree.store';
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

const mockStoreState: { nodesConnectionPorts: Record<string, TreeConnectionPorts> } = {
  nodesConnectionPorts: {},
};
vi.mock('../../store', () => ({
  useDocumentTreeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      nodesConnectionPorts: mockStoreState.nodesConnectionPorts,
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
  sourceDocumentNodeId: DocumentNodeData.formatNodeId(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID),
  targetDocumentNodeId: DocumentNodeData.formatNodeId(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID),
  isSelected,
  lineStyle,
});

describe('MappingLinksContainer', () => {
  beforeEach(() => {
    mockStoreState.nodesConnectionPorts = {};
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

  describe('source section anchors', () => {
    const anchoredLink = (anchor: IMappingLink['sourceSectionAnchor']): IMappingLink => ({
      ...buildLink('source/1', 'target/1', false),
      sourceSectionAnchor: anchor,
    });

    it.each([
      ['parameters', PARAMETERS_SECTION_ANCHOR, [42, 84] as [number, number]],
      ['variables', VARIABLES_SECTION_ANCHOR, [17, 23] as [number, number]],
    ])('should resolve the registered %s section anchor port', (_name, anchor, position) => {
      mockStoreState.nodesConnectionPorts = { [anchor.documentNodeId]: { [anchor.nodePath]: position } };
      mockGetMappingLinks.mockReturnValue([anchoredLink(anchor)]);

      render(<MappingLinksContainer />);

      expect(mockGetNearestVisiblePort).toHaveBeenNthCalledWith(
        1,
        'source/1',
        expect.objectContaining({ sectionAnchorPort: position }),
      );
    });

    it('should pass no anchor port while the section header has not registered one', () => {
      mockGetMappingLinks.mockReturnValue([anchoredLink(PARAMETERS_SECTION_ANCHOR)]);

      render(<MappingLinksContainer />);

      expect(mockGetNearestVisiblePort).toHaveBeenNthCalledWith(
        1,
        'source/1',
        expect.objectContaining({ sectionAnchorPort: undefined }),
      );
    });

    it('should pass no anchor port for a link without a section anchor', () => {
      mockStoreState.nodesConnectionPorts = {
        [PARAMETERS_SECTION_ANCHOR.documentNodeId]: { [PARAMETERS_SECTION_ANCHOR.nodePath]: [42, 84] },
      };
      mockGetMappingLinks.mockReturnValue([anchoredLink(undefined)]);

      render(<MappingLinksContainer />);

      expect(mockGetNearestVisiblePort).toHaveBeenNthCalledWith(
        1,
        'source/1',
        expect.objectContaining({ sectionAnchorPort: undefined }),
      );
    });

    it('should never anchor the target end of a link', () => {
      mockStoreState.nodesConnectionPorts = {
        [PARAMETERS_SECTION_ANCHOR.documentNodeId]: { [PARAMETERS_SECTION_ANCHOR.nodePath]: [42, 84] },
      };
      mockGetMappingLinks.mockReturnValue([anchoredLink(PARAMETERS_SECTION_ANCHOR)]);

      render(<MappingLinksContainer />);

      expect(mockGetNearestVisiblePort).toHaveBeenNthCalledWith(
        2,
        'target/1',
        expect.not.objectContaining({ sectionAnchorPort: expect.anything() }),
      );
    });
  });
});
