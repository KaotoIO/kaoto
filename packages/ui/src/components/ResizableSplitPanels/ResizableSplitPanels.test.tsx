import { fireEvent, render, screen } from '@testing-library/react';

import { ResizableSplitPanels } from './ResizableSplitPanels';

// Constants
const CONTAINER_WIDTH = 1000;
const GAP_PERCENT = 4.2; // 42px / 1000px * 100

// Helper to mock getComputedStyle for handle dimensions
const mockHandleStyles = (handle: HTMLElement) => {
  const originalGetComputedStyle = globalThis.getComputedStyle;
  globalThis.getComputedStyle = jest.fn((element) => {
    if (element === handle) {
      return {
        width: '20px',
        marginRight: '20px',
        borderLeftWidth: '1px',
        borderRightWidth: '1px',
      } as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(element);
  });
  return originalGetComputedStyle;
};

// Helper to setup resize test with mocked dimensions
const setupResizeTest = (container: HTMLElement) => {
  const rootElement = container.querySelector('.resizable-split-panels') as HTMLElement;
  const handle = container.querySelector('.resize-handle') as HTMLElement;
  Object.defineProperty(rootElement, 'offsetWidth', { value: CONTAINER_WIDTH, configurable: true });
  const originalGetComputedStyle = mockHandleStyles(handle);
  return { rootElement, handle, originalGetComputedStyle };
};

describe('ResizableSplitPanels - Resize Handle', () => {
  it('should render handle with Carbon ArrowsHorizontal icon and proper styling', () => {
    // Verify correct icon, positioning, and classes
    const { container } = render(
      <ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    const svg = resizeHandle.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(resizeHandle).toHaveAttribute('aria-label', 'Drag to resize panels');
    expect(resizeHandle).toHaveClass('resize-handle');

    const handle = container.querySelector('.resize-handle');
    expect(handle).toBeInTheDocument();
  });
});

describe('ResizableSplitPanels - Resize Behavior', () => {
  it('should handle resize lifecycle (mousedown, mousemove, mouseup)', () => {
    // Test complete resize flow with data-resizing attribute
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={30}
      />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    const rootElement = container.querySelector('.resizable-split-panels') as HTMLElement;

    // Mock container width
    Object.defineProperty(rootElement, 'offsetWidth', { value: CONTAINER_WIDTH, configurable: true });

    // Initial state - not resizing
    expect(rootElement).not.toHaveAttribute('data-resizing');

    // Start resize
    fireEvent.mouseDown(resizeHandle, { clientX: 300 });
    expect(rootElement).toHaveAttribute('data-resizing');

    const leftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    const initialLeftWidth = leftPanel.style.width;

    // Move mouse to the right (100px = 10% of 1000px container)
    fireEvent.mouseMove(document, { clientX: 400 });

    // Verify left panel width increased
    const newLeftWidth = leftPanel.style.width;
    expect(newLeftWidth).not.toBe(initialLeftWidth);

    // End resize
    fireEvent.mouseUp(document);
    expect(rootElement).not.toHaveAttribute('data-resizing');
  });

  it('should maintain total width at 100% between panels and gap', () => {
    // Verify left + right + resizable gap = 100% always
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={40}
      />,
    );

    const leftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    const rightPanel = container.querySelector('.split-panel--right') as HTMLElement;
    const { originalGetComputedStyle } = setupResizeTest(container);

    // Extract percentage values from style.width (e.g., "40%" -> 40)
    const leftWidth = Number.parseFloat(leftPanel.style.width);
    const rightWidth = Number.parseFloat(rightPanel.style.width);

    expect(leftWidth + rightWidth + GAP_PERCENT).toBeCloseTo(100, 1);

    globalThis.getComputedStyle = originalGetComputedStyle;
  });

  it('should call onResizeStart when drag begins', () => {
    // Test callback
    const onResizeStart = jest.fn();
    render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        onResizeStart={onResizeStart}
      />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });

    expect(onResizeStart).not.toHaveBeenCalled();
    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    expect(onResizeStart).toHaveBeenCalledTimes(1);
  });

  it('should call onResize during drag with current widths', () => {
    // Test callback with values
    const onResize = jest.fn();
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={30}
        onResize={onResize}
      />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    const { originalGetComputedStyle } = setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 300 });
    expect(onResize).not.toHaveBeenCalled();

    fireEvent.mouseMove(document, { clientX: 400 });
    expect(onResize).toHaveBeenCalled();
    const [leftWidth, rightWidth] = onResize.mock.calls[0];
    expect(typeof leftWidth).toBe('number');
    expect(typeof rightWidth).toBe('number');
    expect(leftWidth + rightWidth + GAP_PERCENT).toBeCloseTo(100, 1);

    globalThis.getComputedStyle = originalGetComputedStyle;
  });

  it('should call onResizeEnd when drag completes', () => {
    // Test callback
    const onResizeEnd = jest.fn();
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={30}
        onResizeEnd={onResizeEnd}
      />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    const { originalGetComputedStyle } = setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    expect(onResizeEnd).not.toHaveBeenCalled();

    fireEvent.mouseUp(document);
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    const [leftWidth, rightWidth] = onResizeEnd.mock.calls[0];
    expect(typeof leftWidth).toBe('number');
    expect(typeof rightWidth).toBe('number');
    expect(leftWidth + rightWidth + GAP_PERCENT).toBeCloseTo(100, 1);

    globalThis.getComputedStyle = originalGetComputedStyle;
  });

  it('should handle rapid mouse movements smoothly', () => {
    // Performance test
    const onResize = jest.fn();
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={30}
        onResize={onResize}
      />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 300 });

    // Simulate rapid mouse movements
    for (let i = 0; i < 10; i++) {
      fireEvent.mouseMove(document, { clientX: 300 + i * 10 });
    }

    expect(onResize).toHaveBeenCalledTimes(10);
    fireEvent.mouseUp(document);

    const leftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    expect(leftPanel).toBeInTheDocument();
  });

  it('should stop resize when mouse leaves window', () => {
    // Test mouseleave handling
    const onResizeEnd = jest.fn();
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        onResizeEnd={onResizeEnd}
      />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    const rootElement = container.querySelector('.resizable-split-panels');

    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    expect(rootElement).toHaveAttribute('data-resizing');

    fireEvent.mouseLeave(document);
    expect(rootElement).not.toHaveAttribute('data-resizing');
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
  });
});

describe('ResizableSplitPanels - Edge Cases', () => {
  it('should handle window resize', () => {
    // Verify panels maintain percentages
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={40}
      />,
    );

    const leftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    const rightPanel = container.querySelector('.split-panel--right') as HTMLElement;
    setupResizeTest(container);

    // Initial widths - gap for 1000px container is 4.2%, so right should be 100 - 40 - 4.2 = 55.8%
    expect(leftPanel.style.width).toBe('40%');
    expect(rightPanel.style.width).toBe('55.8%'); // 100 - 40 - 4.2 (gap)

    fireEvent(globalThis as unknown as Window, new Event('resize'));
    expect(leftPanel.style.width).toBe('40%');
    expect(rightPanel.style.width).toBe('55.8%');
  });

  it('should cleanup event listeners on unmount', () => {
    // Prevent memory leaks
    const { container, unmount } = render(
      <ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    const rootElement = container.querySelector('.resizable-split-panels');

    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    expect(rootElement).toHaveAttribute('data-resizing');

    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('should prevent text selection during drag', () => {
    // Verify user-select: none
    const { container } = render(
      <ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    const rootElement = container.querySelector('.resizable-split-panels') as HTMLElement;

    expect(rootElement).not.toHaveAttribute('data-resizing');

    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    expect(rootElement).toHaveAttribute('data-resizing');

    fireEvent.mouseUp(document);
    expect(rootElement).not.toHaveAttribute('data-resizing');
  });

  it('should handle resize with nested scrollable content', () => {
    // Test overflow scenarios
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={
          <div style={{ height: '500px', overflow: 'auto' }}>
            <div style={{ height: '1000px' }}>Scrollable Left Content</div>
          </div>
        }
        rightPanel={
          <div style={{ height: '500px', overflow: 'auto' }}>
            <div style={{ height: '1000px' }}>Scrollable Right Content</div>
          </div>
        }
        defaultLeftWidth={30}
      />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 400 });
    const leftPanel = container.querySelector('.split-panel--left');
    const rightPanel = container.querySelector('.split-panel--right');

    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();
    expect(screen.getByText('Scrollable Left Content')).toBeInTheDocument();
    expect(screen.getByText('Scrollable Right Content')).toBeInTheDocument();

    fireEvent.mouseUp(document);
  });

  it('should work with dynamic content updates', () => {
    // Test content changes during resize
    const { container, rerender } = render(
      <ResizableSplitPanels
        leftPanel={<div>Initial Left Content</div>}
        rightPanel={<div>Initial Right Content</div>}
        defaultLeftWidth={30}
      />,
    );

    const resizeHandle = screen.getByRole('button', { name: 'Drag to resize panels' });
    setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 400 });

    const leftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    const currentLeftWidth = leftPanel.style.width;

    rerender(
      <ResizableSplitPanels
        leftPanel={<div>Updated Left Content</div>}
        rightPanel={<div>Updated Right Content</div>}
        defaultLeftWidth={30}
      />,
    );

    expect(screen.getByText('Updated Left Content')).toBeInTheDocument();
    expect(screen.getByText('Updated Right Content')).toBeInTheDocument();
    const updatedLeftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    expect(updatedLeftPanel.style.width).toBe(currentLeftWidth);
    fireEvent.mouseUp(document);
    expect(container.querySelector('.resizable-split-panels')).toBeInTheDocument();
  });
});
