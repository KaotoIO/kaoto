import { render, screen } from '@testing-library/react';

import { SplitPanel } from './SplitPanel';

describe('SplitPanel - Rendering', () => {
  it('should render as a Carbon Tile and render children content', () => {
    // Verify Tile component is rendered and children are displayed
    const { container } = render(
      <SplitPanel width={30} position="left">
        <div>Test Content</div>
      </SplitPanel>,
    );

    const tile = container.querySelector('.cds--tile');
    expect(tile).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply width percentage as inline style', () => {
    // Verify width: 30% is applied
    const { container } = render(
      <SplitPanel width={30} position="left">
        <div>Test Content</div>
      </SplitPanel>,
    );

    const panel = container.querySelector('.split-panel');
    expect(panel).toHaveStyle({ width: '30%' });
  });

  it('should render with left / right position class', () => {
    // Test position="left" / position="right" adds correct class
    const { container: leftContainer } = render(
      <SplitPanel width={30} position="left">
        <div>Left Content</div>
      </SplitPanel>,
    );

    const leftPanel = leftContainer.querySelector('.split-panel');
    expect(leftPanel).toHaveClass('split-panel--left');

    const { container: rightContainer } = render(
      <SplitPanel width={70} position="right">
        <div>Right Content</div>
      </SplitPanel>,
    );

    const rightPanel = rightContainer.querySelector('.split-panel');
    expect(rightPanel).toHaveClass('split-panel--right');
  });
});

describe('SplitPanel - Width Constraints', () => {
  it('should handle width changes via props', () => {
    // Test width prop updates
    const { container, rerender } = render(
      <SplitPanel width={30} position="left">
        <div>Test Content</div>
      </SplitPanel>,
    );

    let panel = container.querySelector('.split-panel');
    expect(panel).toHaveStyle({ width: '30%' });

    rerender(
      <SplitPanel width={50} position="left">
        <div>Test Content</div>
      </SplitPanel>,
    );

    panel = container.querySelector('.split-panel');
    expect(panel).toHaveStyle({ width: '50%' });
  });

  it('should respect maximum and minimum width constraint', () => {
    // Verify minWidth = 10% is enforced
    // Verify maxWidth = 90% is enforced
    const { container: minContainer } = render(
      <SplitPanel width={5} position="left">
        <div>Test Content</div>
      </SplitPanel>,
    );

    const minPanel = minContainer.querySelector('.split-panel');
    expect(minPanel).toHaveStyle({ width: '10%' });

    const { container: maxContainer } = render(
      <SplitPanel width={95} position="left">
        <div>Test Content</div>
      </SplitPanel>,
    );

    const maxPanel = maxContainer.querySelector('.split-panel');
    expect(maxPanel).toHaveStyle({ width: '90%' });
  });
});

describe('SplitPanel - Accessibility', () => {
  it('should render as semantic section element', () => {
    const { container } = render(
      <SplitPanel width={30} position="left">
        <div>Test Content</div>
      </SplitPanel>,
    );

    const panel = container.querySelector('.split-panel');
    expect(panel?.tagName).toBe('SECTION');
  });

  it('should have default aria-label and id based on position', () => {
    const { container: leftContainer } = render(
      <SplitPanel width={30} position="left">
        <div>Left Content</div>
      </SplitPanel>,
    );

    const leftPanel = leftContainer.querySelector('.split-panel');
    expect(leftPanel).toHaveAttribute('aria-label', 'Left panel');
    expect(leftPanel).toHaveAttribute('id', 'left-panel');

    const { container: rightContainer } = render(
      <SplitPanel width={70} position="right">
        <div>Right Content</div>
      </SplitPanel>,
    );

    const rightPanel = rightContainer.querySelector('.split-panel');
    expect(rightPanel).toHaveAttribute('aria-label', 'Right panel');
    expect(rightPanel).toHaveAttribute('id', 'right-panel');
  });

  it('should accept custom aria-label and id', () => {
    const { container } = render(
      <SplitPanel width={30} position="left" ariaLabel="Custom panel label" id="custom-panel-id">
        <div>Test Content</div>
      </SplitPanel>,
    );

    const panel = container.querySelector('.split-panel');
    expect(panel).toHaveAttribute('aria-label', 'Custom panel label');
    expect(panel).toHaveAttribute('id', 'custom-panel-id');
  });
});
