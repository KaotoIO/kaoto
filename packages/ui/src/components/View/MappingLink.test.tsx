import { fireEvent, render } from '@testing-library/react';
import React from 'react';

import { MappingLink } from './MappingLink';

const mockGetNodeReference = jest.fn();
const mockToggleSelectedNodeReference = jest.fn();

jest.mock('../../hooks/useCanvas', () => ({
  useCanvas: () => ({
    getNodeReference: mockGetNodeReference,
  }),
}));

jest.mock('../../hooks/useMappingLinks', () => ({
  useMappingLinks: () => ({
    mappingLinkCanvasRef: { current: { getBoundingClientRect: () => ({ left: 10, right: 110 }) } },
    toggleSelectedNodeReference: mockToggleSelectedNodeReference,
  }),
}));

describe('MappingLink', () => {
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

  it('calls toggleSelectedNodeReference on line click', () => {
    mockGetNodeReference.mockReturnValue('node-ref');
    const { getByTestId } = render(
      <svg>
        <MappingLink {...defaultProps} />
      </svg>,
    );
    fireEvent.click(getByTestId('mapping-link-10-20-100-200'));
    expect(mockGetNodeReference).toHaveBeenCalledWith('target.path');
    expect(mockToggleSelectedNodeReference).toHaveBeenCalledWith('node-ref');
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
