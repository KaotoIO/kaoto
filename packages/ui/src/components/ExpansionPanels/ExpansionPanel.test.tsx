import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mock } from 'vitest';

import { ExpansionContext } from './ExpansionContext';
import { ExpansionPanel } from './ExpansionPanel';

describe('ExpansionPanel', () => {
  let mockRegister: Mock;
  let mockUnregister: Mock;
  let mockResize: Mock;
  let mockSetExpanded: Mock;
  let mockQueueLayoutChange: Mock;
  let mockRegisterLayoutCallback: Mock;
  let mockUnregisterLayoutCallback: Mock;

  beforeEach(() => {
    mockRegister = vi.fn();
    mockUnregister = vi.fn();
    mockResize = vi.fn();
    mockSetExpanded = vi.fn();
    mockQueueLayoutChange = vi.fn();
    mockRegisterLayoutCallback = vi.fn();
    mockUnregisterLayoutCallback = vi.fn();
  });

  const renderPanel = (props: Partial<React.ComponentProps<typeof ExpansionPanel>> = {}) => {
    const defaultProps = {
      id: 'test-panel',
      summary: <div>Test Summary</div>,
      children: <div>Test Content</div>,
    };

    return render(
      <ExpansionContext.Provider
        value={{
          register: mockRegister,
          unregister: mockUnregister,
          resize: mockResize,
          setExpanded: mockSetExpanded,
          queueLayoutChange: mockQueueLayoutChange,
          registerLayoutCallback: mockRegisterLayoutCallback,
          unregisterLayoutCallback: mockUnregisterLayoutCallback,
        }}
      >
        <ExpansionPanel {...defaultProps} {...props} />
      </ExpansionContext.Provider>,
    );
  };

  describe('Registration and Lifecycle', () => {
    it('should register with context on mount', () => {
      renderPanel({ id: 'test-panel', defaultHeight: 300, minHeight: 100, defaultExpanded: true });

      expect(mockRegister).toHaveBeenCalledWith(
        'test-panel',
        100, // minHeight
        300, // defaultHeight
        expect.any(HTMLDivElement), // element
        true, // isExpanded
      );
    });

    it('should unregister from context on unmount', () => {
      const { unmount } = renderPanel({ id: 'test-panel' });

      unmount();

      expect(mockUnregister).toHaveBeenCalledWith('test-panel');
    });

    it('should only depend on id and context in registration effect (prevents infinite loops)', () => {
      // This test verifies that the registration effect deps are [id, context] only
      // by checking that a stable context doesn't cause re-registration
      const stableContext = {
        register: mockRegister,
        unregister: mockUnregister,
        resize: mockResize,
        setExpanded: mockSetExpanded,
        queueLayoutChange: mockQueueLayoutChange,
        registerLayoutCallback: mockRegisterLayoutCallback,
        unregisterLayoutCallback: mockUnregisterLayoutCallback,
      };

      const { rerender } = render(
        <ExpansionContext.Provider value={stableContext}>
          <ExpansionPanel id="test-panel" summary={<div>Test Summary</div>} minHeight={100}>
            <div>Test Content</div>
          </ExpansionPanel>
        </ExpansionContext.Provider>,
      );

      expect(mockRegister).toHaveBeenCalledTimes(1);

      mockRegister.mockClear();
      mockUnregister.mockClear();

      // Rerender with changed props but SAME id and context
      rerender(
        <ExpansionContext.Provider value={stableContext}>
          <ExpansionPanel id="test-panel" summary={<div>Test Summary</div>} minHeight={150} defaultHeight={400}>
            <div>Test Content</div>
          </ExpansionPanel>
        </ExpansionContext.Provider>,
      );

      // Should NOT call register/unregister (no re-registration)
      expect(mockUnregister).not.toHaveBeenCalled();
      expect(mockRegister).not.toHaveBeenCalled();
    });
  });

  describe('Expand/Collapse Behavior', () => {
    it('should start expanded by default', () => {
      renderPanel();

      const panel = screen.getByText('Test Summary').closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'true');
    });

    it('should start collapsed when defaultExpanded is false', () => {
      renderPanel({ defaultExpanded: false });

      const panel = screen.getByText('Test Summary').closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'false');
    });

    it('should toggle expansion when summary is clicked', () => {
      renderPanel({ defaultExpanded: true });

      const summary = screen.getByText('Test Summary');

      fireEvent.click(summary);

      expect(mockSetExpanded).toHaveBeenCalledWith('test-panel', false);

      const panel = summary.closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'false');
    });

    it('should NOT allow expansion when there are no children', () => {
      renderPanel({ children: null });

      const summary = screen.getByText('Test Summary');

      fireEvent.click(summary);

      // Should not call setExpanded
      expect(mockSetExpanded).not.toHaveBeenCalled();
    });

    it('should NOT allow collapse when collapsible is false', () => {
      renderPanel({ defaultExpanded: true, collapsible: false });

      const summary = screen.getByText('Test Summary');
      const panel = summary.closest('.expansion-panel');

      // Should start expanded
      expect(panel).toHaveAttribute('data-expanded', 'true');

      fireEvent.click(summary);

      // Should not call setExpanded - panel cannot be collapsed
      expect(mockSetExpanded).not.toHaveBeenCalled();
      // Should still be expanded
      expect(panel).toHaveAttribute('data-expanded', 'true');
    });

    it('should allow resize even when collapsible is false', () => {
      renderPanel({ id: 'non-collapsible', minHeight: 100, defaultExpanded: true, collapsible: false });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      // Mock offsetHeight
      Object.defineProperty(panel, 'offsetHeight', { value: 300, configurable: true });

      fireEvent.mouseDown(resizeHandle, { clientY: 100 });

      fireEvent(
        document,
        new MouseEvent('mousemove', {
          clientY: 150,
          bubbles: true,
        }),
      );

      // Should still allow resize
      expect(mockResize).toHaveBeenCalledWith('non-collapsible', 350);

      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
    });

    it('should update expansion state when defaultExpanded prop changes', () => {
      const { rerender } = renderPanel({ id: 'test-panel', defaultExpanded: false });

      mockSetExpanded.mockClear();

      // Change defaultExpanded prop
      rerender(
        <ExpansionContext.Provider
          value={{
            register: mockRegister,
            unregister: mockUnregister,
            resize: mockResize,
            setExpanded: mockSetExpanded,
            queueLayoutChange: mockQueueLayoutChange,
            registerLayoutCallback: mockRegisterLayoutCallback,
            unregisterLayoutCallback: mockUnregisterLayoutCallback,
          }}
        >
          <ExpansionPanel id="test-panel" summary={<div>Test Summary</div>} defaultExpanded>
            <div>Test Content</div>
          </ExpansionPanel>
        </ExpansionContext.Provider>,
      );

      expect(mockSetExpanded).toHaveBeenCalledWith('test-panel', true);
    });

    it('should queue layout change callback when onLayoutChange is provided and panel is toggled', () => {
      const onLayoutChange = vi.fn();
      renderPanel({ id: 'test-panel', defaultExpanded: true, onLayoutChange });

      const summary = screen.getByText('Test Summary');

      fireEvent.click(summary);

      // Should queue a layout change callback
      expect(mockQueueLayoutChange).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should NOT queue layout change callback when onLayoutChange is not provided', () => {
      renderPanel({ id: 'test-panel', defaultExpanded: true });

      const summary = screen.getByText('Test Summary');

      fireEvent.click(summary);

      // Should not queue any callback when onLayoutChange is not provided
      expect(mockQueueLayoutChange).not.toHaveBeenCalled();
    });
  });

  describe('Resize Handle - Bottom Handle (Normal Panels)', () => {
    it('should show resize handle when expanded', () => {
      renderPanel({ id: 'normal-panel', defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle');
      expect(resizeHandle).toBeInTheDocument();
      expect(resizeHandle).not.toHaveClass('expansion-panel__resize-handle--top');
    });

    it('should NOT show resize handle when collapsed', () => {
      renderPanel({ id: 'normal-panel', defaultExpanded: false });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle');
      expect(resizeHandle).not.toBeInTheDocument();
    });

    it('should initiate resize on mousedown and call resize on mousemove (bottom handle)', () => {
      renderPanel({ id: 'normal-panel', minHeight: 100, defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      // Mock offsetHeight
      Object.defineProperty(panel, 'offsetHeight', { value: 300, configurable: true });

      fireEvent.mouseDown(resizeHandle, { clientY: 100 });

      expect(panel).toHaveAttribute('data-resizing', 'true');

      // Simulate mousemove - drag down 50px (resize is immediate)
      fireEvent(
        document,
        new MouseEvent('mousemove', {
          clientY: 150, // 50px down
          bubbles: true,
        }),
      );

      // Normal bottom handle: deltaY = 150 - 100 = 50, newHeight = 300 + 50 = 350
      expect(mockResize).toHaveBeenCalledWith('normal-panel', 350);

      // Cleanup
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
    });

    it('should constrain resize to minHeight (bottom handle)', () => {
      renderPanel({ id: 'normal-panel', minHeight: 100, defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      Object.defineProperty(panel, 'offsetHeight', { value: 150, configurable: true });

      fireEvent.mouseDown(resizeHandle, { clientY: 100 });

      // Simulate mousemove - drag up 100px (would make it 50px, but minHeight is 100)
      fireEvent(
        document,
        new MouseEvent('mousemove', {
          clientY: 0, // 100px up
          bubbles: true,
        }),
      );

      // Should be constrained to minHeight: 100
      expect(mockResize).toHaveBeenCalledWith('normal-panel', 100);

      // Cleanup
      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
    });

    it('should stop resizing on mouseup (bottom handle)', () => {
      renderPanel({ id: 'normal-panel', defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      fireEvent.mouseDown(resizeHandle, { clientY: 100 });

      expect(panel).toHaveAttribute('data-resizing', 'true');

      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));

      expect(panel).toHaveAttribute('data-resizing', 'false');
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      const { unmount } = renderPanel({ id: 'test-panel' });

      unmount();

      // Should clean up mousemove and mouseup listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should remove event listeners after resize completes', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      renderPanel({ id: 'test-panel', defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;

      removeEventListenerSpy.mockClear();

      fireEvent.mouseDown(resizeHandle, { clientY: 100 });

      fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Scroll Callback', () => {
    it('should call onScroll callback when content is scrolled', () => {
      const onScroll = vi.fn();
      renderPanel({ onScroll });

      const content = document.querySelector('.expansion-panel__content') as HTMLElement;

      fireEvent.scroll(content);

      expect(onScroll).toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should render summary content', () => {
      renderPanel({ summary: <div>Custom Summary</div> });

      expect(screen.getByText('Custom Summary')).toBeInTheDocument();
    });

    it('should render children content', () => {
      renderPanel({ children: <div>Custom Content</div> });

      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('should apply correct CSS classes', () => {
      renderPanel({ id: 'test-panel', defaultExpanded: true });

      const panel = screen.getByText('Test Summary').closest('.expansion-panel');
      expect(panel).toHaveClass('expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'true');
      expect(panel).toHaveAttribute('data-resizing', 'false');
    });
  });

  describe('Keyboard Behavior', () => {
    it('should toggle expansion on Enter key', () => {
      renderPanel({ defaultExpanded: true });

      const summary = screen.getByText('Test Summary').closest('.expansion-panel__summary') as HTMLElement;

      fireEvent.keyDown(summary, { key: 'Enter' });

      expect(mockSetExpanded).toHaveBeenCalledWith('test-panel', false);
    });

    it('should toggle expansion on Space key', () => {
      renderPanel({ defaultExpanded: true });

      const summary = screen.getByText('Test Summary').closest('.expansion-panel__summary') as HTMLElement;

      fireEvent.keyDown(summary, { key: ' ' });

      expect(mockSetExpanded).toHaveBeenCalledWith('test-panel', false);
    });

    it('should NOT toggle when a modifier key is held', () => {
      renderPanel({ defaultExpanded: true });

      const summary = screen.getByText('Test Summary').closest('.expansion-panel__summary') as HTMLElement;

      fireEvent.keyDown(summary, { key: 'Enter', ctrlKey: true });

      expect(mockSetExpanded).not.toHaveBeenCalled();
    });

    it.each(['{Enter}', ' '])('should let a focused button inside the summary be activated with "%s"', async (key) => {
      const user = userEvent.setup();
      const onButtonClick = vi.fn();
      renderPanel({
        defaultExpanded: true,
        summary: (
          // Summary buttons stop click propagation so activating them does not toggle the panel.
          <button
            type="button"
            data-testid="summary-button"
            onClick={(event) => {
              event.stopPropagation();
              onButtonClick();
            }}
          >
            Confirm
          </button>
        ),
      });

      screen.getByTestId('summary-button').focus();
      await user.keyboard(key);

      expect(onButtonClick).toHaveBeenCalledTimes(1);
      // Activating the button must not toggle the surrounding panel.
      expect(mockSetExpanded).not.toHaveBeenCalled();
    });

    it('should NOT toggle on Space key from a child input inside summary', () => {
      renderPanel({
        defaultExpanded: true,
        summary: (
          <div>
            Test Summary
            <input data-testid="child-input" type="text" />
          </div>
        ),
      });

      const input = screen.getByTestId('child-input');
      fireEvent.keyDown(input, { key: ' ' });

      expect(mockSetExpanded).not.toHaveBeenCalled();
      const panel = screen.getByText('Test Summary').closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'true');
    });

    it('should NOT toggle on Enter key from a child input inside summary', () => {
      renderPanel({
        defaultExpanded: true,
        summary: (
          <div>
            Test Summary
            <input data-testid="child-input" type="text" />
          </div>
        ),
      });

      const input = screen.getByTestId('child-input');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockSetExpanded).not.toHaveBeenCalled();
      const panel = screen.getByText('Test Summary').closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'true');
    });
  });

  describe('Layout Callback Registration', () => {
    it('should register layout callback when onLayoutChange is provided', () => {
      const onLayoutChange = vi.fn();
      renderPanel({ id: 'test-panel', onLayoutChange });

      // Should register the callback
      expect(mockRegisterLayoutCallback).toHaveBeenCalledWith('test-panel', expect.any(Function));
    });

    it('should unregister layout callback on unmount when onLayoutChange was provided', () => {
      const onLayoutChange = vi.fn();
      const { unmount } = renderPanel({ id: 'test-panel', onLayoutChange });

      unmount();

      // Should unregister the callback
      expect(mockUnregisterLayoutCallback).toHaveBeenCalledWith('test-panel');
    });

    it('should NOT register layout callback when onLayoutChange is not provided', () => {
      renderPanel({ id: 'test-panel' });

      // Should not register callback when no onLayoutChange provided
      expect(mockRegisterLayoutCallback).not.toHaveBeenCalled();
    });
  });

  describe('Generated id', () => {
    it('should register panels without an id under distinct generated ids', () => {
      render(
        <ExpansionContext.Provider
          value={{
            register: mockRegister,
            unregister: mockUnregister,
            resize: mockResize,
            setExpanded: mockSetExpanded,
            queueLayoutChange: mockQueueLayoutChange,
            registerLayoutCallback: mockRegisterLayoutCallback,
            unregisterLayoutCallback: mockUnregisterLayoutCallback,
          }}
        >
          <ExpansionPanel summary="Panel 1">Content 1</ExpansionPanel>
          <ExpansionPanel summary="Panel 2">Content 2</ExpansionPanel>
        </ExpansionContext.Provider>,
      );

      const [firstId, secondId] = mockRegister.mock.calls.map(([id]) => id);
      expect(firstId).toEqual(expect.any(String));
      expect(secondId).toEqual(expect.any(String));
      expect(firstId).not.toBe(secondId);
    });
  });

  describe('Layout change reporting', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const lastQueuedLayoutChange = (): (() => void) => mockQueueLayoutChange.mock.calls.at(-1)?.[0];

    it('should report the panel id from the layout change queued on mount', () => {
      const onLayoutChange = vi.fn();
      renderPanel({ id: 'test-panel', onLayoutChange });

      lastQueuedLayoutChange()();

      expect(onLayoutChange).toHaveBeenCalledExactlyOnceWith('test-panel');
    });

    it('should report the panel id from the layout change queued on toggle', () => {
      const onLayoutChange = vi.fn();
      renderPanel({ id: 'test-panel', onLayoutChange });

      fireEvent.click(screen.getByText('Test Summary'));
      lastQueuedLayoutChange()();

      expect(onLayoutChange).toHaveBeenCalledExactlyOnceWith('test-panel');
    });

    it('should report the panel id from the layout change queued on unmount', () => {
      const onLayoutChange = vi.fn();
      const { unmount } = renderPanel({ id: 'test-panel', onLayoutChange });

      unmount();
      lastQueuedLayoutChange()();

      expect(onLayoutChange).toHaveBeenCalledExactlyOnceWith('test-panel');
    });

    it('should report the panel id from the registered layout callback', () => {
      const onLayoutChange = vi.fn();
      renderPanel({ id: 'test-panel', onLayoutChange });
      const [, layoutCallback] = mockRegisterLayoutCallback.mock.calls[0];

      layoutCallback();

      expect(onLayoutChange).toHaveBeenCalledExactlyOnceWith('test-panel');
    });

    it('should report the layout on every animation frame while the panel is resized', () => {
      // The global test setup runs animation frames as microtasks, so the frame loop of a drag would never yield.
      // Collect the frames instead and run them one by one.
      const frames: FrameRequestCallback[] = [];
      vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));
      vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {
        frames.length = 0;
      });
      const runNextFrame = () => {
        frames.splice(0).forEach((callback) => {
          callback(performance.now());
        });
      };
      const onLayoutChange = vi.fn();
      renderPanel({ id: 'test-panel', onLayoutChange, defaultExpanded: true });
      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;

      fireEvent.mouseDown(resizeHandle, { clientY: 100 });
      runNextFrame();
      runNextFrame();
      const callsDuringDrag = onLayoutChange.mock.calls.length;
      fireEvent.mouseUp(document);
      runNextFrame();

      expect(callsDuringDrag).toBe(2);
      // One final report on mouseup, and no more frames after the drag ended
      expect(onLayoutChange).toHaveBeenCalledTimes(3);
      expect(onLayoutChange).toHaveBeenCalledWith('test-panel');
    });
  });
});
