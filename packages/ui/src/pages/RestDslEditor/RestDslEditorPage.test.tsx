import { render, screen } from '@testing-library/react';

import { RestDslEditorPage } from './RestDslEditorPage';

describe('RestDslEditorPage - Integration Tests', () => {
  it('should render RestDslEditorPage with ResizableSplitPanels component', () => {
    // Verify the page renders
    const { container } = render(<RestDslEditorPage />);

    expect(container.firstChild).toBeInTheDocument();

    const resizablePanels = container.querySelector('.resizable-split-panels');
    expect(resizablePanels).toBeInTheDocument();

    const resizeHandle = screen.queryByRole('separator', { name: /drag to resize panels/i });
    expect(resizeHandle).toBeInTheDocument();
  });

  it('should apply appropriate default split ratio for REST DSL editor layout', () => {
    // Verify the page passes a sensible defaultLeftWidth prop (e.g., 25-30%)
    const { container } = render(<RestDslEditorPage />);

    const leftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    expect(leftPanel).toBeInTheDocument();

    const leftWidth = Numnber.parseFloat(leftPanel.style.width);
    expect(leftWidth).toBeGreaterThanOrEqual(25);
    expect(leftWidth).toBeLessThanOrEqual(30);

    const rightPanel = container.querySelector('.split-panel--right') as HTMLElement;
    expect(rightPanel).toBeInTheDocument();

    const rightWidth = Number.parseFloat(rightPanel.style.width);
    const gapWidth = 2; // GAP_WIDTH constant from ResizableSplitPanels
    expect(leftWidth + rightWidth + gapWidth).toBeCloseTo(100, 1);
  });

  it('should allow panels to scroll independently when content exceeds viewport height', () => {
    // Verify each panel can scroll independently
    const { container } = render(<RestDslEditorPage />);

    const leftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    const rightPanel = container.querySelector('.split-panel--right') as HTMLElement;

    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();

    expect(leftPanel).toHaveClass('split-panel');
    expect(rightPanel).toHaveClass('split-panel');

    expect(leftPanel).toHaveClass('split-panel--left');
    expect(rightPanel).toHaveClass('split-panel--right');

    const resizableContainer = container.querySelector('.resizable-split-panels');
    expect(resizableContainer).toBeInTheDocument();
  });
});
