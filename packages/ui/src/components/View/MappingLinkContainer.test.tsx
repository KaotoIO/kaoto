import { render } from '@testing-library/react';
import { createRef, FunctionComponent, PropsWithChildren } from 'react';

import {
  BODY_DOCUMENT_ID,
  DocumentNodeData,
  DocumentType,
  IMappingLink,
  MappingLineStyle,
  PARAMETERS_SECTION_ANCHOR,
  VARIABLES_SECTION_ANCHOR,
} from '../../models/datamapper';
import { NodePath } from '../../models/datamapper/nodepath';
import { IMappingLinksContext, MappingLinksContext } from '../../providers/data-mapping-links.provider';
import { useDocumentTreeStore } from '../../store';
import { MappingLinksContainer } from './MappingLinkContainer';

const SOURCE_DOCUMENT_NODE_ID = DocumentNodeData.formatNodeId(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
const TARGET_DOCUMENT_NODE_ID = DocumentNodeData.formatNodeId(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);

const sourcePath = (...segments: string[]) =>
  Object.assign(NodePath.fromDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID), {
    pathSegments: segments,
  }).toString();
const targetPath = (...segments: string[]) =>
  Object.assign(NodePath.fromDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID), {
    pathSegments: segments,
  }).toString();

/**
 * Registers the visible connection ports of a document, like the rendered document tree does.
 * A path left out of `nodes` is out of view (or below a collapsed parent when its parent is registered).
 */
const registerPorts = (documentNodeId: string, nodes: Record<string, [number, number]>) => {
  useDocumentTreeStore.getState().setNodesConnectionPorts(documentNodeId, { nodes, edges: { bottom: [0, 999] } });
};

const buildLink = (
  sourceNodePath: string,
  targetNodePath: string,
  isSelected: boolean,
  lineStyle: MappingLineStyle = MappingLineStyle.REGULAR,
): IMappingLink => ({
  sourceNodePath,
  targetNodePath,
  sourceDocumentNodeId: SOURCE_DOCUMENT_NODE_ID,
  targetDocumentNodeId: TARGET_DOCUMENT_NODE_ID,
  isSelected,
  lineStyle,
});

describe('MappingLinksContainer', () => {
  let mappingLinks: IMappingLink[];

  const mappingLinksContext: IMappingLinksContext = {
    mappingLinkCanvasRef: createRef<HTMLDivElement>(),
    getMappingLinks: () => mappingLinks,
    isNodeInSelectedMapping: () => false,
  };

  const MappingLinksWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <MappingLinksContext.Provider value={mappingLinksContext}>{children}</MappingLinksContext.Provider>
  );

  const renderContainer = () => render(<MappingLinksContainer />, { wrapper: MappingLinksWrapper });

  beforeEach(() => {
    mappingLinks = [];
    useDocumentTreeStore.setState({
      nodesConnectionPorts: {},
      nodesConnectionPortsArray: {},
      expansionState: {},
      expansionStateArray: {},
    });
  });

  it('should render the svg container', () => {
    mappingLinks = [];
    const { getByTestId } = renderContainer();
    expect(getByTestId('mapping-links')).toBeInTheDocument();
  });

  it('should render a selected link after an unselected link', () => {
    mappingLinks = [
      buildLink(sourcePath('source1'), targetPath('target1'), true),
      buildLink(sourcePath('source2'), targetPath('target2'), false),
    ];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('source1')]: [10, 20], [sourcePath('source2')]: [50, 60] });
    registerPorts(TARGET_DOCUMENT_NODE_ID, {
      [targetPath('target1')]: [300, 400],
      [targetPath('target2')]: [350, 450],
    });

    const { container } = renderContainer();
    expect(container.querySelectorAll('[data-testid^="mapping-link-"]')).toHaveLength(2);
  });

  it('should render an unselected link after a selected link is sorted last', () => {
    mappingLinks = [
      buildLink(sourcePath('sourceA'), targetPath('targetA'), false),
      buildLink(sourcePath('sourceB'), targetPath('targetB'), true),
    ];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('sourceA')]: [10, 20], [sourcePath('sourceB')]: [50, 60] });
    registerPorts(TARGET_DOCUMENT_NODE_ID, {
      [targetPath('targetA')]: [300, 400],
      [targetPath('targetB')]: [350, 450],
    });

    const { container } = renderContainer();
    expect(container.querySelectorAll('[data-testid^="mapping-link-"]')).toHaveLength(2);
  });

  it('should deduplicate links with identical coordinates', () => {
    mappingLinks = [
      buildLink(sourcePath('source1'), targetPath('target1'), false),
      buildLink(sourcePath('source2'), targetPath('target2'), false),
    ];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, {
      [sourcePath('source1')]: [100, 200],
      [sourcePath('source2')]: [100, 200],
    });
    registerPorts(TARGET_DOCUMENT_NODE_ID, {
      [targetPath('target1')]: [100, 200],
      [targetPath('target2')]: [100, 200],
    });

    const { container } = renderContainer();
    expect(container.querySelectorAll('[data-testid^="mapping-link-"]')).toHaveLength(1);
  });

  it('should override lineStyle to OUT_OF_VIEW when source port is at edge', () => {
    mappingLinks = [buildLink(sourcePath('source1'), targetPath('target1'), false, MappingLineStyle.COMPLETE)];
    registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [300, 400] });

    const { container } = renderContainer();
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--out-of-view');
    expect(link).not.toHaveClass('mapping-link--complete');
  });

  it('should override lineStyle to OUT_OF_VIEW when target port is at edge', () => {
    mappingLinks = [buildLink(sourcePath('source1'), targetPath('target1'), false, MappingLineStyle.PARTIAL)];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('source1')]: [10, 20] });

    const { container } = renderContainer();
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--out-of-view');
    expect(link).not.toHaveClass('mapping-link--partial');
  });

  it('should override COMPLETE to REGULAR when both ports are visible nodes', () => {
    mappingLinks = [buildLink(sourcePath('source1'), targetPath('target1'), false, MappingLineStyle.COMPLETE)];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('source1')]: [100, 200] });
    registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [100, 200] });

    const { container } = renderContainer();
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--regular');
    expect(link).not.toHaveClass('mapping-link--complete');
  });

  it('should override PARTIAL to REGULAR when both ports are visible nodes', () => {
    mappingLinks = [buildLink(sourcePath('source1'), targetPath('target1'), false, MappingLineStyle.PARTIAL)];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('source1')]: [100, 200] });
    registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [100, 200] });

    const { container } = renderContainer();
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--regular');
    expect(link).not.toHaveClass('mapping-link--partial');
  });

  it('should preserve COPY_OF lineStyle when both ports are visible nodes', () => {
    mappingLinks = [buildLink(sourcePath('source1'), targetPath('target1'), false, MappingLineStyle.COPY_OF)];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('source1')]: [10, 20] });
    registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [300, 400] });

    const { container } = renderContainer();
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--copy-of');
  });

  it('should override COPY_OF to PARTIAL when target port is on a collapsed parent', () => {
    mappingLinks = [buildLink(sourcePath('source1'), targetPath('parent', 'target1'), false, MappingLineStyle.COPY_OF)];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('source1')]: [10, 20] });
    registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('parent')]: [300, 400] });

    const { container } = renderContainer();
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--partial');
    expect(link).not.toHaveClass('mapping-link--copy-of');
  });

  it('should override REGULAR to PARTIAL when source port is on a collapsed parent', () => {
    mappingLinks = [buildLink(sourcePath('parent', 'source1'), targetPath('target1'), false, MappingLineStyle.REGULAR)];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('parent')]: [10, 20] });
    registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [300, 400] });

    const { container } = renderContainer();
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--partial');
    expect(link).not.toHaveClass('mapping-link--regular');
  });

  it('should override COMPLETE to PARTIAL when source port is on a collapsed parent', () => {
    mappingLinks = [
      buildLink(sourcePath('parent', 'source1'), targetPath('target1'), false, MappingLineStyle.COMPLETE),
    ];
    registerPorts(SOURCE_DOCUMENT_NODE_ID, { [sourcePath('parent')]: [10, 20] });
    registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [300, 400] });

    const { container } = renderContainer();
    const link = container.querySelector('[data-testid^="mapping-link-"]');
    expect(link).toHaveClass('mapping-link--partial');
    expect(link).not.toHaveClass('mapping-link--complete');
  });

  /*
   * The source section (e.g. the parameters) is unmounted here, so the source end of a link can only be drawn from a
   * registered section anchor port; without one it falls back to the out-of-view edge at (0, 0).
   */
  describe('source section anchors', () => {
    const anchoredLink = (anchor: IMappingLink['sourceSectionAnchor']): IMappingLink => ({
      ...buildLink(sourcePath('source1'), targetPath('target1'), false),
      sourceSectionAnchor: anchor,
    });

    const registerAnchorPort = (
      anchor: NonNullable<IMappingLink['sourceSectionAnchor']>,
      position: [number, number],
    ) => {
      registerPorts(anchor.documentNodeId, { [anchor.nodePath]: position });
    };

    it.each([
      ['parameters', PARAMETERS_SECTION_ANCHOR, [42, 84] as [number, number]],
      ['variables', VARIABLES_SECTION_ANCHOR, [17, 23] as [number, number]],
    ])('should resolve the registered %s section anchor port', (_name, anchor, position) => {
      registerAnchorPort(anchor, position);
      registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [300, 400] });
      mappingLinks = [anchoredLink(anchor)];

      const { getByTestId } = renderContainer();

      expect(getByTestId(`mapping-link-${position[0]}-${position[1]}-300-400`)).toBeInTheDocument();
    });

    it('should pass no anchor port while the section header has not registered one', () => {
      registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [300, 400] });
      mappingLinks = [anchoredLink(PARAMETERS_SECTION_ANCHOR)];

      const { getByTestId } = renderContainer();

      expect(getByTestId('mapping-link-0-0-300-400')).toHaveClass('mapping-link--out-of-view');
    });

    it('should pass no anchor port for a link without a section anchor', () => {
      registerAnchorPort(PARAMETERS_SECTION_ANCHOR, [42, 84]);
      registerPorts(TARGET_DOCUMENT_NODE_ID, { [targetPath('target1')]: [300, 400] });
      mappingLinks = [anchoredLink(undefined)];

      const { getByTestId } = renderContainer();

      expect(getByTestId('mapping-link-0-0-300-400')).toHaveClass('mapping-link--out-of-view');
    });

    it('should never anchor the target end of a link', () => {
      registerAnchorPort(PARAMETERS_SECTION_ANCHOR, [42, 84]);
      mappingLinks = [anchoredLink(PARAMETERS_SECTION_ANCHOR)];

      const { getByTestId } = renderContainer();

      // The source end uses the anchor, the unregistered target end stays at the out-of-view edge
      expect(getByTestId('mapping-link-42-84-0-0')).toHaveClass('mapping-link--out-of-view');
    });
  });
});
