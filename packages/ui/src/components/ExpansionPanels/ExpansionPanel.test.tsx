import { act, fireEvent, render, screen } from '@testing-library/react';

import { ExpansionContext } from './ExpansionContext';
import { ExpansionPanel } from './ExpansionPanel';

describe('ExpansionPanel', () => {
  let mockRegister: jest.Mock;
  let mockUnregister: jest.Mock;
  let mockResize: jest.Mock;
  let mockSetExpanded: jest.Mock;

  beforeEach(() => {
    mockRegister = jest.fn();
    mockUnregister = jest.fn();
    mockResize = jest.fn();
    mockSetExpanded = jest.fn();
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

      act(() => {
        fireEvent.click(summary);
      });

      expect(mockSetExpanded).toHaveBeenCalledWith('test-panel', false);

      const panel = summary.closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'false');
    });

    it('should NOT allow expansion when there are no children', () => {
      renderPanel({ children: null });

      const summary = screen.getByText('Test Summary');

      act(() => {
        fireEvent.click(summary);
      });

      // Should not call setExpanded
      expect(mockSetExpanded).not.toHaveBeenCalled();
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
          }}
        >
          <ExpansionPanel id="test-panel" summary={<div>Test Summary</div>} defaultExpanded={true}>
            <div>Test Content</div>
          </ExpansionPanel>
        </ExpansionContext.Provider>,
      );

      expect(mockSetExpanded).toHaveBeenCalledWith('test-panel', true);
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

      act(() => {
        fireEvent.mouseDown(resizeHandle, { clientY: 100 });
      });

      expect(panel).toHaveAttribute('data-resizing', 'true');

      // Simulate mousemove - drag down 50px
      act(() => {
        fireEvent(
          document,
          new MouseEvent('mousemove', {
            clientY: 150, // 50px down
            bubbles: true,
          }),
        );
      });

      // Normal bottom handle: deltaY = 150 - 100 = 50, newHeight = 300 + 50 = 350
      expect(mockResize).toHaveBeenCalledWith('normal-panel', 350, false);
    });

    it('should constrain resize to minHeight (bottom handle)', () => {
      renderPanel({ id: 'normal-panel', minHeight: 100, defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      Object.defineProperty(panel, 'offsetHeight', { value: 150, configurable: true });

      act(() => {
        fireEvent.mouseDown(resizeHandle, { clientY: 100 });
      });

      // Simulate mousemove - drag up 100px (would make it 50px, but minHeight is 100)
      act(() => {
        fireEvent(
          document,
          new MouseEvent('mousemove', {
            clientY: 0, // 100px up
            bubbles: true,
          }),
        );
      });

      // Should be constrained to minHeight: 100
      expect(mockResize).toHaveBeenCalledWith('normal-panel', 100, false);
    });

    it('should stop resizing on mouseup (bottom handle)', () => {
      renderPanel({ id: 'normal-panel', defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      act(() => {
        fireEvent.mouseDown(resizeHandle, { clientY: 100 });
      });

      expect(panel).toHaveAttribute('data-resizing', 'true');

      act(() => {
        fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
      });

      expect(panel).toHaveAttribute('data-resizing', 'false');
    });
  });

  describe('Resize Handle - Top Handle (Body Panel)', () => {
    it('should show resize handle at TOP when id is source-body', () => {
      renderPanel({ id: 'source-body', defaultExpanded: true });

      const topHandle = document.querySelector('.expansion-panel__resize-handle--top');
      expect(topHandle).toBeInTheDocument();

      // Should NOT have bottom handle
      const handles = document.querySelectorAll('.expansion-panel__resize-handle');
      expect(handles).toHaveLength(1);
    });

    it('should set data-top-handle attribute for body panel', () => {
      renderPanel({ id: 'source-body' });

      const panel = screen.getByText('Test Summary').closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-top-handle', 'true');
    });

    it('should invert delta for top handle resize (drag down = shrink, drag up = grow)', () => {
      renderPanel({ id: 'source-body', minHeight: 100, defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle--top') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      Object.defineProperty(panel, 'offsetHeight', { value: 300, configurable: true });

      act(() => {
        fireEvent.mouseDown(resizeHandle, { clientY: 100 });
      });

      // Simulate mousemove - drag DOWN 50px (should SHRINK panel)
      act(() => {
        fireEvent(
          document,
          new MouseEvent('mousemove', {
            clientY: 150, // 50px down
            bubbles: true,
          }),
        );
      });

      // Top handle inverted: deltaY = 150 - 100 = 50, newHeight = 300 - 50 = 250
      expect(mockResize).toHaveBeenCalledWith('source-body', 250, true);
    });

    it('should grow panel when dragging UP on top handle', () => {
      renderPanel({ id: 'source-body', minHeight: 100, defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle--top') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      Object.defineProperty(panel, 'offsetHeight', { value: 300, configurable: true });

      act(() => {
        fireEvent.mouseDown(resizeHandle, { clientY: 100 });
      });

      // Simulate mousemove - drag UP 50px (should GROW panel)
      act(() => {
        fireEvent(
          document,
          new MouseEvent('mousemove', {
            clientY: 50, // 50px up
            bubbles: true,
          }),
        );
      });

      // Top handle inverted: deltaY = 50 - 100 = -50, newHeight = 300 - (-50) = 350
      expect(mockResize).toHaveBeenCalledWith('source-body', 350, true);
    });

    it('should constrain top handle resize to minHeight', () => {
      renderPanel({ id: 'source-body', minHeight: 100, defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle--top') as HTMLElement;
      const panel = screen.getByText('Test Summary').closest('.expansion-panel') as HTMLElement;

      Object.defineProperty(panel, 'offsetHeight', { value: 150, configurable: true });

      act(() => {
        fireEvent.mouseDown(resizeHandle, { clientY: 100 });
      });

      // Drag down 100px (would shrink to 50px, but minHeight is 100)
      act(() => {
        fireEvent(
          document,
          new MouseEvent('mousemove', {
            clientY: 200,
            bubbles: true,
          }),
        );
      });

      // Should be constrained to minHeight: 100
      expect(mockResize).toHaveBeenCalledWith('source-body', 100, true);
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = renderPanel({ id: 'test-panel' });

      unmount();

      // Should clean up mousemove and mouseup listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should remove event listeners after resize completes', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

      renderPanel({ id: 'test-panel', defaultExpanded: true });

      const resizeHandle = document.querySelector('.expansion-panel__resize-handle') as HTMLElement;

      removeEventListenerSpy.mockClear();

      act(() => {
        fireEvent.mouseDown(resizeHandle, { clientY: 100 });
      });

      act(() => {
        fireEvent(document, new MouseEvent('mouseup', { bubbles: true }));
      });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Scroll Callback', () => {
    it('should call onScroll callback when content is scrolled', () => {
      const onScroll = jest.fn();
      renderPanel({ onScroll });

      const content = document.querySelector('.expansion-panel__content') as HTMLElement;

      act(() => {
        fireEvent.scroll(content);
      });

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
});
