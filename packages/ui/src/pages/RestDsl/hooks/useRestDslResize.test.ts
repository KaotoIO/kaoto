import { act, renderHook } from '@testing-library/react';

import { useRestDslResize } from './useRestDslResize';

describe('useRestDslResize', () => {
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('initializes with default width from localStorage', () => {
    const { result } = renderHook(() => useRestDslResize());

    expect(result.current.navWidth).toBe(288);
  });

  it('attaches mouse event listeners on resize start', () => {
    const { result } = renderHook(() => useRestDslResize());

    act(() => {
      result.current.handleResizeStart({
        preventDefault: jest.fn(),
        clientX: 300,
      } as unknown as React.MouseEvent);
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });

  it('updates width during resize', () => {
    const { result } = renderHook(() => useRestDslResize());

    act(() => {
      result.current.handleResizeStart({
        preventDefault: jest.fn(),
        clientX: 288,
      } as unknown as React.MouseEvent);
    });

    act(() => {
      const mouseMoveHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'mousemove')?.[1];
      mouseMoveHandler(new MouseEvent('mousemove', { clientX: 400 }));
    });

    expect(result.current.navWidth).toBe(400);
  });

  it('enforces minimum width constraint', () => {
    const { result } = renderHook(() => useRestDslResize());

    act(() => {
      result.current.handleResizeStart({
        preventDefault: jest.fn(),
        clientX: 288,
      } as unknown as React.MouseEvent);
    });

    act(() => {
      const mouseMoveHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'mousemove')?.[1];
      mouseMoveHandler(new MouseEvent('mousemove', { clientX: 100 }));
    });

    expect(result.current.navWidth).toBe(220);
  });

  it('removes event listeners on mouseup', () => {
    const { result } = renderHook(() => useRestDslResize());

    act(() => {
      result.current.handleResizeStart({
        preventDefault: jest.fn(),
        clientX: 288,
      } as unknown as React.MouseEvent);
    });

    act(() => {
      const mouseUpHandler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'mouseup')?.[1];
      mouseUpHandler(new MouseEvent('mouseup'));
    });

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
  });
});
