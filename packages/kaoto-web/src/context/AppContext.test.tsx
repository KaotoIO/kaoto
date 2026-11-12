import { randomUUID } from 'node:crypto';

import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppProvider } from './AppContext';
import { useAppContext } from './useAppContext';

const wrapper = ({ children }: PropsWithChildren) => <AppProvider>{children}</AppProvider>;

const notification = { kind: 'success', title: 'Saved', subtitle: 'All good' } as const;

describe('AppContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // jsdom does not provide crypto.randomUUID
    vi.stubGlobal('crypto', { randomUUID });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('useAppContext should throw when used outside of an AppProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAppContext())).toThrow('useAppContext must be used within an AppProvider');
  });

  it('should start with the default state', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should add a notification with an id and a timestamp', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.addNotification(notification);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toEqual({
      ...notification,
      id: expect.any(String),
      timestamp: expect.any(Number),
    });
  });

  it('should remove a notification automatically after 5 seconds', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.addNotification(notification);
    });
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.notifications).toHaveLength(0);
  });

  it('should remove a notification by id', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.addNotification(notification);
      result.current.addNotification({ ...notification, title: 'Other' });
    });
    const [first, second] = result.current.notifications;

    act(() => {
      result.current.removeNotification(first.id);
    });

    expect(result.current.notifications).toEqual([second]);
  });

  it('should clear all the notifications', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.addNotification(notification);
      result.current.addNotification(notification);
    });
    act(() => {
      result.current.clearNotifications();
    });

    expect(result.current.notifications).toEqual([]);
  });

  it('should update the loading state', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.setIsLoading(true);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should update and reset the error', () => {
    const { result } = renderHook(() => useAppContext(), { wrapper });

    act(() => {
      result.current.setError({ code: 'E1', message: 'Boom' });
    });
    expect(result.current.error).toEqual({ code: 'E1', message: 'Boom' });

    act(() => {
      result.current.setError(null);
    });
    expect(result.current.error).toBeNull();
  });
});
