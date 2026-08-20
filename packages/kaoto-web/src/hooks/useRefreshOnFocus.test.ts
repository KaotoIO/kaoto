import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRefreshOnFocus } from './useRefreshOnFocus';

describe('useRefreshOnFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should call refresh callback when window gains focus after 5 seconds', () => {
    const mockRefresh = vi.fn();
    renderHook(() => {
      useRefreshOnFocus(mockRefresh);
    });

    // Simulate time passing
    vi.advanceTimersByTime(6000);

    // Trigger focus event
    window.dispatchEvent(new Event('focus'));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should not call refresh callback if less than 5 seconds have passed', () => {
    const mockRefresh = vi.fn();
    renderHook(() => {
      useRefreshOnFocus(mockRefresh);
    });

    // Simulate only 3 seconds passing
    vi.advanceTimersByTime(3000);

    // Trigger focus event
    window.dispatchEvent(new Event('focus'));

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should not call refresh callback when disabled', () => {
    const mockRefresh = vi.fn();
    renderHook(() => {
      useRefreshOnFocus(mockRefresh, false);
    });

    // Simulate time passing
    vi.advanceTimersByTime(6000);

    // Trigger focus event
    window.dispatchEvent(new Event('focus'));

    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should call refresh callback multiple times with sufficient time between focuses', () => {
    const mockRefresh = vi.fn();
    renderHook(() => {
      useRefreshOnFocus(mockRefresh);
    });

    // First focus after 6 seconds
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Second focus after another 6 seconds
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(2);

    // Third focus after another 6 seconds
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(3);
  });

  it('should not call refresh callback for rapid focus events', () => {
    const mockRefresh = vi.fn();
    renderHook(() => {
      useRefreshOnFocus(mockRefresh);
    });

    // First focus after 6 seconds
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Rapid focus events (less than 5 seconds apart)
    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(1000);
    window.dispatchEvent(new Event('focus'));

    // Should still only have been called once
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should not call refresh callback when two suppressed focuses are less than five seconds apart', () => {
    const mockRefresh = vi.fn();
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    renderHook(() => {
      useRefreshOnFocus(mockRefresh);
    });

    // First focus at 3s — suppressed (< 5s since mount)
    vi.setSystemTime(startTime + 3000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).not.toHaveBeenCalled();

    // Second focus at 5.1s — only 2.1s since last focus, must still be suppressed
    vi.setSystemTime(startTime + 5100);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('should clean up event listener on unmount', () => {
    const mockRefresh = vi.fn();
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => {
      useRefreshOnFocus(mockRefresh);
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
  });

  it('should update behavior when enabled prop changes', () => {
    const mockRefresh = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => {
        useRefreshOnFocus(mockRefresh, enabled);
      },
      {
        initialProps: { enabled: true },
      },
    );

    // First focus after 6 seconds (enabled)
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    // Disable the hook
    rerender({ enabled: false });

    // Focus after another 6 seconds (disabled)
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(1); // Should not have been called again

    // Re-enable the hook
    rerender({ enabled: true });

    // Focus after another 6 seconds (enabled again)
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });

  it('should handle callback changes', () => {
    const mockRefresh1 = vi.fn();
    const mockRefresh2 = vi.fn();

    const { rerender } = renderHook(
      ({ callback }) => {
        useRefreshOnFocus(callback);
      },
      {
        initialProps: { callback: mockRefresh1 },
      },
    );

    // First focus with first callback
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh1).toHaveBeenCalledTimes(1);
    expect(mockRefresh2).not.toHaveBeenCalled();

    // Change callback
    rerender({ callback: mockRefresh2 });

    // Focus with second callback
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh1).toHaveBeenCalledTimes(1); // Should not be called again
    expect(mockRefresh2).toHaveBeenCalledTimes(1);
  });

  it('should initialize lastFocusTime on first mount', () => {
    const mockRefresh = vi.fn();
    renderHook(() => {
      useRefreshOnFocus(mockRefresh);
    });

    // Immediately trigger focus (should not call refresh because less than 5 seconds)
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).not.toHaveBeenCalled();

    // After 6 seconds, should call refresh
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should use exactly 5000ms threshold', () => {
    const mockRefresh = vi.fn();
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    renderHook(() => {
      useRefreshOnFocus(mockRefresh);
    });

    // Exactly 5000ms should not trigger (needs to be > 5000)
    vi.setSystemTime(startTime + 5000);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).not.toHaveBeenCalled();

    // >5000ms after the last focus event should trigger
    vi.setSystemTime(startTime + 5000 + 5001);
    window.dispatchEvent(new Event('focus'));
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple hook instances independently', () => {
    const mockRefresh1 = vi.fn();
    const mockRefresh2 = vi.fn();

    renderHook(() => {
      useRefreshOnFocus(mockRefresh1);
    });
    renderHook(() => {
      useRefreshOnFocus(mockRefresh2);
    });

    // Both should be called when focus event fires after 6 seconds
    vi.advanceTimersByTime(6000);
    window.dispatchEvent(new Event('focus'));

    expect(mockRefresh1).toHaveBeenCalledTimes(1);
    expect(mockRefresh2).toHaveBeenCalledTimes(1);
  });
});

// Made with Bob
