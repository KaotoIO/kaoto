import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContext, AppContextType } from '@/context/AppContextDefinition';

import { useNotification } from './useNotification';

describe('useNotification', () => {
  const mockAddNotification = vi.fn();
  const mockRemoveNotification = vi.fn();
  const mockClearNotifications = vi.fn();

  let wrapper: (props: PropsWithChildren) => ReturnType<typeof createElement>;

  beforeEach(() => {
    vi.clearAllMocks();
    const appContext: AppContextType = {
      addNotification: mockAddNotification,
      removeNotification: mockRemoveNotification,
      clearNotifications: mockClearNotifications,
      notifications: [],
      isLoading: false,
      setIsLoading: vi.fn(),
      error: null,
      setError: vi.fn(),
    };
    wrapper = ({ children }) => createElement(AppContext.Provider, { value: appContext }, children);
  });

  it('should provide notification functions', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    expect(result.current.showSuccess).toBeDefined();
    expect(result.current.showError).toBeDefined();
    expect(result.current.showInfo).toBeDefined();
    expect(result.current.showWarning).toBeDefined();
    expect(result.current.showNotification).toBeDefined();
    expect(result.current.removeNotification).toBeDefined();
    expect(result.current.clearNotifications).toBeDefined();
  });

  it('should call addNotification with success kind', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    result.current.showSuccess('Success Title', 'Success message');

    expect(mockAddNotification).toHaveBeenCalledWith({
      kind: 'success',
      title: 'Success Title',
      subtitle: 'Success message',
    });
  });

  it('should call addNotification with error kind', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    result.current.showError('Error Title', 'Error message');

    expect(mockAddNotification).toHaveBeenCalledWith({
      kind: 'error',
      title: 'Error Title',
      subtitle: 'Error message',
    });
  });

  it('should call addNotification with info kind', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    result.current.showInfo('Info Title', 'Info message');

    expect(mockAddNotification).toHaveBeenCalledWith({
      kind: 'info',
      title: 'Info Title',
      subtitle: 'Info message',
    });
  });

  it('should call addNotification with warning kind', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    result.current.showWarning('Warning Title', 'Warning message');

    expect(mockAddNotification).toHaveBeenCalledWith({
      kind: 'warning',
      title: 'Warning Title',
      subtitle: 'Warning message',
    });
  });

  it('should call addNotification with custom notification options', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    result.current.showNotification({
      kind: 'success',
      title: 'Custom Title',
      subtitle: 'Custom message',
    });

    expect(mockAddNotification).toHaveBeenCalledWith({
      kind: 'success',
      title: 'Custom Title',
      subtitle: 'Custom message',
    });
  });

  it('should expose removeNotification from context', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    result.current.removeNotification('notification-id');

    expect(mockRemoveNotification).toHaveBeenCalledWith('notification-id');
  });

  it('should expose clearNotifications from context', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    result.current.clearNotifications();

    expect(mockClearNotifications).toHaveBeenCalled();
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useNotification(), { wrapper });

    const firstShowSuccess = result.current.showSuccess;
    const firstShowError = result.current.showError;
    const firstShowInfo = result.current.showInfo;
    const firstShowWarning = result.current.showWarning;

    rerender();

    expect(result.current.showSuccess).toBe(firstShowSuccess);
    expect(result.current.showError).toBe(firstShowError);
    expect(result.current.showInfo).toBe(firstShowInfo);
    expect(result.current.showWarning).toBe(firstShowWarning);
  });
});

// Made with Bob
