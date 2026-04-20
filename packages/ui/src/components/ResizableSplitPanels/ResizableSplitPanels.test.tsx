import { act, fireEvent, render, screen, within } from '@testing-library/react';

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

// Helper to cleanup mocked styles
const cleanupMockedStyles = (originalGetComputedStyle: typeof globalThis.getComputedStyle) => {
  globalThis.getComputedStyle = originalGetComputedStyle;
};

describe('ResizableSplitPanels - Resize Handle', () => {
  it('should render handle with Carbon ArrowsHorizontal icon and proper styling', () => {
    // Verify correct icon, positioning, and classes
    const { container } = render(
      <ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />,
    );

    const resizeHandle = screen.getByRole('slider');
    const svg = resizeHandle.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(resizeHandle).toHaveAttribute('aria-label', 'Resize panels');
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

    const resizeHandle = screen.getByRole('slider');
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

    cleanupMockedStyles(originalGetComputedStyle);
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

    const resizeHandle = screen.getByRole('slider');

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

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 300 });
    expect(onResize).not.toHaveBeenCalled();

    fireEvent.mouseMove(document, { clientX: 400 });
    expect(onResize).toHaveBeenCalled();
    const [leftWidth, rightWidth] = onResize.mock.calls[0];
    expect(typeof leftWidth).toBe('number');
    expect(typeof rightWidth).toBe('number');
    expect(leftWidth + rightWidth + GAP_PERCENT).toBeCloseTo(100, 1);

    cleanupMockedStyles(originalGetComputedStyle);
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

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 100 });
    expect(onResizeEnd).not.toHaveBeenCalled();

    fireEvent.mouseUp(document);
    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    const [leftWidth, rightWidth] = onResizeEnd.mock.calls[0];
    expect(typeof leftWidth).toBe('number');
    expect(typeof rightWidth).toBe('number');
    expect(leftWidth + rightWidth + GAP_PERCENT).toBeCloseTo(100, 1);

    cleanupMockedStyles(originalGetComputedStyle);
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

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 300 });

    // Simulate rapid mouse movements
    for (let i = 0; i < 10; i++) {
      fireEvent.mouseMove(document, { clientX: 300 + i * 10 });
    }

    expect(onResize).toHaveBeenCalledTimes(10);
    fireEvent.mouseUp(document);

    const leftPanel = container.querySelector('.split-panel--left') as HTMLElement;
    expect(leftPanel).toBeInTheDocument();

    cleanupMockedStyles(originalGetComputedStyle);
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

    const resizeHandle = screen.getByRole('slider');
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
    const { originalGetComputedStyle } = setupResizeTest(container);

    // Initial widths - gap for 1000px container is 4.2%, so right should be 100 - 40 - 4.2 = 55.8%
    expect(leftPanel.style.width).toBe('40%');
    expect(rightPanel.style.width).toBe('55.8%'); // 100 - 40 - 4.2 (gap)

    fireEvent(globalThis as unknown as Window, new Event('resize'));
    expect(leftPanel.style.width).toBe('40%');
    expect(rightPanel.style.width).toBe('55.8%');

    cleanupMockedStyles(originalGetComputedStyle);
  });

  it('should cleanup event listeners on unmount', () => {
    // Prevent memory leaks
    const { container, unmount } = render(
      <ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />,
    );

    const resizeHandle = screen.getByRole('slider');
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

    const resizeHandle = screen.getByRole('slider');
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

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    fireEvent.mouseDown(resizeHandle, { clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 400 });
    const leftPanel = container.querySelector('.split-panel--left');
    const rightPanel = container.querySelector('.split-panel--right');

    expect(leftPanel).toBeInTheDocument();
    expect(rightPanel).toBeInTheDocument();
    expect(screen.getByText('Scrollable Left Content')).toBeInTheDocument();
    expect(screen.getByText('Scrollable Right Content')).toBeInTheDocument();

    fireEvent.mouseUp(document);

    cleanupMockedStyles(originalGetComputedStyle);
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

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

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

    cleanupMockedStyles(originalGetComputedStyle);
  });
});

describe('ResizableSplitPanels - Keyboard Navigation', () => {
  it('should be keyboard accessible with tabIndex', () => {
    render(<ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />);

    const resizeHandle = screen.getByRole('slider');
    expect(resizeHandle).toHaveAttribute('tabIndex', '0');
  });

  it('should resize with arrow keys and handle lifecycle callbacks', () => {
    const onResize = jest.fn();
    const onResizeStart = jest.fn();
    const onResizeEnd = jest.fn();
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={30}
        onResize={onResize}
        onResizeStart={onResizeStart}
        onResizeEnd={onResizeEnd}
      />,
    );

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    // onResizeStart called on first key press
    expect(onResizeStart).not.toHaveBeenCalled();

    // ArrowRight: 5% increment
    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    });
    expect(onResizeStart).toHaveBeenCalledTimes(1);
    expect(onResize).toHaveBeenCalled();
    expect(onResize.mock.calls[0][0]).toBe(35); // 30 + 5

    // ArrowLeft: 5% decrement
    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' });
    });
    expect(onResize.mock.calls[1][0]).toBe(30); // 35 - 5

    // Shift+ArrowRight: 10% increment
    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'ArrowRight', shiftKey: true });
    });
    expect(onResize.mock.calls[2][0]).toBe(40); // 30 + 10

    // Shift+ArrowLeft: 10% decrement
    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft', shiftKey: true });
    });
    expect(onResize.mock.calls[3][0]).toBe(30); // 40 - 10

    // onResizeEnd called on Enter
    expect(onResizeEnd).not.toHaveBeenCalled();
    act(() => {
      fireEvent.keyUp(resizeHandle, { key: 'Enter' });
    });
    expect(onResizeEnd).toHaveBeenCalledTimes(1);

    // onResizeEnd called on blur (after starting new resize)
    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' }); // Start new resize
    });
    expect(onResizeStart).toHaveBeenCalledTimes(2); // Called again for new resize
    act(() => {
      fireEvent.blur(resizeHandle);
    });
    expect(onResizeEnd).toHaveBeenCalledTimes(2);

    cleanupMockedStyles(originalGetComputedStyle);
  });

  it('should support Home and End keys for min/max widths', () => {
    const onResize = jest.fn();
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={50}
        onResize={onResize}
      />,
    );

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    // Home key: minimum width
    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'Home' });
    });
    expect(onResize.mock.calls[0][0]).toBe(10); // MIN_PANEL_WIDTH

    // End key: maximum width
    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'End' });
    });
    expect(onResize.mock.calls[1][0]).toBeCloseTo(85.8, 1); // 100 - 10 - 4.2

    cleanupMockedStyles(originalGetComputedStyle);
  });

  it('should restore previous width with Escape key', () => {
    const onResizeEnd = jest.fn();
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={30}
        onResizeEnd={onResizeEnd}
      />,
    );

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    });

    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'Escape' });
    });

    expect(onResizeEnd).toHaveBeenCalled();
    expect(onResizeEnd.mock.calls[0][0]).toBe(30); // Restored to original

    cleanupMockedStyles(originalGetComputedStyle);
  });

  it('should prevent default behavior for arrow keys', () => {
    const { container } = render(
      <ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />,
    );

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    const arrowRightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    const preventDefaultSpy = jest.spyOn(arrowRightEvent, 'preventDefault');
    resizeHandle.dispatchEvent(arrowRightEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();

    cleanupMockedStyles(originalGetComputedStyle);
  });
});

describe('ResizableSplitPanels - ARIA Attributes', () => {
  it('should have proper ARIA attributes on resize handle', () => {
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={40}
      />,
    );

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    // Basic ARIA attributes
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle).toHaveAttribute('aria-label', 'Resize panels');
    expect(resizeHandle).toHaveAttribute('aria-orientation', 'vertical');
    expect(resizeHandle).toHaveAttribute('aria-controls', 'left-panel right-panel');

    // Value attributes
    expect(resizeHandle).toHaveAttribute('aria-valuenow', '40');
    expect(resizeHandle).toHaveAttribute('aria-valuemin', '10');
    expect(resizeHandle).toHaveAttribute('aria-valuemax', '86');
    expect(resizeHandle).toHaveAttribute('aria-valuetext', 'Left panel 40%, right panel 56%');

    cleanupMockedStyles(originalGetComputedStyle);
  });

  it('should update ARIA attributes during resize', () => {
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={30}
      />,
    );

    const resizeHandle = screen.getByRole('slider');
    const { originalGetComputedStyle } = setupResizeTest(container);

    expect(resizeHandle).toHaveAttribute('aria-valuenow', '30');

    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    });

    expect(resizeHandle).toHaveAttribute('aria-valuenow', '35');
    expect(resizeHandle).toHaveAttribute('aria-valuetext', 'Left panel 35%, right panel 61%');

    cleanupMockedStyles(originalGetComputedStyle);
  });
});

describe('ResizableSplitPanels - Screen Reader Announcements', () => {
  it('should have properly configured live region', () => {
    render(<ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />);

    const liveRegion = screen.getByTestId('resize-announcement');
    expect(liveRegion).toHaveAttribute('role', 'status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toHaveClass('sr-only');
  });

  it('should announce widths during resize and clear on end', () => {
    const { container } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        defaultLeftWidth={30}
      />,
    );

    const resizeHandle = screen.getByRole('slider');
    const liveRegion = screen.getByTestId('resize-announcement');
    const { originalGetComputedStyle } = setupResizeTest(container);

    // Initially empty
    expect(liveRegion).toHaveTextContent('');

    // Announces during keyboard resize
    act(() => {
      fireEvent.keyDown(resizeHandle, { key: 'ArrowRight' });
    });
    expect(liveRegion).toHaveTextContent('Left panel 35%, right panel 61%');

    // Clears on resize end
    act(() => {
      fireEvent.keyUp(resizeHandle, { key: 'Enter' });
    });
    expect(liveRegion).toHaveTextContent('');

    // Also announces during mouse resize
    fireEvent.mouseDown(resizeHandle, { clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 400 });
    expect(liveRegion.textContent).toBeTruthy();

    cleanupMockedStyles(originalGetComputedStyle);
  });
});

describe('ResizableSplitPanels - Panel Identification', () => {
  it('should support default and custom panel IDs and labels', () => {
    // Test default IDs and labels
    const { container: defaultContainer } = render(
      <ResizableSplitPanels leftPanel={<div>Left Panel</div>} rightPanel={<div>Right Panel</div>} />,
    );

    const defaultLeftPanel = defaultContainer.querySelector('#left-panel');
    const defaultRightPanel = defaultContainer.querySelector('#right-panel');
    const defaultResizeHandle = within(defaultContainer).getByRole('slider');

    expect(defaultLeftPanel).toBeInTheDocument();
    expect(defaultRightPanel).toBeInTheDocument();
    expect(defaultLeftPanel).toHaveAttribute('aria-label', 'Left panel');
    expect(defaultRightPanel).toHaveAttribute('aria-label', 'Right panel');
    expect(defaultResizeHandle).toHaveAttribute('aria-controls', 'left-panel right-panel');

    // Test custom IDs and labels
    const { container: customContainer } = render(
      <ResizableSplitPanels
        leftPanel={<div>Left Panel</div>}
        rightPanel={<div>Right Panel</div>}
        leftPanelId="source-code"
        rightPanelId="preview"
        leftPanelLabel="Source code editor"
        rightPanelLabel="Live preview"
      />,
    );

    const customLeftPanel = customContainer.querySelector('#source-code');
    const customRightPanel = customContainer.querySelector('#preview');
    const customResizeHandle = within(customContainer).getByRole('slider');

    expect(customLeftPanel).toBeInTheDocument();
    expect(customRightPanel).toBeInTheDocument();
    expect(customLeftPanel).toHaveAttribute('aria-label', 'Source code editor');
    expect(customRightPanel).toHaveAttribute('aria-label', 'Live preview');
    expect(customResizeHandle).toHaveAttribute('aria-controls', 'source-code preview');
  });
});
