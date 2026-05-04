import { renderHook } from '@testing-library/react';

import { useResizeObserver } from './useResizeObserver.hook';

describe('useResizeObserver', () => {
  let observeMock: jest.Mock;
  let disconnectMock: jest.Mock;

  beforeEach(() => {
    observeMock = jest.fn();
    disconnectMock = jest.fn();

    // Set up the global mock
    global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
      observe: observeMock,
      unobserve: jest.fn(),
      disconnect: disconnectMock,
      // Helper to trigger the callback manually in tests
      trigger: () => callback([{ contentRect: {} }], {}),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize the observer and observe the element', () => {
    const div = document.createElement('div');
    const ref = { current: div };

    renderHook(() => useResizeObserver(ref, jest.fn()));

    expect(global.ResizeObserver).toHaveBeenCalled();
    expect(observeMock).toHaveBeenCalledWith(div);
  });

  it('should trigger the callback when the observer fires', () => {
    const div = document.createElement('div');
    const ref = { current: div };
    const callback = jest.fn();

    // Access the callback passed to the constructor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let capturedCallback: any;
    (global.ResizeObserver as jest.Mock).mockImplementation((cb) => {
      capturedCallback = cb;
      return { observe: jest.fn(), disconnect: jest.fn() };
    });

    renderHook(() => useResizeObserver(ref, callback));

    // Manually invoke the ResizeObserver callback
    capturedCallback();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should disconnect on unmount to prevent memory leaks', () => {
    const div = document.createElement('div');
    const ref = { current: div };

    const { unmount } = renderHook(() => useResizeObserver(ref, jest.fn()));

    unmount();

    expect(disconnectMock).toHaveBeenCalled();
  });

  it('should not observe if the ref is null', () => {
    const ref = { current: null };

    renderHook(() => useResizeObserver(ref, jest.fn()));

    expect(observeMock).not.toHaveBeenCalled();
  });
});
