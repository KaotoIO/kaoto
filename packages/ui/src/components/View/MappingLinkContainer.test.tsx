import { render } from '@testing-library/react';

import { IMappingLink } from '../../models/datamapper';
import { MappingLinksContainer } from './MappingLinkContainer';

const mockGetNearestVisiblePort = jest.fn();
jest.mock('../../utils', () => ({
  getNearestVisiblePort: (...args: unknown[]) => mockGetNearestVisiblePort(...args),
}));

const mockGetMappingLinks = jest.fn<IMappingLink[], []>();
jest.mock('../../hooks/useMappingLinks', () => ({
  useMappingLinks: () => ({
    getMappingLinks: mockGetMappingLinks,
  }),
}));

jest.mock('../../store', () => ({
  useDocumentTreeStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      nodesConnectionPorts: {},
      nodesConnectionPortsArray: {},
      expansionState: {},
      expansionStateArray: {},
    }),
}));

const buildLink = (sourceNodePath: string, targetNodePath: string, isSelected: boolean): IMappingLink => ({
  sourceNodePath,
  targetNodePath,
  sourceDocumentId: 'doc-SOURCE_BODY-body',
  targetDocumentId: 'doc-TARGET_BODY-body',
  isSelected,
});

describe('MappingLinksContainer', () => {
  beforeEach(() => {
    mockGetNearestVisiblePort.mockReturnValue({ connectionTarget: 'node', position: [100, 200] });
  });

  afterEach(() => {
    jest.clearAllMocks();
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
});
