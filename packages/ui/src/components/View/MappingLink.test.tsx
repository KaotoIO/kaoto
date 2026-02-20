import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { useDocumentTreeStore } from '../../store';
import { MappingLink } from './MappingLink';

const mockToggleSelectedNode = jest.fn();

jest.mock('../../hooks/useMappingLinks', () => ({
  useMappingLinks: () => ({
    mappingLinkCanvasRef: { current: { getBoundingClientRect: () => ({ left: 10, right: 110 }) } },
    getMappingLinks: jest.fn().mockReturnValue([]),
    isNodeInSelectedMapping: jest.fn().mockReturnValue(false),
  }),
}));

describe('MappingLink', () => {
  beforeEach(() => {
    useDocumentTreeStore.setState({ toggleSelectedNode: mockToggleSelectedNode });
  });

  afterEach(() => {
    mockToggleSelectedNode.mockClear();
  });

  const defaultProps = {
    x1: 10,
    y1: 20,
    x2: 100,
    y2: 200,
    sourceNodePath: 'source.path',
    targetNodePath: 'target.path',
    isSelected: false,
    svgRef: { current: { getBoundingClientRect: () => ({ left: 0 }) } } as React.RefObject<SVGSVGElement>,
  };

  it('renders circles at endpoints', () => {
    const { getAllByRole } = render(
      <svg>
        <MappingLink {...defaultProps} />
      </svg>,
    );
    const circles = getAllByRole('presentation');
    expect(circles.length).toBe(2);
  });

  it('renders LinePath with correct testid', () => {
    const { getByTestId } = render(
      <svg>
        <MappingLink {...defaultProps} />
      </svg>,
    );
    expect(getByTestId('mapping-link-10-20-100-200')).toBeInTheDocument();
  });

  it('applies selected class when isSelected is true', () => {
    const { getByTestId } = render(
      <svg>
        <MappingLink {...defaultProps} isSelected={true} />
      </svg>,
    );
    expect(getByTestId('mapping-link-selected-10-20-100-200').classList).toContain('mapping-link--selected');
  });

  it('calls toggleSelectedNode on line click', () => {
    const { getByTestId } = render(
      <svg>
        <MappingLink {...defaultProps} />
      </svg>,
    );
    fireEvent.click(getByTestId('mapping-link-10-20-100-200'));
    expect(mockToggleSelectedNode).toHaveBeenCalledWith('target.path', false);
  });

  it('changes dot radius on mouse enter/leave', () => {
    const { getByTestId, container } = render(
      <svg>
        <MappingLink {...defaultProps} />
      </svg>,
    );
    const line = getByTestId('mapping-link-10-20-100-200');
    const circles = container.querySelectorAll('circle');
    expect(circles[0]).toHaveAttribute('r', '3');
    fireEvent.mouseEnter(line);
    expect(container.querySelectorAll('circle')[0]).toHaveAttribute('r', '6');
    fireEvent.mouseLeave(line);
    expect(container.querySelectorAll('circle')[0]).toHaveAttribute('r', '3');
  });

  it('sets xlink:title attribute', () => {
    const { getByTestId } = render(
      <svg>
        <MappingLink {...defaultProps} />
      </svg>,
    );
    expect(getByTestId('mapping-link-10-20-100-200')).toHaveAttribute(
      'xlink:title',
      'Source: source.path, Target: target.path',
    );
  });
});
