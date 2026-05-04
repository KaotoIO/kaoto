import { act, render, renderHook } from '@testing-library/react';
import React from 'react';

import { DocumentTreeState, useDocumentTreeStore } from '../store/document-tree.store';
import { useConnectionPortSync } from './useConnectionPortSync.hook';

describe('useConnectionPortSync', () => {
  const documentId = 'test-document-id';
  let mockSetNodesConnectionPorts: jest.Mock;

  beforeEach(() => {
    mockSetNodesConnectionPorts = jest.fn();
    useDocumentTreeStore.setState({
      nodesConnectionPorts: {},
      nodesConnectionPortsArray: {},
      setNodesConnectionPorts: mockSetNodesConnectionPorts,
    } as Partial<DocumentTreeState>);

    // Mock requestAnimationFrame
    jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('hook return value', () => {
    it('should return syncConnectionPorts callback and virtuosoComponents', () => {
      const { result } = renderHook(() => useConnectionPortSync(documentId));

      expect(result.current).toHaveProperty('syncConnectionPorts');
      expect(result.current).toHaveProperty('virtuosoComponents');
      expect(typeof result.current.syncConnectionPorts).toBe('function');
      expect(typeof result.current.virtuosoComponents).toBe('object');
    });

    it('should memoize virtuosoComponents object', () => {
      const { result, rerender } = renderHook(() => useConnectionPortSync(documentId));

      const firstComponents = result.current.virtuosoComponents;
      rerender();
      const secondComponents = result.current.virtuosoComponents;

      expect(firstComponents).toBe(secondComponents);
    });

    it('should have Scroller component in virtuosoComponents', () => {
      const { result } = renderHook(() => useConnectionPortSync(documentId));

      expect(result.current.virtuosoComponents).toHaveProperty('Scroller');
      expect(result.current.virtuosoComponents?.Scroller).toBeDefined();
    });
  });

  describe('syncConnectionPorts', () => {
    it('should use requestAnimationFrame when called', () => {
      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('should cancel pending animation frame before scheduling new one', () => {
      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
        result.current.syncConnectionPorts();
      });

      expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should normalize documentIds to an array and sync correctly for both single string and array of strings inputs', () => {
      const querySelectorAllSpy = jest
        .spyOn(document, 'querySelectorAll')
        .mockReturnValue([] as unknown as NodeListOf<Element>);

      // single string branch
      const { result, rerender } = renderHook(({ id }) => useConnectionPortSync(id), {
        initialProps: { id: 'single-id' as string | string[] },
      });

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(querySelectorAllSpy).toHaveBeenCalledWith(expect.stringContaining('single-id'));
      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith('single-id', {});

      // array of strings branch
      rerender({ id: ['array-id-1', 'array-id-2'] });

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(querySelectorAllSpy).toHaveBeenCalledWith(expect.stringContaining('array-id-1'));
      expect(querySelectorAllSpy).toHaveBeenCalledWith(expect.stringContaining('array-id-2'));
      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith('array-id-1', {});
      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith('array-id-2', {});

      querySelectorAllSpy.mockRestore();
    });

    it('should query for connection port elements with correct selector', () => {
      const querySelectorAllSpy = jest
        .spyOn(document, 'querySelectorAll')
        .mockReturnValue([] as unknown as NodeListOf<Element>);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(querySelectorAllSpy).toHaveBeenCalledWith(
        `[data-connection-port="true"][data-document-id="${documentId}"]`,
      );
      querySelectorAllSpy.mockRestore();
    });

    it('should not set connection ports when no elements found', () => {
      const querySelectorAllSpy = jest
        .spyOn(document, 'querySelectorAll')
        .mockReturnValue([] as unknown as NodeListOf<Element>);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith(documentId, {});
      querySelectorAllSpy.mockRestore();
    });

    it('should skip elements without nodePath data attribute', () => {
      const mockElement = {
        dataset: {},
        getBoundingClientRect: jest.fn().mockReturnValue({ x: 100, y: 200, width: 50, height: 30 }),
      };
      document.querySelectorAll = jest.fn().mockReturnValue([mockElement]);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith(documentId, {});
    });

    it('should include EDGE elements without visibility check', () => {
      const mockElement = {
        dataset: {
          nodePath: 'test-path:EDGE:top',
        },
        getBoundingClientRect: jest.fn().mockReturnValue({ x: 100, y: 200, width: 50, height: 30 }),
        closest: jest.fn().mockReturnValue(null),
      };
      document.querySelectorAll = jest.fn().mockReturnValue([mockElement]);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith(documentId, {
        'test-path:EDGE:top': [125, 215], // x + width/2, y + height/2
      });
    });

    it('should include bottom EDGE elements', () => {
      const mockElement = {
        dataset: {
          nodePath: 'test-path:EDGE:bottom',
        },
        getBoundingClientRect: jest.fn().mockReturnValue({ x: 100, y: 200, width: 50, height: 30 }),
        closest: jest.fn().mockReturnValue(null),
      };
      document.querySelectorAll = jest.fn().mockReturnValue([mockElement]);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith(documentId, {
        'test-path:EDGE:bottom': [125, 215],
      });
    });

    it('should check visibility for non-EDGE elements', () => {
      const mockContainer = {
        getBoundingClientRect: jest.fn().mockReturnValue({ top: 0, bottom: 500 }),
      };
      const mockElement = {
        dataset: {
          nodePath: 'test-path',
        },
        getBoundingClientRect: jest
          .fn()
          .mockReturnValue({ x: 100, y: 200, width: 50, height: 30, top: 200, bottom: 230 }),
        closest: jest.fn().mockReturnValue(mockContainer),
      };
      document.querySelectorAll = jest.fn().mockReturnValue([mockElement]);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(mockElement.closest).toHaveBeenCalledWith('.expansion-panel__content');
      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith(documentId, {
        'test-path': [125, 215],
      });
    });

    it('should exclude non-visible elements', () => {
      const mockContainer = {
        getBoundingClientRect: jest.fn().mockReturnValue({ top: 0, bottom: 100 }),
      };
      const mockElement = {
        dataset: {
          nodePath: 'test-path',
        },
        getBoundingClientRect: jest
          .fn()
          .mockReturnValue({ x: 100, y: 200, width: 50, height: 30, top: 200, bottom: 230 }),
        closest: jest.fn().mockReturnValue(mockContainer),
      };
      document.querySelectorAll = jest.fn().mockReturnValue([mockElement]);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith(documentId, {});
    });

    it('should handle multiple elements', () => {
      const mockElement1 = {
        dataset: { nodePath: 'path1:EDGE:top' },
        getBoundingClientRect: jest.fn().mockReturnValue({ x: 0, y: 0, width: 10, height: 10 }),
      };
      const mockElement2 = {
        dataset: { nodePath: 'path2:EDGE:bottom' },
        getBoundingClientRect: jest.fn().mockReturnValue({ x: 50, y: 50, width: 20, height: 20 }),
      };
      document.querySelectorAll = jest.fn().mockReturnValue([mockElement1, mockElement2]);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith(documentId, {
        'path1:EDGE:top': [5, 5],
        'path2:EDGE:bottom': [60, 60],
      });
    });

    it('should assume element is visible when no scroll container found', () => {
      const mockElement = {
        dataset: { nodePath: 'test-path' },
        getBoundingClientRect: jest.fn().mockReturnValue({ x: 100, y: 200, width: 50, height: 30 }),
        closest: jest.fn().mockReturnValue(null),
      };
      document.querySelectorAll = jest.fn().mockReturnValue([mockElement]);

      const { result } = renderHook(() => useConnectionPortSync(documentId));

      act(() => {
        result.current.syncConnectionPorts();
      });

      expect(mockSetNodesConnectionPorts).toHaveBeenCalledWith(documentId, {
        'test-path': [125, 215],
      });
    });
  });

  describe('Virtuoso Scroller component', () => {
    it('should render Scroller component with props', () => {
      const { result } = renderHook(() => useConnectionPortSync(documentId));
      const Scroller = result.current.virtuosoComponents?.Scroller as React.ComponentType<
        React.HTMLProps<HTMLDivElement>
      >;

      expect(Scroller).toBeDefined();

      const { container } = render(
        <Scroller style={{ height: '100px' }}>
          <div>Child content</div>
        </Scroller>,
      );

      const scrollerDiv = container.firstChild as HTMLElement;
      expect(scrollerDiv).toBeInTheDocument();
      expect(scrollerDiv.tagName).toBe('DIV');
      expect(scrollerDiv.textContent).toContain('Child content');
    });

    it('should call syncConnectionPorts on scroll event', () => {
      document.querySelectorAll = jest.fn().mockReturnValue([]);

      const { result } = renderHook(() => useConnectionPortSync(documentId));
      const Scroller = result.current.virtuosoComponents?.Scroller as React.ComponentType<
        React.HTMLProps<HTMLDivElement>
      >;

      expect(Scroller).toBeDefined();

      const { container } = render(
        <Scroller style={{ height: '100px' }}>
          <div>Content</div>
        </Scroller>,
      );

      const scrollerDiv = container.firstChild as HTMLElement;

      act(() => {
        scrollerDiv.dispatchEvent(new Event('scroll'));
      });

      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
      expect(mockSetNodesConnectionPorts).toHaveBeenCalled();
    });

    it('should forward ref correctly', () => {
      const { result } = renderHook(() => useConnectionPortSync(documentId));
      const Scroller = result.current.virtuosoComponents?.Scroller as React.ComponentType<
        React.HTMLProps<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }
      >;

      expect(Scroller).toBeDefined();

      const ref = React.createRef<HTMLDivElement>();
      render(
        <Scroller ref={ref} style={{ height: '100px' }}>
          <div>Content</div>
        </Scroller>,
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('hook stability', () => {
    it('should maintain syncConnectionPorts reference when documentId does not change', () => {
      const { result, rerender } = renderHook(() => useConnectionPortSync(documentId));

      const firstCallback = result.current.syncConnectionPorts;
      rerender();
      const secondCallback = result.current.syncConnectionPorts;

      expect(firstCallback).toBe(secondCallback);
    });

    it('should update syncConnectionPorts when documentId changes', () => {
      const { result, rerender } = renderHook(({ id }) => useConnectionPortSync(id), {
        initialProps: { id: 'doc1' },
      });

      const firstCallback = result.current.syncConnectionPorts;

      rerender({ id: 'doc2' });
      const secondCallback = result.current.syncConnectionPorts;

      expect(firstCallback).not.toBe(secondCallback);
    });
  });
});
